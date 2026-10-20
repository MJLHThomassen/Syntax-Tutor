import type { Node, Tree } from 'web-tree-sitter';
import { explain, type Options, type Span } from './analyzer';
import { bracketContext, ownerLabel, partnerOf } from './brackets';
import { codeSpan } from './markdown';
import type { LanguageSpec } from './model';
import { fieldOf, firstLine, lastLeaf } from './nodes';

/**
 * "Explain this line": every meaningful token in a range of lines, in reading
 * order, each with the same explanation its hover gives (or a short fallback for
 * plain names and literals), plus one sentence about the line's structure.
 */

export interface LineItem {
  /** The source text of the part being explained. */
  text: string;
  span: Span;
  /** Full hover markdown, or a short fallback description. */
  markdown: string;
  /** True for fallback descriptions (plain names, literals) without a doc entry. */
  plain?: boolean;
  /** A name (variable, function, field, method, type...): the editor's language server may know more about it. */
  symbol?: boolean;
  /** How many scopes opened inside the explained lines this part is nested in (0 = outermost). */
  depth: number;
  /** The innermost such scope: an id to group by, and a label like "the body of the `if` statement". */
  scope?: { id: number; label: string };
}

export interface LineExplanation {
  /** e.g. "This line starts the `for` statement (lines 37–40)." */
  structure?: string;
  items: LineItem[];
}

const before = (a: Span['start'], b: Span['start']) => a.row < b.row || (a.row === b.row && a.column < b.column);
const sameSpan = (a: Span, b: Span) =>
  a.start.row === b.start.row && a.start.column === b.start.column && a.end.row === b.end.row && a.end.column === b.end.column;
const contains = (outer: Span, inner: Span) => !before(inner.start, outer.start) && !before(outer.end, inner.end);
const spanOf = (n: Node): Span => ({ start: n.startPosition, end: n.endPosition });

const CLOSERS = new Set([')', ']', '}']);
const OPENER_OF: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

/** String and character literals, whose quotes, prefixes and text are separate tokens but one thing to explain. */
const STRING_NODE = /^(.*_)?(string|char|rune|character)(_literal|_expression)?$/;

const shorten = (text: string) => {
  const line = text.split('\n', 1)[0];
  return line.length > 60 || line !== text ? `${line.slice(0, 59)}…` : line;
};

/**
 * Put the literal itself in the heading: "**`\"...\" (string literal)`** · C literal"
 * becomes "**`\"one\\n\"`** · C string literal".
 */
function literalHeading(markdown: string, text: string): string {
  const [first, ...rest] = markdown.split('\n');
  const m = first.match(/^\*\*`+ ?(.*?) ?`+\*\* · (\S+(?: \S+)*?) (literal|syntax|operator)$/);
  if (!m) return markdown;
  const kind = m[1].match(/\(([^)]+)\)\s*$/)?.[1] ?? 'literal';
  return [`**${codeSpan(text)}** · ${m[2]} ${kind}`, ...rest].join('\n');
}

/** Branches of a switch/match: a scope without braces of their own. */
const CASE_LIKE = /^(expression_case|type_case|default_case|communication_case|switch_case|switch_default|switch_section|case_statement|match_arm)$/;

function firstLeaf(n: Node): Node {
  let x = n;
  while (x.childCount > 0) x = x.child(0)!;
  return x;
}

/**
 * The scopes a token sits in that were opened within the explained lines:
 * brace-delimited nodes (bodies, blocks, objects) and switch/match branches.
 * The braces and a branch's own header (`case 1:`) belong to the outer level.
 */
function scopesOf(token: Node, startRow: number): { depth: number; scope?: { id: number; label: string } } {
  let depth = 0;
  let scope: { id: number; label: string } | undefined;
  for (let a = token.parent; a && a.startPosition.row >= startRow && a.parent; a = a.parent) {
    const first = firstLeaf(a);
    const braced = first.text === '{' && !first.isNamed && first.parent?.equals(a);
    const caseLike = CASE_LIKE.test(a.type);
    if (!braced && !caseLike) continue;
    let header = '';
    if (token.equals(first)) continue;
    if (braced && token.equals(lastLeaf(a))) continue;
    if (caseLike) {
      // Skip the branch header: everything up to its `:` or `=>`.
      let headerEnd = -1;
      for (let i = 0; i < a.childCount; i++) {
        const c = a.child(i)!;
        if (!c.isNamed && (c.text === ':' || c.text === '=>')) {
          headerEnd = c.endIndex;
          break;
        }
      }
      if (token.endIndex <= headerEnd) continue;
      header = headerEnd > a.startIndex ? a.text.slice(0, headerEnd - a.startIndex).replace(/\s+/g, ' ').trim() : '';
    }
    depth++;
    if (!scope) {
      const short = header.length > 40 ? `${header.slice(0, 39)}…` : header;
      const label = braced ? bracketContext(first) ?? 'a block' : `the \`${short || firstLine(a, 40)}\` branch`;
      scope = { id: a.id, label };
    }
  }
  return { depth, scope };
}
const PUNCTUATION = /^[,;.:]$/;

