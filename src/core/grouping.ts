import type { Node } from 'web-tree-sitter';
import { codeSpan } from './markdown';

/**
 * Operator grouping: in `a + b * c == d`, which parts each operator works on.
 * Operator precedence decides that silently, so an operator's hover spells it
 * out: what this operator combines, and the whole expression with every
 * implicit group in parentheses: `(a + (b * c)) == d`.
 */

/**
 * Expressions built from operators, across the supported grammars. Explicit
 * parentheses (`parenthesized_expression`) aren't here: they already show their grouping.
 */
const OPERATOR_EXPRESSIONS = new Set([
  // Most grammars
  'binary_expression',
  'unary_expression',
  'update_expression',
  'conditional_expression',
  'ternary_expression',
  'await_expression',
  // C/C++: `*p`, `&x`; Rust: `&x`, `x?`, `0..n`
  'pointer_expression',
  'reference_expression',
  'try_expression',
  'range_expression',
  // Casts: C/C++/C# `(int)x`, Rust `x as i32`, C#/TypeScript `x as T`
  'cast_expression',
  'type_cast_expression',
  'as_expression',
  'is_expression',
  // C#
  'prefix_unary_expression',
  'postfix_unary_expression',
  // TypeScript. Not `x!` (non_null_expression): the grammar parses `a + b!` as `(a + b)!`.
  'satisfies_expression',
  // Python
  'binary_operator',
  'boolean_operator',
  'comparison_operator',
  'unary_operator',
  'not_operator',
]);

/** Tokens inside an operator expression that aren't operators (a cast's parentheses). */
const NOT_OPERATORS = new Set(['(', ')', '[', ']', '{', '}']);

/** Longer expressions aren't spelled out in parentheses: they'd be harder to read than the code. */
const MAX_GROUPED = 100;
const MAX_OPERAND = 40;

export function isOperatorExpression(node: Node): boolean {
  return OPERATOR_EXPRESSIONS.has(node.type);
}

export interface Grouping {
  /** What the operator works on, as source text. */
  operands: string[];
  /** The whole expression, with each part made of operators in parentheses (unless it's too long). */
  grouped?: string;
}

/** Operator expressions in `node`, counting `node` itself, without looking inside explicit parentheses or calls. */
function countOperators(node: Node): number {
  let count = 1;
  for (let i = 0; i < node.namedChildCount; i++) {
    const child = node.namedChild(i)!;
    if (isOperatorExpression(child)) count += countOperators(child);
  }
  return count;
}

/** `node`'s source with every operator expression inside it wrapped in parentheses. */
function render(node: Node): string {
  const text = node.text;
  let out = '';
  let pos = 0;
  for (let i = 0; i < node.namedChildCount; i++) {
    const child = node.namedChild(i)!;
    if (!isOperatorExpression(child)) continue;
    const start = child.startIndex - node.startIndex;
    out += `${text.slice(pos, start)}(${render(child)})`;
    pos = child.endIndex - node.startIndex;
  }
  return out + text.slice(pos);
}

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();
const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/**
 * For an operator token in an expression of at least two operators: what the
 * operator works on and how the whole expression is grouped. Undefined for a
 * lone operator (`a + b`), where there is nothing to group.
 */
export function groupingOf(token: Node): Grouping | undefined {
  const own = token.parent;
  if (token.isNamed || !own || !isOperatorExpression(own) || NOT_OPERATORS.has(token.text)) return undefined;
  let root = own;
  while (root.parent && isOperatorExpression(root.parent)) root = root.parent;
  if (countOperators(root) < 2) return undefined;
  const grouped = oneLine(render(root));
  const operands: string[] = [];
  for (let i = 0; i < own.namedChildCount; i++) {
    const child = own.namedChild(i)!;
    if (!child.type.includes('comment')) operands.push(shorten(oneLine(child.text), MAX_OPERAND));
  }
  return operands.length ? { operands, grouped: grouped.length > MAX_GROUPED ? undefined : grouped } : undefined;
}

/** "↳ Here: `+` combines `a` and `b * c`." plus the grouped expression. */
export function groupingMarkdown(operator: string, grouping: Grouping): string {
  const parts = grouping.operands.map(codeSpan);
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
  const verb = parts.length === 1 ? 'applies to' : parts.length === 2 ? 'combines' : 'works on';
  const here = `↳ **Here:** ${codeSpan(operator)} ${verb} ${list}.`;
  return grouping.grouped ? `${here}\n\n**Grouped as:** ${codeSpan(grouping.grouped)}` : here;
}
