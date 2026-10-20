import type { Node, Point, Tree } from 'web-tree-sitter';
import type { Span } from './analyzer';
import { codeSpan } from './markdown';
import type { LanguageSpec } from './model';

/**
 * "Explain this function": an outline of a function's body, one row per step:
 * "If `b == 0`:", "For each `n` in `nums`:", "Returns early with `0, err`", with
 * the steps inside branches and loops nested under them. Built from node types
 * and field names that the tree-sitter grammars share, so it needs no tables per
 * language.
 */

export interface OutlineRow {
  /** Markdown, e.g. "For each `n` in `nums`:". */
  text: string;
  /** The keyword this step is about (`if`, `for`, `return`), if any. */
  keyword?: string;
  /** What the row covers, highlighted when you hover it. */
  span: Span;
  /** 0 for the function body's own steps, 1 inside a branch or loop, and so on. */
  depth: number;
}

export interface FunctionOutline {
  /** e.g. "the function `divide`", "the method `Area`", "this closure". */
  label: string;
  span: Span;
  /** The function's first line, e.g. "func divide(a, b int) (int, error) {". */
  signature: string;
  /** What it takes and returns, and what's inside (loops, decisions, early exits). */
  summary: string;
  rows: OutlineRow[];
}

/** Functions, methods, closures and lambdas in the supported grammars. All have a `body` field. */
const FUNCTION =
  /^(function_declaration|function_definition|function_item|function_expression|generator_function(_declaration)?|method_declaration|method_definition|func_literal|closure_expression|arrow_function|lambda(_expression)?|local_function_statement|constructor_declaration|destructor_declaration|operator_declaration)$/;
/** Nodes that only group statements: their statements are listed instead. */
const BLOCK = /^(block|statement_block|compound_statement|statement_list|declaration_list)$/;
const IF = /^(if_statement|if_expression|if_let_expression)$/;
const LOOP = /^((for|foreach|while|do|loop)(_\w+)?_(statement|expression)|for_range_loop)$/;
const SWITCH = /^(switch_statement|switch_expression|expression_switch_statement|type_switch_statement|select_statement|match_expression|match_statement)$/;
const CASE =
  /^(expression_case|type_case|default_case|communication_case|case_statement|switch_case|switch_default|switch_section|match_arm|case_clause|switch_expression_arm)$/;
const TRY = /^try_(statement|expression|block)$/;
const HANDLER = /^(catch_clause|except_clause|except_group_clause|finally_clause|else_clause)$/;
const WITH = /^(with_statement|using_statement|lock_statement|unsafe_block|async_block|fixed_statement|checked_statement)$/;
const RETURN = /^return_(statement|expression)$/;
const YIELD = /^yield(_statement|_expression)?$/;
const THROW = /^(throw|raise)_(statement|expression)$/;
const BREAK = /^(break|continue)_(statement|expression)$/;
const DECLARATION =
  /^(short_var_declaration|var_declaration|const_declaration|let_declaration|lexical_declaration|variable_declaration|local_declaration_statement|local_variable_declaration|declaration)$/;
const ASSIGNMENT = /^(assignment(_expression|_statement)?|augmented_assignment(_expression)?|compound_assignment_expr|update_expression|inc_statement|dec_statement|postfix_unary_expression|prefix_unary_expression)$/;
const CALL = /^(call_expression|invocation_expression|call|macro_invocation)$/;
const AWAIT = /^await(_expression)?$/;

const MAX_ROWS = 300;

const spanOf = (n: Node): Span => ({ start: n.startPosition, end: n.endPosition });
const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();
const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
/** Inline code for a node's source, on one line and shortened. */
const code = (n: Node | string, max = 50) => codeSpan(shorten(oneLine(typeof n === 'string' ? n : n.text), max));
const field = (n: Node, ...names: string[]): Node | undefined => {
  for (const name of names) {
    const child = n.childForFieldName(name);
    if (child) return child;
  }
  return undefined;
};
const namedChildren = (n: Node): Node[] => {
  const out: Node[] = [];
  for (let i = 0; i < n.namedChildCount; i++) {
    const c = n.namedChild(i)!;
    if (!c.type.includes('comment')) out.push(c);
  }
  return out;
};
const firstLeaf = (n: Node) => {
  let x = n;
  while (x.childCount > 0) x = x.child(0)!;
  return x;
};
const firstToken = (n: Node) => firstLeaf(n).text;
/** The keyword a node starts with (`for`, `if`, `return`), not a name. */
const keywordOf = (n: Node) => {
  const leaf = firstLeaf(n);
  return !leaf.isNamed && /^[a-z_]+$/.test(leaf.text) ? leaf.text : undefined;
};
const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** A condition without the parentheses some languages require around it. */
function condition(n: Node | undefined): string {
  if (!n) return '…';
  let text = oneLine(n.text);
  if (/^(parenthesized_expression|condition_clause)$/.test(n.type) && text.startsWith('(') && text.endsWith(')')) text = text.slice(1, -1).trim();
  return code(text.replace(/;$/, '')) + (/^let\b/.test(text) ? ' matches' : '');
}