/** Leaf tokens overlapping rows [startRow, endRow], in order. Comments count as one token. */
function leaves(tree: Tree, startRow: number, endRow: number): Node[] {
  const out: Node[] = [];
  const visit = (n: Node) => {
    if (n.endPosition.row < startRow || n.startPosition.row > endRow) return;
    if (n.childCount === 0 || n.type.endsWith('comment')) {
      if (n.text.trim()) out.push(n);
      return;
    }
    for (let i = 0; i < n.childCount; i++) visit(n.child(i)!);
  };
  visit(tree.rootNode);
  return out;
}

/** Where a plain name is declared: the nearest earlier name with the same text that the spec calls a declaration. */
function declarationOf(spec: LanguageSpec, tree: Tree, name: Node): { node: Node; title: string } | undefined {
  let best: { node: Node; title: string } | undefined;
  const stack: Node[] = [tree.rootNode];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.childCount === 0) {
      if (n.text === name.text && spec.identifierTypes.has(n.type) && !n.equals(name) && before(n.startPosition, name.startPosition)) {
        const role = spec.role(n, fieldOf(n));
        const declares = role && (role.scope || /variable|parameter|constant/i.test(role.title)) && !/reference/i.test(role.title);
        if (declares && (!best || before(best.node.startPosition, n.startPosition))) best = { node: n, title: role.title };
      }
      continue;
    }
    for (let i = n.childCount - 1; i >= 0; i--) stack.push(n.child(i)!);
  }
  return best;
}

function fallback(spec: LanguageSpec, tree: Tree, token: Node): string | undefined {
  const name = `\`${token.text}\``;
  if (spec.identifierTypes.has(token.type)) {
    // `a.b`: b is a member of whatever a is, not a variable; don't guess a declaration by name.
    const op = token.previousSibling?.text;
    if (op === '.' || op === '?.' || op === '->') {
      return `**${name}** · member\n\nA field or method of the value before the \`${op}\`.`;
    }
    if (/field|property/.test(token.type)) return `**${name}** · field\n\nThe name of a field (of a struct, class or object).`;
    const decl = declarationOf(spec, tree, token);
    if (decl) return `**${name}** · name\n\nUsed here; declared on line ${decl.node.startPosition.row + 1} (${decl.title.toLowerCase()}).`;
    return `**${name}** · name\n\nA name declared elsewhere: in another file, package or library.`;
  }
  const lit = token.parent && /string|char|rune/.test(token.parent.type) ? token.parent : token;
  if (/int|float|number|real|decimal|imaginary/.test(token.type) && /literal|number/.test(token.type)) return `**${name}** · literal\n\nA number written directly in the code.`;
  if (/string|char|rune/.test(lit.type)) return `**\`${lit.text.length > 40 ? `${lit.text.slice(0, 39)}…` : lit.text}\`** · literal\n\nText written directly in the code (a string literal).`;
  return undefined;
}

/** The construct the line belongs to: the biggest node starting at the line's first token. */
function structureOf(tree: Tree, first: Node | undefined, startRow: number, endRow: number): string | undefined {
  if (!first) return undefined;
  let n = first;
  // Climb to the biggest construct starting here, but not into containers (blocks, lists, the file).
  const container = /^(statement_list|block|statement_block|compound_statement|declaration_list|field_declaration_list|class_body|interface_body|enum_body|switch_body|switch_block|match_block|program|source_file|compilation_unit|translation_unit)$/;
  while (
    n.parent &&
    !container.test(n.parent.type) &&
    !n.parent.equals(tree.rootNode) &&
    n.parent.startPosition.row === first.startPosition.row &&
    n.parent.startPosition.column === first.startPosition.column
  ) {
    n = n.parent;
  }
  if (n.childCount === 0 || n.type.endsWith('comment')) return undefined;
  const label = ownerLabel(n).replace(/^the /, '');
  const [from, to] = [n.startPosition.row + 1, n.endPosition.row + 1];
  const lines = from === to ? `line ${from}` : `lines ${from}–${to}`;
  const many = endRow > startRow ? 'These lines start' : 'This line starts';
  if (n.endPosition.row <= endRow) return `${endRow > startRow ? 'These lines are' : 'This line is'} the ${label} (${lines}).`;
  return `${many} the ${label} (${lines}).`;
}

