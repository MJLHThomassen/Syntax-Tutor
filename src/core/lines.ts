import type { Node, Tree } from 'web-tree-sitter';
import { explain, type Options, type Span } from './analyzer';
import { ownerLabel, partnerOf } from './brackets';
import type { LanguageSpec } from './model';
import { fieldOf } from './nodes';

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
    const member = /field|property/.test(token.type) ||
      (/^(field|property|name)$/.test(fieldOf(token) ?? '') && /member|field_expression|selector|access/.test(token.parent?.type ?? ''));
    if (member) return `**${name}** · member\n\nA field or method of the value before the \`.\`.`;
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
  for (const token of tokens) {
    // A closing bracket whose opener is in range adds nothing: the opener's entry names it.
    if (CLOSERS.has(token.text) && !token.isNamed) {
      const open = partnerOf(token);
      if (open && contains(range, spanOf(open))) continue;
    }
    const at = before(token.startPosition, range.start) ? range.start : token.startPosition;
    const e = explain(spec, tree, at, options);
    if (e) {
      // Several tokens can share one explanation (a raw string, a comment block): keep the first.
      if (items.some((i) => sameSpan(i.span, e.span))) continue;
      items.push({ text: token.type.endsWith('comment') ? token.text.split('\n', 1)[0] : textIn(tree, e.span), span: e.span, markdown: e.markdown });
      continue;
    }
    if (PUNCTUATION.test(token.text)) continue;
    const plain = fallback(spec, tree, token);
    if (!plain) continue;
    const lit = token.parent && /string|char|rune/.test(token.parent.type) && !spec.identifierTypes.has(token.type) ? token.parent : token;
    if (items.some((i) => contains(i.span, spanOf(lit)))) continue;
    items.push({ text: lit.text, span: spanOf(lit), markdown: plain, plain: true });
  }
  const first = tokens.find((t) => t.startPosition.row >= startRow);
  return { structure: structureOf(tree, first, startRow, endRow), items };
}

function textIn(tree: Tree, span: Span): string {
  const node = tree.rootNode.descendantForPosition(span.start, span.end);
  const text = node && node.startPosition.row === span.start.row && node.startPosition.column === span.start.column ? node.text : '';
  return text.length > 60 ? `${text.split('\n', 1)[0].slice(0, 59)}…` : text;
}