/** The function the cursor is in. A one-line lambda (`x => x * 2`) gives way to the function around it. */
export function functionAt(tree: Tree, point: Point): Node | undefined {
  let fallback: Node | undefined;
  for (let n: Node | null = tree.rootNode.descendantForPosition(point); n; n = n.parent) {
    const body = FUNCTION.test(n.type) ? n.childForFieldName('body') : null;
    if (!body) continue;
    if (BLOCK.test(body.type)) return n;
    fallback ??= n;
  }
  return fallback;
}

/** C/C++ keep the name and parameters in a (function_)declarator, under pointer and reference declarators. */
function declaratorOf(fn: Node): Node | undefined {
  let d = fn.childForFieldName('declarator') ?? undefined;
  // A reference declarator (`&operator<<(...)`) has no `declarator` field: its declarator is its last child.
  while (d && !/function_declarator$/.test(d.type)) d = d.childForFieldName('declarator') ?? d.namedChild(d.namedChildCount - 1) ?? undefined;
  return d;
}

/** Whether a function is declared directly in a class, struct, impl, trait or interface. */
function inType(fn: Node): boolean {
  const body = fn.parent?.type === 'decorated_definition' ? fn.parent.parent : fn.parent;
  return !!body && /^(declaration_list|class_body|field_declaration_list|block)$/.test(body.type) && /class|impl|trait|struct|interface|object/.test(body.parent?.type ?? '');
}

function labelOf(fn: Node, name: Node | undefined): string {
  const kind = /closure|lambda|arrow|func_literal|function_expression/.test(fn.type)
    ? fn.type === 'closure_expression' ? 'closure' : 'function'
    : /method|constructor|destructor/.test(fn.type) || fn.childForFieldName('receiver') || inType(fn)
      ? fn.type === 'constructor_declaration' ? 'constructor' : 'method'
      : 'function';
  return name ? `the ${kind} ${code(name, 40)}` : `this ${kind}`;
}

interface Walk {
  spec: LanguageSpec;
  fn: Node;
  rows: OutlineRow[];
  loops: number;
  decisions: number;
  /** Early returns, including hidden ones like Rust's `?`. */
  exits: number;
  throws: number;
  /** First line of the function's docstring (Python), for the summary. */
  docstring?: string;
}

/** The statements in a body or branch: blocks are opened up, comments skipped. */
function statementsIn(n: Node | undefined): Node[] {
  if (!n) return [];
  if (BLOCK.test(n.type)) return namedChildren(n).flatMap(statementsIn);
  return [n];
}

function push(w: Walk, n: Node, depth: number, text: string, keyword?: string): void {
  if (w.rows.length >= MAX_ROWS) return;
  w.rows.push({ text: text.charAt(0).toUpperCase() + text.slice(1), keyword, span: spanOf(n), depth });
}

/**
 * Jumps hidden inside a step (Rust's `?`): " (on error, returns early: `?`)". Nested
 * branches, loop bodies and functions are skipped: they get rows of their own.
 */
function hiddenExits(w: Walk, n: Node, skip: Node[]): string {
  const found = new Set<string>();
  const visit = (x: Node) => {
    if (skip.some((s) => s.equals(x)) || (FUNCTION.test(x.type) && !x.equals(w.fn))) return;
    if (x.childCount === 0) {
      const jump = !x.isNamed ? w.spec.jumpTarget(x) : undefined;
      if (jump && jump.node.equals(w.fn) && /returns early/.test(jump.verb)) found.add(`${jump.verb.replace(/ from$/, '')}: \`${x.text}\``);
      return;
    }
    for (let i = 0; i < x.childCount; i++) visit(x.child(i)!);
  };
  visit(n);
  w.exits += found.size;
  return found.size ? ` (${[...found].join('; ')})` : '';
}

