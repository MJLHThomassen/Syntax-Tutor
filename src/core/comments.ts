import type { Node, Point } from 'web-tree-sitter';
import type { CommentCategory, CommentKind, CommentStyle, DocFormat, LanguageSpec, TagDoc } from './model';
import { firstLine } from './nodes';

/**
 * Comments: which kind a comment is (plain, doc, directive, TODO), the block it
 * belongs to (consecutive `//` lines count as one), the declaration a doc
 * comment documents, and the tags inside doc comments (`@param`, `\brief`,
 * `<summary>`, Rust `# Examples`, Go `Deprecated:`).
 *
 * Grammars don't parse the inside of comments, so tags are found by scanning the
 * block's text; offsets are mapped back to editor positions through `Block`.
 */

export type CommentFilter = 'all' | 'doc' | 'off';

interface Span {
  start: Point;
  end: Point;
}

export interface CommentInfo {
  markdown: string;
  /** What the hover is about: the tag, or the whole comment block. */
  span: Span;
  /** The documented declaration, or the parameter a tag names. */
  related?: Span;
}

const isCommentNode = (n: Node) => /comment$/.test(n.type) && !/comment$/.test(n.parent?.type ?? '');

/**
 * The outermost comment node containing `token` (Rust nests doc_comment inside line_comment),
 * or the string literal that is a doc comment (Python docstrings).
 */
export function commentNode(token: Node, style?: CommentStyle): Node | undefined {
  for (let n: Node | null = token; n; n = n.parent) if (isCommentNode(n) || style?.isDocString?.(n)) return n;
  return undefined;
}

/** Rust's line_comment includes its newline; treat it as ending on its own row. */
function textOf(n: Node): string {
  return n.text.endsWith('\n') ? n.text.slice(0, -1) : n.text;
}

function endOf(n: Node): Point {
  if (!n.text.endsWith('\n')) return n.endPosition;
  const lines = textOf(n).split('\n');
  return {
    row: n.startPosition.row + lines.length - 1,
    column: (lines.length === 1 ? n.startPosition.column : 0) + lines.at(-1)!.length,
  };
}

/**
 * The kind of line comment, so different kinds don't merge into one block: `//`, `///`, `//!`,
 * and `#` / `#:` (Python). A shebang or encoding line is a block of its own.
 */
function lineStyle(text: string): string | undefined {
  if (text.startsWith('//')) return text.match(/^\/\/[/!]?/)?.[0] ?? '//';
  if (text.startsWith('#')) return /^#!|^#.*coding[:=]/.test(text) ? text : text.startsWith('#:') ? '#:' : '#';
  return undefined;
}

/** A run of comment nodes treated as one comment, with offset ↔ position mapping over its text. */
class Block {
  readonly text: string;
  private readonly starts: number[] = [];

  constructor(readonly nodes: Node[]) {
    let offset = 0;
    const parts: string[] = [];
    for (const n of nodes) {
      this.starts.push(offset);
      const t = textOf(n);
      parts.push(t);
      offset += t.length + 1;
    }
    this.text = parts.join('\n');
  }

  get span(): Span {
    return { start: this.nodes[0].startPosition, end: endOf(this.nodes.at(-1)!) };
  }

  pointAt(offset: number): Point {
    let i = this.starts.length - 1;
    while (i > 0 && this.starts[i] > offset) i--;
    const node = this.nodes[i];
    const local = this.text.slice(this.starts[i], offset);
    const lines = local.split('\n');
    return {
      row: node.startPosition.row + lines.length - 1,
      column: (lines.length === 1 ? node.startPosition.column : 0) + lines.at(-1)!.length,
    };
  }

  offsetAt(p: Point): number | undefined {
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const end = endOf(n);
      if (p.row < n.startPosition.row || p.row > end.row) continue;
      const lines = textOf(n).split('\n');
      const lineIdx = p.row - n.startPosition.row;
      const col = p.column - (lineIdx === 0 ? n.startPosition.column : 0);
      if (col < 0 || col > lines[lineIdx].length) return undefined;
      let off = this.starts[i];
      for (let k = 0; k < lineIdx; k++) off += lines[k].length + 1;
      return off + col;
    }
    return undefined;
  }

  spanOf(from: number, to: number): Span {
    return { start: this.pointAt(from), end: this.pointAt(to) };
  }
}

