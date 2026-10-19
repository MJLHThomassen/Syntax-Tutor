import type { Node, Point, Tree } from 'web-tree-sitter';
import type { DocEntry, DocKind, LanguageSpec, Role } from './model';
import { bracketSummary } from './brackets';
import { type CommentFilter, explainComment } from './comments';
import { groupingMarkdown, groupingOf } from './grouping';
import { fieldOf, firstLine, lastLeaf } from './nodes';

export interface Span {
  start: Point;
  end: Point;
}

export interface Explanation {
  markdown: string;
  span: Span;
}

export interface ScopeResult {
  /** The scope that belongs to the token: marker-highlighted. */
  primary: Span;
  /** Opening token and closing bracket of the scope: outlined. */
  boundaries: Span[];
  /** For jumps: the scope the token exits (lighter highlight). */
  related?: Span;
}

const BRACKETS = new Set(['{', '}', '(', ')', '[', ']']);
const CLOSERS = new Set(['}', ')', ']']);
const OPENERS_TITLE: Record<string, string> = { '(': '( )', ')': '( )', '[': '[ ]', ']': '[ ]', '{': '{ }', '}': '{ }' };
/** Kinds that describe a value or name, not a construct with its own scope. */
const NO_SCOPE_KINDS = new Set<DocKind>(['value', 'literal', 'type', 'trait', 'function', 'macro', 'convention']);

const KIND_LABEL: Record<DocKind, string> = {
  keyword: 'keyword',
  operator: 'operator',
  syntax: 'syntax',
  literal: 'literal',
  function: 'built-in function',
  type: 'built-in type',
  trait: 'standard trait',
  value: 'built-in value',
  macro: 'macro',
  convention: 'naming convention',
};

const span = (n: Node): Span => ({ start: n.startPosition, end: n.endPosition });

function before(a: Point, b: Point): boolean {
  return a.row < b.row || (a.row === b.row && a.column < b.column);
}

/** Whether `n` is (inside) a comment, or a string literal the language treats as a doc comment. */
function isComment(spec: LanguageSpec, n: Node): boolean {
  const docString = spec.comments?.isDocString;
  for (let p: Node | null = n; p; p = p.parent) if (p.type.includes('comment') || docString?.(p)) return true;
  return false;
}

/**
 * The leaf token at `point`. With `lookBehind`, a point just after a token
 * (where the text cursor sits after typing or clicking at the end of a word)
 * also counts.
 */
export function tokenAt(tree: Tree, point: Point, lookBehind = false): Node | undefined {
  const at = (p: Point): Node | undefined => {
    const n = tree.rootNode.descendantForPosition(p);
    // Leaves only, except comments: Rust's comment nodes have marker children around their text.
    if (!n || (n.childCount > 0 && !n.type.endsWith('comment')) || n.isMissing) return undefined;
    // descendantForPosition may return a token ending exactly at p.
    if (before(p, n.startPosition) || !before(p, n.endPosition)) return undefined;
    return n;
  };
  const hit = at(point);
  if (hit && !/^\s*$/.test(hit.text)) return hit;
  if (lookBehind && point.column > 0) return at({ row: point.row, column: point.column - 1 }) ?? hit;
  return hit;
}

function lookup(spec: LanguageSpec, key: string): DocEntry | undefined {
  return Object.hasOwn(spec.docs, key) ? spec.docs[key] : undefined;
}

/**
 * Doc entry for a keyword/operator/literal token (not an identifier), plus the
 * node it describes: the token itself, or e.g. the whole raw string literal.
 */
function tokenDoc(spec: LanguageSpec, token: Node): { doc: DocEntry; node: Node } | undefined {
  const parent = token.parent;
  const text = token.text;
  // Named leaves such as string contents shouldn't match by text ("func" inside a string).
  const textMatches = !token.isNamed || token.type === text || spec.keywordNodeTypes?.has(token.type);
  const doc =
    spec.docFor?.(token) ??
    (textMatches && parent ? lookup(spec, `${parent.type}/${text}`) : undefined) ??
    // A closing `>` (generics, templates, JSX tags) shares the explanation of the `<` it closes.
    (text === '>' && parent ? lookup(spec, `${parent.type}/<`) ?? lookup(spec, `${parent.type}/</`) : undefined) ??
    (textMatches ? lookup(spec, text) : undefined) ??
    lookup(spec, `#${token.type}`);
  if (doc) return { doc, node: token };
  const literal = parent && (spec.literalDoc?.(parent) ?? lookup(spec, `#${parent.type}`));
  return literal ? { doc: literal, node: parent } : undefined;
}

interface IdentifierInfo {
  role?: Role;
  doc?: DocEntry;
  docTitle?: string;
}

function identifierInfo(spec: LanguageSpec, token: Node): IdentifierInfo | undefined {
  const field = fieldOf(token);
  const parent = token.parent;
  if (parent?.type === 'macro_invocation' && field === 'macro' && spec.macroDoc) {
    return { doc: spec.macroDoc(token.text), docTitle: `${token.text}!` };
  }
  const role = spec.role(token, field);
  let doc = lookup(spec, token.text);
  // A declaration's own name is user-defined, even if it collides with a built-in.
  const declares = spec.isDeclarationName?.(token, field) ?? field === 'name';
  if (doc && (declares || !(spec.acceptIdentifierDoc?.(token, field, doc) ?? true))) doc = undefined;
  if (!role && !doc) return undefined;
  return { role, doc };
}