export function explainLines(
  spec: LanguageSpec,
  tree: Tree,
  startRow: number,
  endRow: number,
  options: Options = {},
): LineExplanation {
  const range: Span = { start: { row: startRow, column: 0 }, end: { row: endRow, column: Number.MAX_SAFE_INTEGER } };
  const items: LineItem[] = [];
  const tokens = leaves(tree, startRow, endRow);
  const literalsDone = new Set<number>();
  for (const token of tokens) {
    // The pieces of a string literal (`"`, the text, `"`, a `$` or `r#` prefix) are one entry for the
    // whole literal. Code inside an interpolation has other parents and is explained on its own.
    const str = token.parent && STRING_NODE.test(token.parent.type) && token.parent.type !== 'concatenated_string' ? token.parent : undefined;
    if (str) {
      if (literalsDone.has(str.id)) continue;
      literalsDone.add(str.id);
      let e: { markdown: string } | undefined;
      for (let i = 0; i < str.childCount && !e; i++) {
        const c = str.child(i)!;
        if (c.childCount === 0) e = explain(spec, tree, c.startPosition, options);
      }
      const markdown = e ? literalHeading(e.markdown, shorten(str.text)) : fallback(spec, tree, token);
      if (!markdown) continue;
      items.push({
        text: shorten(str.text),
        span: spanOf(str),
        markdown,
        plain: !e || undefined,
        ...scopesOf(token, startRow),
      });
      continue;
    }

    // Separators aren't worth a line each (they still have hovers); a member's own entry covers its `.`.
    if (/^[,;.]$/.test(token.text) && !token.isNamed) continue;

    // The same for the `>` closing generics, templates and JSX tags (not a `>` comparison).
    if (token.text === '>' && !token.isNamed && token.parent && !/binary|relational|comparison/.test(token.parent.type)) {
      const lt = token.parent.children.find((c) => !!c && (c.text === '<' || c.text === '</') && c.startIndex < token.startIndex);
      if (lt && contains(range, spanOf(lt))) continue;
    }

    // A closing bracket whose opener is in range adds nothing: the opener's entry names it.
    // (C# names its interpolation braces, so named leaves count too.)
    if (CLOSERS.has(token.text) && token.childCount === 0) {
      // Also `}` of `${ }`: its opener is a different token that ends in `{`.
      const opener = token.parent?.child(0);
      const open = partnerOf(token) ?? (opener && opener.text.endsWith(OPENER_OF[token.text]) && !opener.equals(token) ? opener : undefined);
      if (open && contains(range, spanOf(open))) continue;
    }
    const at = before(token.startPosition, range.start) ? range.start : token.startPosition;
    const e = explain(spec, tree, at, options);
    if (e) {
      // Several tokens can share one explanation (a raw string, a comment block): keep the first.
      if (items.some((i) => sameSpan(i.span, e.span))) continue;
      items.push({
        text: token.type.endsWith('comment') ? token.text.split('\n', 1)[0] : textIn(tree, e.span),
        span: e.span,
        markdown: e.markdown,
        symbol: spec.identifierTypes.has(token.type) || undefined,
        ...scopesOf(token, startRow),
      });
      continue;
    }
    if (PUNCTUATION.test(token.text)) continue;
    const plain = fallback(spec, tree, token);
    if (!plain) continue;
    const lit = token.parent && /string|char|rune/.test(token.parent.type) && !spec.identifierTypes.has(token.type) ? token.parent : token;
    if (items.some((i) => sameSpan(i.span, spanOf(lit)))) continue;
    items.push({
      text: lit.text,
      span: spanOf(lit),
      markdown: plain,
      plain: true,
      symbol: (lit === token && spec.identifierTypes.has(token.type)) || undefined,
      ...scopesOf(token, startRow),
    });
  }
  const first = tokens.find((t) => t.startPosition.row >= startRow);
  return { structure: structureOf(tree, first, startRow, endRow), items };
}

function textIn(tree: Tree, span: Span): string {
  const node = tree.rootNode.descendantForPosition(span.start, span.end);
  const text = node && node.startPosition.row === span.start.row && node.startPosition.column === span.start.column ? node.text : '';
  return text.length > 60 ? `${text.split('\n', 1)[0].slice(0, 59)}…` : text;
}