/** Consecutive line comments of the same style (`//`, `///`, `//!`) in one column form a block. */
function blockOf(node: Node): Block {
  const style = lineStyle(node.text);
  if (!style || isTrailing(node)) return new Block([node]);
  const joins = (a: Node, b: Node) =>
    isCommentNode(a) &&
    isCommentNode(b) &&
    lineStyle(a.text) === style &&
    lineStyle(b.text) === style &&
    b.startPosition.column === a.startPosition.column &&
    b.startPosition.row === endOf(a).row + 1 &&
    !isTrailing(b);
  const nodes = [node];
  for (let p = node.previousSibling; p && joins(p, nodes[0]); p = p.previousSibling) nodes.unshift(p);
  for (let n = node.nextSibling; n && joins(nodes.at(-1)!, n); n = n.nextSibling) nodes.push(n);
  return new Block(nodes);
}

/** A comment after code on the same line. */
function isTrailing(node: Node): boolean {
  const prev = node.previousSibling;
  return !!prev && endOf(prev).row === node.startPosition.row;
}

function kindOf(style: CommentStyle, block: Block): CommentKind | undefined {
  return style.kinds.find((k) => k.test.test(block.nodes[0].text));
}

/** The declaration a doc comment documents: the next node, skipping attributes, with no blank line between. */
function documented(style: CommentStyle, block: Block, kind: CommentKind): Node | undefined {
  const first = block.nodes[0];
  if (kind.inner) {
    // Climb out of the body (and, for a docstring, its expression statement) to the item itself.
    let p = first.parent;
    while (p && /^(declaration_list|block|compound_statement|expression_statement)$/.test(p.type) && p.parent) p = p.parent;
    if (p?.parent?.type === 'decorated_definition') p = p.parent; // Python: include the decorators
    return p && p.parent ? p : undefined; // not the whole file
  }
  let row = endOf(block.nodes.at(-1)!).row;
  let n = block.nodes.at(-1)!.nextNamedSibling;
  while (n && style.skipBetween?.has(n.type) && n.startPosition.row <= row + 1) {
    row = endOf(n).row;
    n = n.nextNamedSibling;
  }
  // Python: a comment above the first statement of a body can be followed by the indented block itself.
  if (n?.type === 'block' && n.firstNamedChild?.startIndex === n.startIndex) n = n.firstNamedChild;
  return n && !isCommentNode(n) && n.startPosition.row <= row + 1 ? n : undefined;
}

// ------------------------------------------------------------------ tags

interface TagHit {
  key: string;
  /** Range of the tag token itself (for the hover span). */
  from: number;
  to: number;
  /** Range the tag governs (for the highlight). */
  extentFrom: number;
  extentTo: number;
  /** A parameter name the tag refers to. */
  name?: string;
}

/** End of a JSDoc/Doxygen block tag's text: the next block tag at a line start, or the comment end. */
/** Pull `end` back over trailing blank decoration lines (` *`, `///`) and whitespace. */
function trimEnd(text: string, from: number, end: number): number {
  const seg = text.slice(from, end).replace(/(\n[ \t]*(?:\*(?!\/)|\/\/[/!]?)?[ \t]*)+$/, '').trimEnd();
  return from + seg.length;
}

function blockTagEnd(text: string, from: number, sigils: string): number {
  const re = new RegExp(`\\n[ \\t]*(?:\\*|///|//!)?[ \\t]*[${sigils}][A-Za-z]`, 'g');
  re.lastIndex = from;
  const m = re.exec(text);
  let end = m ? m.index : text.length;
  const close = text.lastIndexOf('*/');
  if (close >= from && close < end) end = close;
  return trimEnd(text, from, end);
}