/** Rows for a list of statements. `tail`: the list ends the function, so its last `return` isn't early. */
function walk(w: Walk, statements: Node[], depth: number, tail: boolean): void {
  statements.forEach((s, i) => step(w, s, depth, tail && i === statements.length - 1, i === statements.length - 1));
}

function step(w: Walk, statement: Node, depth: number, tail: boolean, last: boolean): void {
  let n = statement;
  let label = '';
  // `outer: for ...` and expression statements wrapping one expression (Rust's `if`, a call).
  if (n.type === 'labeled_statement' || n.type === 'labeled_expression') {
    const inner = namedChildren(n).at(-1);
    label = ` (labelled ${code(namedChildren(n)[0] ?? n, 20)})`;
    if (inner) n = inner;
  }
  if (n.type === 'expression_statement' && namedChildren(n).length === 1) n = namedChildren(n)[0];
  const keyword = keywordOf(n);
  // A docstring isn't a step: the summary quotes its first line.
  if (w.spec.comments?.isDocString?.(n)) {
    const text = n.text.replace(/^[a-zA-Z]*("""|'''|"|')/, '').replace(/("""|'''|"|')$/, '');
    w.docstring ??= oneLine(text.split('\n').find((l) => l.trim()) ?? '');
    return;
  }

  if (IF.test(n.type)) return ifChain(w, n, depth, tail, '');
  const loopLabel = namedChildren(n).find((c) => c.type === 'label');
  if (loopLabel) label = ` (labelled ${code(loopLabel, 20)})`;
  if (LOOP.test(n.type)) {
    w.loops++;
    const body = field(n, 'body');
    // A labelled loop starts with its label: the keyword is the first word after it.
    const loopKeyword = keyword ?? n.children.find((c) => !!c && !c.isNamed && /^[a-z]+$/.test(c.text))?.text;
    push(w, statement, depth, loopText(n).replace(/:$/, `${label}:`) + hiddenExits(w, n, body ? [body] : []), loopKeyword);
    return walk(w, statementsIn(body), depth + 1, false);
  }
  if (SWITCH.test(n.type)) return choice(w, statement, n, depth, tail, keyword);
  if (TRY.test(n.type)) {
    const body = field(n, 'body') ?? namedChildren(n).find((c) => BLOCK.test(c.type));
    push(w, statement, depth, 'tries this:', keyword);
    walk(w, statementsIn(body), depth + 1, false);
    for (const handler of namedChildren(n).filter((c) => HANDLER.test(c.type))) {
      const hBody = field(handler, 'body') ?? namedChildren(handler).find((c) => BLOCK.test(c.type));
      const what = namedChildren(handler).filter((c) => !c.equals(hBody ?? c) && !BLOCK.test(c.type));
      const text = /finally/.test(handler.type)
        ? 'finally, always:'
        : handler.type === 'else_clause'
          ? 'if nothing went wrong:'
          : `if that fails${what.length ? ` with ${code(what.map((c) => c.text).join(' '), 40)}` : ''}:`;
      push(w, handler, depth, text, keywordOf(handler));
      walk(w, statementsIn(hBody), depth + 1, false);
    }
    return;
  }
  if (WITH.test(n.type)) {
    const body = field(n, 'body') ?? namedChildren(n).find((c) => BLOCK.test(c.type));
    // `with ... as f`, `async with`, `using (...)`, `lock (...)`: the whole header, as written.
    const header = body ? n.text.slice(0, body.startIndex - n.startIndex).replace(/:\s*$/, '') : keyword ?? n.text;
    push(w, statement, depth, `${code(header, 60)}:`, keyword);
    return walk(w, statementsIn(body), depth + 1, tail);
  }
  if (RETURN.test(n.type)) {
    const value = namedChildren(n)[0];
    if (!tail) w.exits++;
    const text = tail ? (value ? `returns ${code(value)}` : 'returns') : value ? `returns early with ${code(value)}` : 'returns early';
    return push(w, statement, depth, text, keyword);
  }
  if (THROW.test(n.type)) {
    w.throws++;
    const value = namedChildren(n)[0];
    return push(w, statement, depth, `${keyword === 'raise' ? 'raises' : 'throws'}${value ? ` ${code(value)}` : ' the current error again'}`, keyword);
  }
  if (YIELD.test(n.type)) {
    const value = namedChildren(n)[0];
    // `yield from it` (Python) and `yield* it` (JavaScript): every value of another iterable.
    const all = n.text.match(/^yield\s*(from\b|\*)/);
    if (all) return push(w, statement, depth, `produces every value from ${code(value ?? n)} (\`yield${all[1] === '*' ? '*' : ' from'}\`)`, 'yield');
    return push(w, statement, depth, `produces the next value${value ? `, ${code(value)}` : ''} (\`yield\`)`, 'yield');
  }
  if (BREAK.test(n.type)) {
    const target = namedChildren(n)[0];
    // `break` also leaves a `switch` (C, Go, JavaScript, C#): ask the language where it jumps to.
    const jump = w.spec.jumpTarget(firstLeaf(n));
    const text =
      keyword !== 'break' ? 'skips to the next round of the loop' : jump && SWITCH.test(jump.node.type) ? `leaves the \`${keywordOf(jump.node) ?? 'switch'}\`` : 'stops the loop';
    return push(w, statement, depth, `${text}${target ? ` ${code(target, 20)}` : ''} (\`${keyword}\`)`, keyword);
  }
  if (n.type === 'defer_statement') return push(w, statement, depth, `when the function ends, runs ${code(namedChildren(n)[0] ?? n)} (\`defer\`)`, 'defer');
  if (n.type === 'go_statement') return push(w, statement, depth, `starts ${code(namedChildren(n)[0] ?? n)} in a new goroutine (\`go\`)`, 'go');
  if (n.type === 'pass_statement') return push(w, statement, depth, 'does nothing (`pass`): a placeholder where a statement is required', 'pass');
  if (n.type === 'assert_statement') {
    const [check, message] = namedChildren(n);
    const why = message ? ` (${code(message, 30)})` : '';
    return push(w, statement, depth, `checks that ${code(check ?? n)} is true, and stops with an error if not${why} (\`assert\`)`, 'assert');
  }
  if (n.type === 'fallthrough_statement') return push(w, statement, depth, 'continues into the next case (`fallthrough`)', 'fallthrough');
  // Go channels: `ch <- v` and a bare `<-ch`.
  if (n.type === 'send_statement') {
    return push(w, statement, depth, `sends ${code(field(n, 'value') ?? n, 30)} on the channel ${code(field(n, 'channel') ?? n, 30)}`);
  }
  if (n.type === 'unary_expression' && field(n, 'operator')?.text === '<-') {
    return push(w, statement, depth, `waits for a value from ${code(field(n, 'operand') ?? n, 30)}`);
  }
  if (FUNCTION.test(n.type) && n !== w.fn) {
    const name = field(n, 'name');
    return push(w, statement, depth, `defines ${labelOf(n, name)}`, keyword);
  }
  if (/^(class|struct|enum|interface)_(definition|declaration|item|specifier)$/.test(n.type)) {
    return push(w, statement, depth, `defines ${code(field(n, 'name') ?? n, 40)}`, keyword);
  }
  // Rust: the last expression of a function, without `;`, is its result.
  if (tail && last && !/(statement|declaration|definition|item)$/.test(n.type) && statement.nextSibling?.text !== ';' && w.spec.id === 'rust') {
    return push(w, statement, depth, `returns ${code(n)} (the last expression, without \`;\`, is the result)${hiddenExits(w, n, [])}`);
  }
  push(w, statement, depth, plainStep(n) + label + hiddenExits(w, n, []), DECLARATION.test(n.type) || ASSIGNMENT.test(n.type) ? undefined : keyword);
}

function plainStep(n: Node): string {
  if (DECLARATION.test(n.type)) return `declares ${code(oneLine(n.text).replace(/;$/, ''))}`;
  if (ASSIGNMENT.test(n.type)) {
    const target = field(n, 'left', 'argument');
    const verb = target && /^:?=[^=]/.test(oneLine(n.text).slice(target.text.length).trim()) ? 'sets' : 'updates';
    return target && target.text.length <= 20 ? `${verb} ${code(target)}: ${code(n)}` : `${verb} ${code(n)}`;
  }
  if (CALL.test(n.type)) return n.type === 'macro_invocation' ? `uses the macro ${code(n)}` : `calls ${code(n)}`;
  if (AWAIT.test(n.type)) return `waits for ${code(namedChildren(n)[0] ?? n)} (\`await\`)`;
  return code(n);
}

/** `if` with its `else if` / `elif` / `else` branches at the same level. */
function ifChain(w: Walk, n: Node, depth: number, tail: boolean, prefix: string): void {
  w.decisions++;
  const init = field(n, 'initializer');
  const consequence = field(n, 'consequence', 'body');
  const header = `${prefix}if ${condition(field(n, 'condition'))}${init ? ` (after ${code(init, 30)})` : ''}:`;
  push(w, n, depth, header + hiddenExits(w, n, [consequence, ...n.childrenForFieldName('alternative')].filter((x): x is Node => !!x)), 'if');
  walk(w, statementsIn(consequence), depth + 1, tail);
  for (const alt of n.childrenForFieldName('alternative')) {
    if (!alt) continue;
    // `else_clause` wraps the branch (C, JavaScript, Rust, Python); Go and C# use the branch directly.
    const inner = alt.type === 'else_clause' ? field(alt, 'body') ?? namedChildren(alt).at(-1) : alt;
    if (alt.type === 'elif_clause') {
      push(w, alt, depth, `otherwise, if ${condition(field(alt, 'condition'))}:`, 'elif');
      walk(w, statementsIn(field(alt, 'consequence')), depth + 1, tail);
    } else if (inner && IF.test(inner.type)) {
      w.decisions--;
      ifChain(w, inner, depth, tail, 'otherwise, ');
    } else {
      push(w, alt, depth, 'otherwise:', 'else');
      walk(w, statementsIn(inner), depth + 1, tail);
    }
  }
}

function loopText(n: Node): string {
  const clause = namedChildren(n).find((c) => /^(range_clause|for_clause)$/.test(c.type));
  const owner = clause ?? n;
  const over = field(owner, 'right', 'value');
  const each = field(owner, 'left', 'pattern', 'declarator');
  if (over && n.type !== 'while_statement' && n.type !== 'while_expression') {
    if (n.type === 'for_in_statement' && field(n, 'operator')?.text === 'in') return `for each key ${code(each ?? n, 30)} of ${code(over)}:`;
    if (/^\d+$/.test(over.text)) return `repeats ${code(over)} times${each ? `, with ${code(each, 30)} counting up from 0` : ''}:`;
    return each ? `for each ${code(each, 30)} in ${code(over)}:` : `goes through ${code(over)}:`;
  }
  const cond = field(owner, 'condition');
  const init = field(owner, 'initializer', 'init');
  const update = field(owner, 'update', 'increment');
  if (/^do_/.test(n.type)) return `runs this, then repeats while ${condition(cond)}:`;
  if (init || update) {
    const from = init ? `, starting with ${code(oneLine(init.text).replace(/;$/, ''), 30)}` : '';
    const then = update ? `, doing ${code(update, 30)} after each round` : '';
    return `${cond ? `repeats while ${condition(cond)}` : 'repeats until a `break` or `return`'}${from}${then}:`;
  }
  // Go: `for cond {}` has the condition as a plain child.
  const bare = cond ?? namedChildren(n).find((c) => !c.equals(field(n, 'body') ?? c) && !BLOCK.test(c.type) && c.type !== 'label');
  return bare ? `repeats while ${condition(bare)}:` : 'repeats forever (until a `break` or `return`):';
}

/** `switch` / `match` / `select`, with a row per case. */
function choice(w: Walk, statement: Node, n: Node, depth: number, tail: boolean, keyword: string | undefined): void {
  w.decisions++;
  const value = field(n, 'value', 'condition', 'subject');
  const text = n.type === 'select_statement' ? 'waits for the first channel operation that can go ahead:' : value ? `chooses on ${condition(value)}:` : 'chooses the first case that applies:';
  const body = field(n, 'body');
  push(w, statement, depth, text + hiddenExits(w, n, body ? [body] : namedChildren(n).filter((c) => CASE.test(c.type))), keyword);
  const cases = [...namedChildren(n), ...(body ? namedChildren(body) : [])].filter((c) => CASE.test(c.type));
  for (const c of cases) {
    if (c.type === 'match_arm' || c.type === 'switch_expression_arm') {
      const pattern = field(c, 'pattern') ?? namedChildren(c)[0];
      const result = field(c, 'value') ?? namedChildren(c).at(-1);
      if (result && BLOCK.test(result.type)) {
        push(w, c, depth + 1, `${code(pattern ?? c, 40)}:`);
        walk(w, statementsIn(result), depth + 2, tail);
      } else {
        push(w, c, depth + 1, `${code(pattern ?? c, 40)} → ${code(result ?? c)}${hiddenExits(w, c, [])}`);
      }
      continue;
    }
    // A case's header runs to its `:` (C# keeps it in label nodes); the statements follow.
    let sep = -1;
    for (let i = 0; i < c.childCount; i++) if (!c.child(i)!.isNamed && /^(:|=>)$/.test(c.child(i)!.text)) { sep = i; break; }
    const parts = namedChildren(c);
    const labels = sep >= 0 ? parts.filter((p) => p.endIndex <= c.child(sep)!.startIndex) : parts.filter((p) => /label|pattern/.test(p.type));
    const statements = parts.filter((p) => !labels.includes(p));
    const header = sep >= 0 ? c.text.slice(0, c.child(sep)!.startIndex - c.startIndex) : labels.map((l) => l.text).join(' ');
    push(w, c, depth + 1, `${code(header, 40)}:`, keywordOf(c));
    walk(w, statements.flatMap(statementsIn), depth + 2, tail);
  }
}

/**
 * The parameters as written, split at the commas of the list itself (so Go's
 * `a, b int` stays one, and C#'s `params int[] rest` isn't split in two).
 */
function parameterTexts(list: Node): string[] {
  const out: string[] = [];
  let from: Node | undefined;
  let to: Node | undefined;
  const flush = () => {
    if (from && to) out.push(list.text.slice(from.startIndex - list.startIndex, to.endIndex - list.startIndex));
    from = to = undefined;
  };
  for (let i = 0; i < list.childCount; i++) {
    const c = list.child(i)!;
    if (c.type.includes('comment') || (!c.isNamed && /^[(),|]$/.test(c.text))) {
      if (c.text === ',') flush();
      continue;
    }
    from ??= c;
    to = c;
  }
  flush();
  return out;
}

function summaryOf(label: string, fn: Node, params: string[], result: string | undefined, w: Walk): string {
  const takes = params.length ? `takes ${params.map((p) => code(p, 30)).join(', ')}` : 'takes no parameters';
  const returns = result ? ` and returns ${code(result, 60)}` : '';
  const [from, to] = [fn.startPosition.row + 1, fn.endPosition.row + 1];
  const lines = from === to ? `line ${from}` : `lines ${from}–${to}`;
  const first = `${label.charAt(0).toUpperCase()}${label.slice(1)} (${lines}) ${takes}${returns}.`;
  const has: string[] = [];
  if (w.loops) has.push(plural(w.loops, 'loop'));
  if (w.decisions) has.push(plural(w.decisions, 'decision'));
  const exits: string[] = [];
  if (w.exits) exits.push(`can return early in ${plural(w.exits, 'place')}`);
  if (w.throws) exits.push(`can throw an error in ${plural(w.throws, 'place')}`);
  const inside = has.length ? `It has ${has.join(' and ')}` : '';
  const leaves = exits.join(' and ');
  const second = inside && leaves ? `${inside}, and ${leaves}.` : inside ? `${inside}.` : leaves ? `It ${leaves}.` : '';
  const doc = w.docstring ? ` Its docstring says: “${shorten(w.docstring, 80)}”` : '';
  return `${first}${second ? ` ${second}` : ''}${doc}`;
}

/** The outline of the function at `point`, or undefined when the point isn't inside one. */
export function outlineFunction(spec: LanguageSpec, tree: Tree, point: Point): FunctionOutline | undefined {
  const fn = functionAt(tree, point);
  if (!fn) return undefined;
  const declarator = declaratorOf(fn);
  const name = field(declarator ?? fn, declarator ? 'declarator' : 'name');
  // JavaScript's `x => ...` has a single `parameter`; everything else a list of `parameters`; C's `(void)` means none.
  const single = field(fn, 'parameter');
  const paramList = field(declarator ?? fn, 'parameters');
  // C's `(void)` means no parameters; Python's bare `/` and `*` are markers, not parameters.
  const params = (single ? [single.text] : paramList ? parameterTexts(paramList) : []).filter((p) => !/^(void|\/|\*)$/.test(p));
  const returnType = field(fn, 'result', 'return_type', 'returns') ?? (declarator || fn.type === 'local_function_statement' ? field(fn, 'type') : undefined);
  const result = returnType && returnType.text !== 'void' ? oneLine(returnType.text).replace(/^:\s*/, '') : undefined;

  const label = labelOf(fn, name);
  const w: Walk = { spec, fn, rows: [], loops: 0, decisions: 0, exits: 0, throws: 0 };
  const body = fn.childForFieldName('body') ?? undefined;
  if (body && BLOCK.test(body.type)) walk(w, statementsIn(body), 0, true);
  else if (body) push(w, body, 0, `returns ${code(body)}`);
  return {
    label,
    span: spanOf(fn),
    signature: fn.text.split('\n', 1)[0].trimEnd(),
    summary: summaryOf(label, fn, params, result, w),
    rows: w.rows,
  };
}
