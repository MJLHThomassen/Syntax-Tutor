import type { Node } from 'web-tree-sitter';
import { fieldOf, firstLine } from './nodes';

/**
 * Language-independent explanation of a bracket: what it encloses, worked out
 * from the syntax tree (the bracketed node's field name and its owner), and
 * where its partner is. Works for every grammar because they share field names
 * like "condition", "body", "parameters" and "arguments".
 */

const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}', ')': '(', ']': '[', '}': '{' };
const OPENERS = new Set(['(', '[', '{']);
const NAMES: Record<string, string> = { '(': 'parenthesis', ')': 'parenthesis', '[': 'square bracket', ']': 'square bracket', '{': 'curly brace', '}': 'curly brace' };

/** What a bracketed node is, by its field name in the parent. */
const FIELD_TEXT: Record<string, string> = {
  condition: 'the condition',
  body: 'the body',
  consequence: 'the body',
  alternative: 'the `else` body',
  parameters: 'the parameter list',
  receiver: 'the receiver',
  arguments: 'the arguments',
  type_parameters: 'the type parameters',
  type_arguments: 'the type arguments',
  captures: 'the captured variables',
  index: 'the index',
  indices: 'the index',
  subscript: 'the index',
  initializer: 'the initializer',
  handler: 'the `catch` clause',
  finalizer: 'the `finally` block',
  accessors: 'the property accessors',
};

/** What a bracketed node is, by its type, when its field doesn't say. */
const TYPE_TEXT: [RegExp, string][] = [
  [/^parenthesized_(expression|type)$/, 'parentheses that group'],
  [/argument_list$|^arguments$|^token_tree$/, 'the arguments'],
  [/parameter_list$|^(formal_)?parameters$/, 'the parameter list'],
  [/^(array|array_expression|array_literal)$/, 'an array literal'],
  [/^(object|object_type)$/, 'an object'],
  [/initializer_(list|expression)$/, 'an initializer list'],
  [/^(block|statement_block|compound_statement)$/, 'a block'],
  [/subscript|index|element_binding|bracketed_argument_list/, 'an index'],
  [/^cast_expression$/, 'a type cast'],
  [/^(sizeof|typeof|decltype)/, 'the operand'],
];

/** Last word of a node type that reads as a noun ("if_statement" → "statement"). */
const NOUNS = new Set(['statement', 'expression', 'declaration', 'definition', 'item', 'clause', 'loop', 'signature', 'literal', 'specifier', 'type']);

const humanize = (type: string) => type.replace(/_/g, ' ');

/** "the `if` statement", "the `func` declaration `main`", "the call to `printf`" */
export function ownerLabel(owner: Node): string {
  const macro = owner.childForFieldName('macro');
  if (macro && owner.type === 'macro_invocation') return `the macro call \`${firstLine(macro, 40)}!\``;
  const fn = owner.childForFieldName('function');
  if (fn && /call|invocation/.test(owner.type)) return `the call to \`${firstLine(fn, 40)}\``;
  if (/^new_expression$|^object_creation_expression$/.test(owner.type)) {
    const t = owner.childForFieldName('constructor') ?? owner.childForFieldName('type');
    if (t) return `\`new ${firstLine(t, 40)}\``;
  }
  // C/C++: `int add(int a)` → function_declarator with the name in its "declarator" field.
  const declarator = owner.childForFieldName('declarator');
  if (owner.type === 'function_declarator' && declarator) return `the function \`${firstLine(declarator, 40)}\``;
  let keyword: string | undefined;
  for (let i = 0; i < Math.min(owner.childCount, 4); i++) {
    const c = owner.child(i)!;
    if (!c.isNamed && /^[a-z_]+$/.test(c.text)) {
      keyword = c.text;
      break;
    }
  }
  const words = owner.type.split('_');
  const noun = NOUNS.has(words.at(-1)!) ? words.at(-1)! : humanize(owner.type);
  let label = keyword ? `the \`${keyword}\` ${noun === keyword ? '' : noun}`.trimEnd() : `the ${humanize(owner.type)}`;
  const name = owner.childForFieldName('name');
  if (name && name.text.length <= 40 && !name.text.includes('\n')) label += ` \`${name.text}\``;
  return label;
}

function partnerOf(token: Node): Node | undefined {
  const parent = token.parent;
  if (!parent) return undefined;
  const open = OPENERS.has(token.text);
  const want = PAIRS[token.text];
  let depth = 0;
  let i = 0;
  while (i < parent.childCount && parent.child(i)!.id !== token.id) i++;
  for (let j = open ? i + 1 : i - 1; j >= 0 && j < parent.childCount; j += open ? 1 : -1) {
    const c = parent.child(j)!;
    if (c.text === token.text && !c.isNamed) depth++;
    else if (c.text === want && !c.isNamed) {
      if (depth === 0) return c;
      depth--;
    }
  }
  return undefined;
}

/** What the bracket pair encloses, e.g. "the condition of the `if` statement", if we can tell. */
function enclosed(token: Node, partner: Node | undefined): string | undefined {
  const container = token.parent!;
  const first = container.child(0);
  const last = container.child(container.childCount - 1);
  const wrapsWholeNode = first && last && PAIRS[first.text] === last.text && !first.isNamed && !last.isNamed;

  if (wrapsWholeNode) {
    // The brackets are the edges of their node, e.g. parenthesized_expression in if_statement.condition.
    const field = fieldOf(container);
    const owner = container.parent;
    if (field && FIELD_TEXT[field] && owner) return `${FIELD_TEXT[field]} of ${ownerLabel(owner)}`;
    const byType = TYPE_TEXT.find(([re]) => re.test(container.type))?.[1];
    if (byType === 'parentheses that group') return 'parentheses that group an expression, so it is evaluated first';
    if (byType && owner && /arguments|parameter list|operand/.test(byType)) return `${byType} of ${ownerLabel(owner)}`;
    if (byType) return byType;
    return `the ${humanize(container.type)}${owner ? ` in ${ownerLabel(owner)}` : ''}`;
  }

  // The brackets sit inside a bigger node, e.g. `if (cond)` in C# where if_statement owns the parens.
  const inner: string[] = [];
  const open = OPENERS.has(token.text) ? token : partner;
  const close = OPENERS.has(token.text) ? partner : token;
  if (open && close) {
    for (let i = 0; i < container.childCount; i++) {
      const c = container.child(i)!;
      if (c.startIndex >= open.endIndex && c.endIndex <= close.startIndex && c.isNamed) {
        const f = container.fieldNameForChild(i);
        if (f) inner.push(f);
      }
    }
  }
  const owner = ownerLabel(container);
  if (inner.length === 1 && FIELD_TEXT[inner[0]]) return `${FIELD_TEXT[inner[0]]} of ${owner}`;
  if (token.text === '(' || token.text === ')') return `the header of ${owner}`;
  if (token.text === '{' || token.text === '}') return `the body of ${owner}`;
  return undefined;
}

export function bracketSummary(token: Node): string | undefined {
  if (!PAIRS[token.text] || token.isNamed || !token.parent) return undefined;
  const partner = partnerOf(token);
  const what = enclosed(token, partner);
  if (!what) return undefined;
  const side = OPENERS.has(token.text) ? 'Opening' : 'Closing';
  let text = `${side} ${NAMES[token.text]} of ${what}.`;
  if (partner) {
    const where = partner.startPosition.row === token.startPosition.row ? 'on the same line' : `on line ${partner.startPosition.row + 1}`;
    text += ` Its partner is the \`${partner.text}\` ${where}.`;
  }
  return text;
}