function findTag(format: DocFormat, text: string, at: number): TagHit | undefined {
  const covering = (re: RegExp, f: (m: RegExpExecArray) => TagHit | undefined) => {
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      const hit = f(m);
      if (hit && at >= hit.from && at < hit.to) return hit;
      if (m.index > at) break;
    }
    return undefined;
  };

  switch (format) {
    case 'jsdoc':
    case 'doxygen': {
      const sigils = format === 'jsdoc' ? '@' : '@\\\\';
      // Inline {@link Foo} first, then block tags.
      const inline = covering(/\{@(\w+)\s*([^}\s|]*)[^}]*\}/g, (m) => ({
        key: m[1].toLowerCase(), from: m.index, to: m.index + m[0].length, extentFrom: m.index, extentTo: m.index + m[0].length, name: m[2] || undefined,
      }));
      if (inline) return inline;
      return covering(new RegExp(`(?<![\\w{])[${sigils}](\\w+)`, 'g'), (m) => {
        const after = text.slice(m.index + m[0].length);
        const nm = format === 'jsdoc'
          ? after.match(/^\s*(?:\{[^}]*\}\s*)?\[?([A-Za-z_$][\w$.]*)/)
          : after.match(/^(?:\[[^\]]*\])?\s+([A-Za-z_]\w*)/);
        return {
          key: m[1].toLowerCase(), from: m.index, to: m.index + m[0].length,
          extentFrom: m.index, extentTo: blockTagEnd(text, m.index + m[0].length, sigils), name: nm?.[1],
        };
      });
    }
    case 'xmldoc':
      return covering(/<(\/?)([A-Za-z]+)([^<>]*?)(\/?)>/g, (m) => {
        const name = m[2];
        const closing = m[1] === '/';
        const selfClosing = m[4] === '/';
        let extentFrom = m.index;
        let extentTo = m.index + m[0].length;
        if (closing) {
          const open = text.lastIndexOf(`<${name}`, m.index);
          if (open >= 0) extentFrom = open;
        } else if (!selfClosing) {
          const close = text.indexOf(`</${name}>`, m.index);
          if (close >= 0) extentTo = close + name.length + 3;
        }
        const attr = (closing ? text.slice(extentFrom, text.indexOf('>', extentFrom)) : m[3]).match(/(?:name|cref)\s*=\s*"(?:[A-Z]:)?([^"(]*)/);
        return { key: name.toLowerCase(), from: m.index, to: m.index + m[0].length, extentFrom, extentTo, name: attr?.[1] };
      });
    case 'rustdoc': {
      const fence = covering(/```[\w,]*/g, (m) => {
        const close = text.indexOf('```', m.index + 3);
        const opening = text.slice(0, m.index).split('```').length % 2 === 1;
        if (!opening) return undefined; // a closing fence: covered by the opening one's extent below
        return { key: '```', from: m.index, to: m.index + m[0].length, extentFrom: m.index, extentTo: close >= 0 ? close + 3 : text.length };
      });
      if (fence) return fence;
      const heading = covering(/(^|\n)([ \t]*(?:\/\/[/!]|\*)?[ \t]*)(#+[ \t]+(\w+))/g, (m) => {
        const from = m.index + m[1].length + m[2].length;
        const next = text.slice(from + 1).search(/\n[ \t]*(?:\/\/[/!]|\*)?[ \t]*#+[ \t]/);
        return { key: `# ${m[4].toLowerCase()}`, from, to: from + m[3].length, extentFrom: from, extentTo: trimEnd(text, from, next >= 0 ? from + 1 + next : text.length) };
      });
      if (heading) return heading;
      return covering(/\[`?([\w:]+)`?\](?!\()/g, (m) => ({
        key: '[link]', from: m.index, to: m.index + m[0].length, extentFrom: m.index, extentTo: m.index + m[0].length, name: m[1],
      }));
    }
    case 'godoc': {
      const para = covering(/(^|\n)(\/\/[ \t]*)(Deprecated:|BUG\(\w*\):)/g, (m) => {
        const from = m.index + m[1].length + m[2].length;
        const blank = text.slice(from).search(/\n\/\/[ \t]*(\n|$)/);
        return { key: m[3].startsWith('BUG') ? 'bug' : 'deprecated:', from, to: from + m[3].length, extentFrom: from, extentTo: trimEnd(text, from, blank >= 0 ? from + blank : text.length) };
      });
      if (para) return para;
      return covering(/\[([\w.*]+)\](?!\()/g, (m) => ({
        key: '[link]', from: m.index, to: m.index + m[0].length, extentFrom: m.index, extentTo: m.index + m[0].length, name: m[1],
      }));
    }
    case 'pydoc':
      return findPyDocTag(text, at, covering);
  }
}

