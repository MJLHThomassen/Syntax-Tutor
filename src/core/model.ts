import type { Node } from 'web-tree-sitter';

/**
 * What a doc entry describes. Identifiers only match entries of the
 * "name-like" kinds (function, type, trait, value, macro, convention); keyword and
 * operator entries only match tokens that are not identifiers.
 */
export type DocKind =
  | 'keyword'
  | 'operator'
  | 'syntax'
  | 'literal'
  | 'function'
  | 'type'
  | 'trait'
  | 'value'
  | 'macro'
  | 'convention';

export interface DocEntry {
  kind: DocKind;
  /** One or two sentences: what this means. Markdown allowed. */
  summary: string;
  /** Extra detail shown under the summary. Markdown allowed. */
  details?: string;
  /** A short code example in the language itself. */
  example?: string;
  /** Link to the official reference. */
  link?: string;
  /** Overrides the heading (defaults to the token text). */
  title?: string;
}

/**
 * Doc tables are looked up with these keys, most specific first:
 *   "<parentType>/<token>"  e.g. "pointer_type/*" vs "unary_expression/*"
 *   "<token>"               e.g. "func"
 *   "#<nodeType>"           e.g. "#raw_string_literal" (whole literal kinds)
 */
export type DocTable = Record<string, DocEntry>;

/** What an identifier is doing at a given spot, e.g. "Function name". */
export interface Role {
  title: string;
  summary: string;
  /** The declaration this name introduces; highlighted as its scope. */
  scope?: Node;
}

export interface LanguageSpec {
  /** Unique key; also used for the parser. */
  id: string;
  /** VS Code language ids this spec handles (e.g. ["javascript", "javascriptreact"]). */
  languageIds: readonly string[];
  displayName: string;
  /** File name of the grammar inside the wasm directory. */
  wasm: string;
  /** Markdown fence language for examples. */
  fence: string;
  docs: DocTable;
  /** Node types that are names (identifiers) rather than keywords/operators. */
  identifierTypes: ReadonlySet<string>;
  /** Named leaf node types that are really keywords (e.g. Rust's `mutable_specifier` for `mut`). */
  keywordNodeTypes?: ReadonlySet<string>;
  /** Doc for a macro invocation `name!(...)`. */
  macroDoc?(name: string): DocEntry | undefined;
  /** Parents to climb past when choosing the scope of a keyword. */
  wrapperTypes: ReadonlySet<string>;
  /** Token texts that never get a scope highlight (punctuation, quotes). */
  noScopeTokens: ReadonlySet<string>;
  /** Describe what an identifier means where it is (declaration names etc.). */
  role(node: Node, field: string | null): Role | undefined;
  /** For jump-like tokens (return, break, ...): the scope they jump out of / to. */
  jumpTarget(token: Node): JumpTarget | undefined;
  /** Optionally widen a declaration scope (e.g. a lone type_spec to its type_declaration). */
  promote?(scope: Node): Node;
  /**
   * Whether an identifier is the name a declaration introduces (built-in docs are
   * then skipped: it's the user's own name). Default: its field is "name".
   */
  isDeclarationName?(node: Node, field: string | null): boolean;
  /**
   * Context-aware doc for a non-identifier token, tried before the table keys.
   * For meanings the parent type alone can't tell apart (`for...of` vs `for...in`).
   */
  docFor?(token: Node): DocEntry | undefined;
  /** Extra check whether a doc entry applies to an identifier in context. */
  acceptIdentifierDoc?(node: Node, field: string | null, entry: DocEntry): boolean;
  /**
   * Doc for a whole literal whose kind depends on more than its node type (Python's
   * `r"..."`, `f"..."`, `b"..."` are all `string` nodes). Tried before `"#<node type>"`.
   */
  literalDoc?(literal: Node): DocEntry | undefined;
  /**
   * Blocks are delimited by indentation (Python), not brackets: the last token of a
   * scope is then whatever ends its last statement, so it isn't outlined as the
   * scope's closing bracket.
   */
  indentedBlocks?: boolean;
  /** Comment kinds (doc comments, directives, ...) and the doc-tag syntax used inside them. */
  comments?: CommentStyle;
}

/** How tags and markup are written inside doc comments. */
export type DocFormat = 'jsdoc' | 'doxygen' | 'xmldoc' | 'rustdoc' | 'godoc' | 'pydoc';

/**
 * plain: ordinary comment · doc: documents a declaration · directive: read by
 * the compiler or a tool · note: a TODO-style marker.
 */
export type CommentCategory = 'plain' | 'doc' | 'directive' | 'note';

export interface CommentKind {
  /** Tested against the text of the first comment in a block. */
  test: RegExp;
  category: CommentCategory;
  title: string;
  summary: string;
  details?: string;
  example?: string;
  link?: string;
  /** Documents the item it sits inside (Rust `//!`) instead of the one after it. */
  inner?: boolean;
  /** For inner doc comments at the top of a file: what they document (default "the module or crate this file defines"). */
  fileTarget?: string;
  /** Tag syntax inside this kind of comment. */
  format?: DocFormat;
}

export interface TagDoc {
  summary: string;
  title?: string;
  details?: string;
  example?: string;
  link?: string;
  /** The tag names a parameter (`@param a`, `<param name="a">`): highlight it in the declaration. */
  names?: boolean;
  /** The tag links to a declaration by name (`{@link foo}`, `[Name]`): highlight it if it's in this file. */
  links?: boolean;
}

export interface CommentStyle {
  /** First match wins. */
  kinds: CommentKind[];
  /** Plain line comments directly above a declaration document it (Go's doc comments). */
  attachedLineComments?: DocFormat;
  /** Nodes allowed between a doc comment and what it documents (attributes, decorators). */
  skipBetween?: ReadonlySet<string>;
  /**
   * Nodes that are doc comments although the grammar doesn't call them comments
   * (Python docstrings are string literals). They are explained like comments, and
   * their kind should be `inner`: they document the definition they sit in.
   */
  isDocString?(node: Node): boolean;
  /** Tag docs for the formats used in this language, keyed by format then tag. */
  tags: Partial<Record<DocFormat, Record<string, TagDoc>>>;
  /** Display name of each format, e.g. "JSDoc". */
  formatNames: Partial<Record<DocFormat, string>>;
}

export interface JumpTarget {
  node: Node;
  /** e.g. "returns from", "breaks out of" */
  verb: string;
}