function renderDoc(spec: LanguageSpec, entry: DocEntry, title: string): string {
  const parts = [`**\`${entry.title ?? title}\`** · ${spec.displayName} ${KIND_LABEL[entry.kind]}`, entry.summary];
  if (entry.details) parts.push(entry.details);
  if (entry.example) parts.push(`\`\`\`${spec.fence}\n${entry.example}\n\`\`\``);
  if (entry.link) parts.push(`[Read more ↗](${entry.link})`);
  return parts.join('\n\n');
}

/**
 * Some grammars wrap a contextual keyword used as a name in an identifier node
 * (C#: `var from = 1;` is identifier(from)). Treat that as the identifier.
 */
function asName(spec: LanguageSpec, token: Node | undefined): Node | undefined {
  const parent = token?.parent;
  if (token && !token.isNamed && parent && parent.childCount === 1 && spec.identifierTypes.has(parent.type)) return parent;
  return token;
}

export interface Options {
  /** Which comments get hovers and highlights. Default "all". */
  comments?: CommentFilter;
}

export function explain(spec: LanguageSpec, tree: Tree, point: Point, options: Options = {}): Explanation | undefined {
  const token = asName(spec, tokenAt(tree, point));
  if (!token) return undefined;
  if (isComment(spec, token)) {
    const c = explainComment(spec, token, point, options.comments);
    return c && { markdown: c.markdown, span: c.span };
  }

  if (spec.identifierTypes.has(token.type)) {
    const info = identifierInfo(spec, token);
    if (!info) return undefined;
    const parts: string[] = [];
    if (info.role) parts.push(`**${info.role.title}** · ${info.role.summary}`);
    if (info.doc) parts.push(renderDoc(spec, info.doc, info.docTitle ?? token.text));
    return { markdown: parts.join('\n\n---\n\n'), span: span(token) };
  }

  const found = tokenDoc(spec, token);
  const bracket = bracketSummary(token);
  if (!found) {
    // Brackets without a doc of their own still get explained from their place in the tree.
    if (!bracket) return undefined;
    const pair = OPENERS_TITLE[token.text];
    return { markdown: `**\`${pair}\`** · ${spec.displayName} brackets\n\n${bracket}`, span: span(token) };
  }
  let markdown = renderDoc(spec, found.doc, token.text);
  const jump = spec.jumpTarget(token);
  const grouping = jump || bracket ? undefined : groupingOf(token);
  if (jump) markdown += `\n\n---\n\n↳ **Here:** ${jump.verb} \`${firstLine(jump.node)}\``;
  else if (bracket) markdown += `\n\n---\n\n↳ **Here:** ${bracket}`;
  else if (grouping) markdown += `\n\n---\n\n${groupingMarkdown(grouping)}`;
  return { markdown, span: span(found.node) };
}

export function scopeFor(
  spec: LanguageSpec,
  tree: Tree,
  point: Point,
  lookBehind = false,
  options: Options = {},
): ScopeResult | undefined {
  const token = asName(spec, tokenAt(tree, point, lookBehind));
  if (!token) return undefined;
  if (isComment(spec, token)) {
    // The whole comment block (or the tag under the cursor), plus what it documents.
    const c = explainComment(spec, token, point, options.comments);
    return c && { primary: c.span, boundaries: [], related: c.related };
  }

  let scope: Node | undefined;
  if (spec.identifierTypes.has(token.type)) {
    scope = spec.role(token, fieldOf(token))?.scope;
    if (scope && spec.promote) scope = spec.promote(scope);
  } else {
    if (spec.noScopeTokens.has(token.text)) return undefined;
    const doc = tokenDoc(spec, token)?.doc;
    const bracket = BRACKETS.has(token.text) && !token.isNamed;
    if (!bracket && (!doc || NO_SCOPE_KINDS.has(doc.kind))) return undefined;
    scope = token.parent ?? undefined;
    while (scope && spec.wrapperTypes.has(scope.type) && scope.parent) scope = scope.parent;
    if (scope && spec.promote) scope = spec.promote(scope);
  }
  if (!scope || scope.equals(tree.rootNode)) return undefined;

  const boundaries = [span(token)];
  const end = lastLeaf(scope);
  // With indentation blocks only a bracket of the scope itself closes it, not one ending its last statement.
  const closes = !spec.indentedBlocks || end.parent?.equals(scope);
  if (CLOSERS.has(end.type) && !end.equals(token) && closes) boundaries.push(span(end));
  if (token.text === '}' || token.text === ')' || token.text === ']') {
    const open = scope.child(0);
    if (open && BRACKETS.has(open.type) && !open.equals(token)) boundaries.push(span(open));
  }

  const jump = spec.jumpTarget(token);
  return { primary: span(scope), boundaries, related: jump && span(jump.node) };
}