// ----------------------------------------------------- Python docstrings

/** Google (`Args:`) and NumPy (`Parameters` + `----------`) section headers. */
const PY_SECTION = /(^|\n)([ \t]*)(Args|Arguments|Parameters|Params|Keyword Args|Keyword Arguments|Other Parameters|Returns|Return|Yields|Yield|Raises|Raise|Exceptions|Warns|Examples|Example|Attributes|Methods|Notes|Note|Warnings|Warning|See Also|Todo|References)([ \t]*:[ \t]*(?=\n)|[ \t]*\n[ \t]*-{3,}[ \t]*(?=\n|$))/g;
const PY_SECTION_KEY: Record<string, string> = {
  arguments: 'args', params: 'parameters', 'keyword arguments': 'keyword args', return: 'returns', yield: 'yields',
  raise: 'raises', exceptions: 'raises', example: 'examples', note: 'notes', warning: 'warnings',
};
/** Sections whose entries are parameters (`name (type): text` or NumPy's `name : type`). */
const PY_PARAM_SECTIONS = new Set(['args:', 'parameters:', 'keyword args:', 'other parameters:']);

function findPyDocTag(
  text: string,
  at: number,
  covering: (re: RegExp, f: (m: RegExpExecArray) => TagHit | undefined) => TagHit | undefined,
): TagHit | undefined {
  // The docstring's text ends before its closing quotes.
  const body = text.length - (text.match(/("""|'''|"|')$/)?.[0].length ?? 0);
  const until = (from: number, re: RegExp) => {
    const next = text.slice(from + 1, body).search(re);
    return trimEnd(text, from, next >= 0 ? from + 1 + next : body);
  };

  // Sphinx cross-references: :func:`name`, :class:`~pkg.Name`.
  const role = covering(/:(?:py:)?(func|meth|class|mod|attr|exc|data|obj|const):`[~!]?([\w.]+)[^`]*`/g, (m) => ({
    key: `:${m[1]}:`, from: m.index, to: m.index + m[0].length, extentFrom: m.index, extentTo: m.index + m[0].length, name: m[2],
  }));
  if (role) return role;

  // reST field lists: `:param x:`, `:type x:`, `:returns:`, `:raises ValueError:`. The last word names the parameter.
  const field = covering(/(^|\n)([ \t]*)(:(\w+)([^:\n`]*):)/g, (m) => {
    const from = m.index + m[1].length + m[2].length;
    return {
      key: `:${m[4].toLowerCase()}:`, from, to: from + m[3].length,
      extentFrom: from, extentTo: until(from, /\n[ \t]*(:\w|\.\. |\n|$)/), name: m[5].trim().split(/\s+/).at(-1) || undefined,
    };
  });
  if (field) return field;

  // reST directives: `.. note::`, `.. deprecated:: 2.0`.
  const directive = covering(/(^|\n)([ \t]*)(\.\. ([\w-]+)::)/g, (m) => {
    const from = m.index + m[1].length + m[2].length;
    return { key: `.. ${m[4].toLowerCase()}::`, from, to: from + m[3].length, extentFrom: from, extentTo: until(from, /\n[ \t]*\n/) };
  });
  if (directive) return directive;

  // Doctests: `>>> code` and the expected output, up to a blank line.
  const doctest = covering(/(^|\n)([ \t]*)(>>>)/g, (m) => {
    const from = m.index + m[1].length + m[2].length;
    return { key: '>>>', from, to: from + 3, extentFrom: from, extentTo: until(from, /\n[ \t]*(\n|$)/) };
  });
  if (doctest) return doctest;

  // Sections, and the parameter entries inside Args/Parameters sections.
  const sections: TagHit[] = [];
  PY_SECTION.lastIndex = 0;
  for (let m = PY_SECTION.exec(text); m; m = PY_SECTION.exec(text)) {
    const from = m.index + m[1].length + m[2].length;
    const word = m[3].toLowerCase();
    const colon = m[4].trimStart().startsWith(':');
    sections.push({ key: `${PY_SECTION_KEY[word] ?? word}:`, from, to: from + m[3].length + (colon ? m[4].indexOf(':') + 1 : 0), extentFrom: from, extentTo: body });
  }
  sections.forEach((s, i) => (s.extentTo = trimEnd(text, s.from, i + 1 < sections.length ? sections[i + 1].from : body)));
  const section = sections.find((s) => at >= s.from && at < s.to);
  if (section) return section;

  const inside = sections.find((s) => PY_PARAM_SECTIONS.has(s.key) && at >= s.to && at < s.extentTo);
  if (!inside) return undefined;
  // Skip the NumPy underline, then entries are the lines at the indentation of the first one.
  const start = text.indexOf('\n', inside.to) + 1;
  const lines = text.slice(start, inside.extentTo).split('\n');
  let offset = start;
  let indent: number | undefined;
  const entries: TagHit[] = [];
  for (const line of lines) {
    const m = line.match(/^([ \t]*)(\*{0,2}([A-Za-z_]\w*))[ \t]*(?:\([^)\n]*\))?[ \t]*:(?!:)/);
    const lineIndent = line.length - line.trimStart().length;
    if (m && !/^[ \t]*-+[ \t]*$/.test(line) && (indent === undefined || lineIndent === indent)) {
      indent ??= lineIndent;
      const from = offset + m[1].length;
      entries.push({ key: 'param-entry', from, to: from + m[2].length, extentFrom: from, extentTo: from, name: m[3] });
    }
    offset += line.length + 1;
  }
  entries.forEach((e, i) => (e.extentTo = trimEnd(text, e.from, i + 1 < entries.length ? entries[i + 1].from : inside.extentTo)));
  return entries.find((e) => at >= e.from && at < e.to);
}

/** The parameter (or type parameter) named `name` inside the documented declaration. */
function findParam(spec: LanguageSpec, target: Node, name: string): Node | undefined {
  const leaf = name.split('.')[0];
  const candidates = target.descendantsOfType([...spec.identifierTypes]).filter((n): n is Node => !!n && n.text === leaf);
  const inParams = (n: Node) => {
    for (let p = n.parent; p && !p.equals(target); p = p.parent) if (/param/i.test(p.type)) return true;
    return false;
  };
  return candidates.find(inParams);
}

/** A declaration anywhere in the file whose name is `name` (last path segment), for doc links. */
function findDeclaration(root: Node, name: string): Node | undefined {
  const leaf = name.split(/::|\.|#/).filter(Boolean).at(-1);
  if (!leaf) return undefined;
  const stack: Node[] = [root];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.childForFieldName('name')?.text === leaf && !/call|reference|expression/.test(n.type)) return n;
    for (let i = n.namedChildCount - 1; i >= 0; i--) stack.push(n.namedChild(i)!);
  }
  return undefined;
}

/** First line of a declaration, skipping attributes/decorators written above it. */
function headline(n: Node): string {
  for (let i = 0; i < n.childCount; i++) {
    const c = n.child(i)!;
    if (/attribute|decorator|comment/.test(c.type)) continue;
    if (c.startIndex === n.startIndex) break;
    const rest = n.text.slice(c.startIndex - n.startIndex).split('\n', 1)[0].trim();
    return rest.length > 60 ? `${rest.slice(0, 59)}…` : rest;
  }
  return firstLine(n);
}

/** The code before a trailing comment, on the same line. */
function lineBefore(comment: Node): { text: string; span: Span } | undefined {
  // The source line itself, so the whole line counts even when the comment's previous
  // sibling is only part of it (Python: `def f(x):  # note` follows the `:`).
  const root = comment.tree.rootNode;
  const row = comment.startPosition.row;
  let line = root.text.split('\n')[row - root.startPosition.row] ?? '';
  if (row === root.startPosition.row) line = ' '.repeat(root.startPosition.column) + line;
  line = line.slice(0, comment.startPosition.column);
  const text = line.trim();
  if (!text) return undefined;
  const indent = line.length - line.trimStart().length;
  return { text, span: { start: { row, column: indent }, end: { row, column: indent + text.length } } };
}

// ------------------------------------------------------------- rendering

const fence = (lang: string, code: string) => `\`\`\`${lang}\n${code}\n\`\`\``;

function render(heading: string, d: { summary: string; details?: string; example?: string; link?: string }, lang: string): string {
  const parts = [heading, d.summary];
  if (d.details) parts.push(d.details);
  if (d.example) parts.push(fence(lang, d.example));
  if (d.link) parts.push(`[Read more ↗](${d.link})`);
  return parts.join('\n\n');
}

function shown(category: CommentCategory, filter: CommentFilter): boolean {
  return filter === 'all' || (filter === 'doc' && category !== 'plain');
}

/** Hover text and highlight ranges for a comment at `point`. */
export function explainComment(spec: LanguageSpec, token: Node, point: Point, filter: CommentFilter = 'all'): CommentInfo | undefined {
  const style = spec.comments;
  const node = commentNode(token, style);
  if (!style || !node || filter === 'off') return undefined;
  const block = blockOf(node);
  let kind = kindOf(style, block);
  let target = kind && (kind.category === 'doc' ? documented(style, block, kind) : undefined);
  // Go: a plain comment block right above a declaration is its doc comment.
  if (kind && kind.category === 'plain' && style.attachedLineComments && lineStyle(block.nodes[0].text) && !isTrailing(block.nodes[0])) {
    const t = documented(style, block, kind);
    if (t) {
      target = t;
      kind = { ...kind, category: 'doc', format: style.attachedLineComments, title: 'Doc comment', summary: DOC_COMMENT_SUMMARY[style.attachedLineComments] ?? kind.summary };
    }
  }
  if (!kind || !shown(kind.category, filter)) return undefined;

  const trailingOf = isTrailing(block.nodes[0]) ? lineBefore(block.nodes[0]) : undefined;
  const formatName = kind.format ? style.formatNames[kind.format] : undefined;

  // A tag inside a doc comment?
  const offset = block.offsetAt(point);
  if (kind.format && offset !== undefined) {
    const hit = findTag(kind.format, block.text, offset);
    const tag = hit && style.tags[kind.format]?.[hit.key];
    if (hit && tag) {
      let markdown = render(`**\`${tag.title ?? block.text.slice(hit.from, hit.to)}\`** · ${formatName ?? spec.displayName} ${kind.format === 'xmldoc' ? 'element' : 'tag'}`, tag, spec.fence);
      const param = tag.names && hit.name && target ? findParam(spec, target, hit.name) : undefined;
      const linked = tag.links && hit.name ? findDeclaration(node.tree.rootNode, hit.name) : undefined;
      if (param) markdown += `\n\n---\n\n↳ **Here:** refers to \`${param.text}\` in \`${headline(target!)}\``;
      else if (linked) markdown += `\n\n---\n\n↳ **Here:** links to \`${headline(linked)}\` (line ${linked.startPosition.row + 1})`;
      else if (target) markdown += `\n\n---\n\n↳ **Documents:** \`${headline(target)}\``;
      const related = param ?? linked ?? target;
      return {
        markdown,
        span: block.spanOf(hit.extentFrom, hit.extentTo),
        related: related && { start: related.startPosition, end: related.endPosition },
      };
    }
  }

  const label = `${spec.displayName} ${kind.category === 'plain' ? 'comment' : kind.category === 'doc' ? `doc comment${formatName ? ` (${formatName})` : ''}` : kind.category === 'directive' ? 'directive' : 'note'}`;
  let markdown = render(`**${kind.title}** · ${label}`, kind, spec.fence);
  if (target) markdown += `\n\n---\n\n↳ **Documents:** \`${headline(target)}\``;
  else if (kind.inner) markdown += `\n\n---\n\n↳ **Documents:** ${kind.fileTarget ?? 'the module or crate this file defines'}`;
  else if (trailingOf) markdown += `\n\n---\n\n↳ **About:** \`${trailingOf.text}\` on the same line`;
  const related = target ? { start: target.startPosition, end: endOf(target) } : trailingOf?.span;
  return { markdown, span: block.span, related };
}

const DOC_COMMENT_SUMMARY: Partial<Record<DocFormat, string>> = {
  godoc: 'A **doc comment**: the comment directly above a declaration (no blank line) is its documentation. `go doc` and pkg.go.dev show it. By convention it is full sentences and starts with the name it documents.',
};
