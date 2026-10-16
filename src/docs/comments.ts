import type { CommentKind, CommentStyle, DocFormat, TagDoc } from '../core/model';

// Comment kinds and doc-tag tables for every language. Each language spec
// picks its style from here (`comments: goComments`, ...).

const FORMAT_NAMES: Record<DocFormat, string> = {
  jsdoc: 'JSDoc',
  doxygen: 'Doxygen',
  xmldoc: 'XML doc',
  rustdoc: 'rustdoc',
  godoc: 'Go doc',
};

const MDN_COMMENTS = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#comments';
const JSDOC = 'https://jsdoc.app/tags-';
const DOXYGEN = 'https://www.doxygen.nl/manual/commands.html';
const XMLDOC = 'https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/recommended-tags';
const RUSTDOC = 'https://doc.rust-lang.org/rustdoc/how-to-write-documentation.html';
const GODOC = 'https://go.dev/doc/comment';

// ------------------------------------------------------------ shared kinds

const todo: CommentKind = {
  test: /^(\/\/[/!]?|\/\*+|#)\s*(TODO|FIXME|HACK|XXX|NOTE|BUG)\b/,
  category: 'note',
  title: 'TODO / FIXME note',
  summary: 'A marker for unfinished work or a known problem. The compiler ignores it, but editors and linters can list all of them (e.g. the "Todo Tree" extension).',
};

const lineComment = (details?: string): CommentKind => ({
  test: /^\/\//,
  category: 'plain',
  title: '`//` line comment',
  summary: 'A **line comment**: everything after `//` up to the end of the line is ignored by the compiler. A note for people reading the code.',
  details,
});

const blockComment = (details: string, link?: string): CommentKind => ({
  test: /^\/\*/,
  category: 'plain',
  title: '`/* */` block comment',
  summary: 'A **block comment**: everything between `/*` and `*/` is ignored, even across several lines. Also handy to comment out part of a line.',
  details,
  link,
});

// --------------------------------------------------------------------- Go

const goTags: Record<string, TagDoc> = {
  'deprecated:': {
    title: 'Deprecated:',
    summary: 'A paragraph starting with `Deprecated:` marks the declaration as deprecated. `go vet`, gopls and pkg.go.dev pick it up and warn callers. Say what to use instead.',
    example: '// Deprecated: Use NewClient instead.',
    link: `${GODOC}#deprecations`,
  },
  bug: {
    title: 'BUG(who):',
    summary: 'A `BUG(name):` note at top level documents a known bug; `go doc` lists these in a "Bugs" section of the package.',
    link: 'https://pkg.go.dev/go/doc#Package',
  },
  '[link]': {
    title: '[Name] (doc link)',
    summary: 'A **doc link**: `[Name]` or `[pkg.Name]` in a doc comment becomes a link to that declaration on pkg.go.dev and in gopls hovers.',
    example: '// Parse reads a config. See [Config] and [os.Open].',
    link: `${GODOC}#doclinks`,
    links: true,
  },
};

export const goComments: CommentStyle = {
  kinds: [
    {
      test: /^\/\/go:build\b|^\/\/ \+build\b/,
      category: 'directive',
      title: '`//go:build` constraint',
      summary: 'A **build constraint**: the file is only compiled when the condition holds (OS, architecture, build tags). It must come before the `package` clause, followed by a blank line.',
      example: '//go:build linux && amd64\n//go:build !windows\n//go:build integration   // go test -tags=integration',
      link: 'https://pkg.go.dev/cmd/go#hdr-Build_constraints',
    },
    {
      test: /^\/\/go:generate\b/,
      category: 'directive',
      title: '`//go:generate`',
      summary: 'A command that `go generate` runs (it is not run by `go build`). Used to generate code: mocks, stringers, embedded assets.',
      example: '//go:generate stringer -type=Color',
      link: 'https://go.dev/blog/generate',
    },
    {
      test: /^\/\/go:embed\b/,
      category: 'directive',
      title: '`//go:embed`',
      summary: 'Embeds files into the binary at compile time. Goes right above a `string`, `[]byte` or `embed.FS` variable (and needs `import "embed"`).',
      example: '//go:embed static/*\nvar assets embed.FS',
      link: 'https://pkg.go.dev/embed',
    },
    {
      test: /^\/\/go:\w+/,
      category: 'directive',
      title: '`//go:` compiler directive',
      summary: 'A directive for the Go compiler (e.g. `//go:noinline`, `//go:linkname`). Note there is **no space** after `//`; with a space it would be an ordinary comment.',
      link: 'https://pkg.go.dev/cmd/compile#hdr-Compiler_Directives',
    },
    {
      test: /^\/\/\s*(Unordered output|Output):/,
      category: 'directive',
      title: '`// Output:` (example test)',
      summary: 'In an `Example...` function in a `_test.go` file, `go test` runs the example and checks that what it prints matches the lines after `// Output:`.',
      example: 'func ExampleHello() {\n\tfmt.Println("hello")\n\t// Output: hello\n}',
      link: 'https://go.dev/blog/examples',
    },
    {
      test: /^\/\/\s*nolint\b|^\/\/nolint/,
      category: 'directive',
      title: '`//nolint`',
      summary: 'Tells golangci-lint to skip warnings on this line (optionally only for named linters: `//nolint:errcheck`). Best with a reason.',
    },
    todo,
    lineComment('Go uses `//` for nearly all comments. A `//` comment directly above a declaration, with no blank line, becomes its **doc comment**.'),
    blockComment('In Go, block comments are mostly used for package docs or to disable code. They do not nest.', GODOC),
  ],
  attachedLineComments: 'godoc',
  tags: { godoc: goTags },
  formatNames: FORMAT_NAMES,
};

// ------------------------------------------------------------------- Rust

const rustTags: Record<string, TagDoc> = {
  '# examples': {
    title: '# Examples',
    summary: 'The conventional **Examples** section. Code blocks here are compiled and run as tests by `cargo test` (doc tests), so examples stay correct.',
    link: 'https://doc.rust-lang.org/rustdoc/write-documentation/what-to-include.html#examples',
  },
  '# panics': {
    title: '# Panics',
    summary: 'Conventional section describing when the function **panics**. Expected for any public function that can panic.',
    link: 'https://rust-lang.github.io/api-guidelines/documentation.html#function-docs-include-error-panic-and-safety-considerations-c-failure',
  },
  '# errors': {
    title: '# Errors',
    summary: 'Conventional section listing when the function returns an **`Err`**, and which errors.',
    link: 'https://rust-lang.github.io/api-guidelines/documentation.html#function-docs-include-error-panic-and-safety-considerations-c-failure',
  },
  '# safety': {
    title: '# Safety',
    summary: 'Required on an `unsafe fn` or `unsafe trait`: the conditions the **caller** must guarantee for the call to be sound. Clippy warns when it is missing.',
    link: 'https://rust-lang.github.io/api-guidelines/documentation.html#function-docs-include-error-panic-and-safety-considerations-c-failure',
  },
  '# arguments': { title: '# Arguments', summary: 'A section describing the parameters. Less common in Rust than in other languages: prefer explaining them in prose.', link: RUSTDOC },
  '# returns': { title: '# Returns', summary: 'A section describing the return value.', link: RUSTDOC },
  '```': {
    title: '``` (doc test)',
    summary: 'A code block in a doc comment is a **doc test**: `cargo test` compiles and runs it. Use `assert!`/`assert_eq!` to check results. Lines starting with `# ` are run but hidden in the docs.',
    details: 'Attributes after the fence change that: ` ```ignore `, ` ```no_run ` (compile only), ` ```should_panic `, ` ```compile_fail `, ` ```text ` (not Rust).',
    example: '/// ```\n/// assert_eq!(add(2, 2), 4);\n/// ```',
    link: 'https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html',
  },
  '[link]': {
    title: '[`Name`] (intra-doc link)',
    summary: 'An **intra-doc link**: rustdoc turns `[`Name`]` or `[path::Name]` into a link to that item, and warns if it can\'t be resolved.',
    link: 'https://doc.rust-lang.org/rustdoc/write-documentation/linking-to-items-by-name.html',
    links: true,
  },
};

export const rustComments: CommentStyle = {
  kinds: [
    {
      test: /^\/\/!|^\/\*!/,
      category: 'doc',
      inner: true,
      format: 'rustdoc',
      title: '`//!` inner doc comment',
      summary: 'An **inner doc comment** documents the item it is *inside*: at the top of `lib.rs`/`main.rs` the crate, at the top of a module file that module. Written in Markdown.',
      link: RUSTDOC,
    },
    {
      test: /^\/\/\/(?!\/)|^\/\*\*(?![*/])/,
      category: 'doc',
      format: 'rustdoc',
      title: '`///` doc comment',
      summary: 'A **doc comment** for the item that follows. It is Markdown; `cargo doc` turns it into HTML docs and the first paragraph becomes the summary. Code blocks in it are run as tests.',
      details: '`///` is sugar for the attribute `#[doc = "..."]`. Common sections: `# Examples`, `# Panics`, `# Errors`, `# Safety`.',
      example: '/// Returns the larger of two numbers.\n///\n/// # Examples\n/// ```\n/// assert_eq!(max(1, 2), 2);\n/// ```\npub fn max(a: i32, b: i32) -> i32 { ... }',
      link: RUSTDOC,
    },
    {
      test: /^\/\/\s*SAFETY:/,
      category: 'note',
      title: '`// SAFETY:` comment',
      summary: 'Convention: right above an `unsafe` block, explain **why** the code is sound (which invariants make it OK). Clippy\'s `undocumented_unsafe_blocks` lint can require it.',
      link: 'https://clippy.rust-lang.org/master/index.html#undocumented_unsafe_blocks',
    },
    todo,
    lineComment(),
    blockComment('Unlike C, Rust block comments **nest**: `/* outer /* inner */ still a comment */`. Line comments are more idiomatic.', 'https://doc.rust-lang.org/reference/comments.html'),
  ],
  skipBetween: new Set(['attribute_item']),
  tags: { rustdoc: rustTags },
  formatNames: FORMAT_NAMES,
};

// ----------------------------------------------------- JSDoc / TSDoc tags

const jsdocTags: Record<string, TagDoc> = {
  param: {
    title: '@param',
    summary: 'Documents a **parameter**: `@param {type} name description`. Use `[name]` for an optional one and `[name=default]` for a default; `obj.prop` documents a property of an object parameter.',
    details: 'In TypeScript the type comes from the signature, so write just `@param name - description`.',
    example: '/**\n * @param {string} name - Who to greet.\n * @param {number} [times=1] - How often.\n */',
    link: `${JSDOC}param.html`,
    names: true,
  },
  arg: { title: '@arg', summary: 'Synonym of `@param`.', link: `${JSDOC}param.html`, names: true },
  argument: { title: '@argument', summary: 'Synonym of `@param`.', link: `${JSDOC}param.html`, names: true },
  returns: { title: '@returns', summary: 'Documents the **return value**: `@returns {type} description`.', example: '@returns {Promise<User>} The loaded user.', link: `${JSDOC}returns.html` },
  return: { title: '@return', summary: 'Synonym of `@returns`.', link: `${JSDOC}returns.html` },
  throws: { title: '@throws', summary: 'Documents an **error** the function can throw, and when.', example: '@throws {RangeError} If n is negative.', link: `${JSDOC}throws.html` },
  exception: { title: '@exception', summary: 'Synonym of `@throws`.', link: `${JSDOC}throws.html` },
  type: { title: '@type', summary: 'Gives a variable or property a **type** in plain JavaScript; TypeScript checks it when `checkJs` is on.', example: '/** @type {Map<string, number>} */\nconst counts = new Map();', link: `${JSDOC}type.html` },
  typedef: { title: '@typedef', summary: 'Declares a named **type** in a JS file, like `type` in TypeScript.', example: '/** @typedef {{ id: number, name: string }} User */', link: `${JSDOC}typedef.html` },
  property: { title: '@property', summary: 'Documents a property of a `@typedef` or class.', link: `${JSDOC}property.html` },
  prop: { title: '@prop', summary: 'Synonym of `@property`.', link: `${JSDOC}property.html` },
  callback: { title: '@callback', summary: 'Declares a named **function type** in a JS file.', link: `${JSDOC}callback.html` },
  template: { title: '@template', summary: 'Declares a **generic type parameter** in a JS file (like `<T>`).', example: '/**\n * @template T\n * @param {T[]} xs\n * @returns {T}\n */', link: 'https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#template', names: true },
  typeparam: { title: '@typeParam', summary: 'TSDoc: documents a **type parameter** of a generic function or class.', link: 'https://tsdoc.org/pages/tags/typeparam/', names: true },
  example: { title: '@example', summary: 'An **example** of how to use the code. Editors show it in hovers, often as a code block.', link: `${JSDOC}example.html` },
  deprecated: { title: '@deprecated', summary: 'Marks the code as **deprecated**: editors show it ~~struck through~~ where it is used. Say what to use instead.', example: '@deprecated Use `fetchUser` instead.', link: `${JSDOC}deprecated.html` },
  see: { title: '@see', summary: 'Points to related code or a URL.', link: `${JSDOC}see.html`, links: true },
  link: { title: '{@link}', summary: 'An **inline link** to another symbol or a URL: `{@link fetchUser}`, `{@link https://... text}`. Editors make it clickable.', link: `${JSDOC}inline-link.html` , links: true },
  linkcode: { title: '{@linkcode}', summary: 'Like `{@link}`, but shows the name in code font.', link: `${JSDOC}inline-link.html` , links: true },
  linkplain: { title: '{@linkplain}', summary: 'Like `{@link}`, but shows the text in normal font.', link: `${JSDOC}inline-link.html` , links: true },
  inheritdoc: { title: '@inheritDoc', summary: 'Reuse the documentation of the method this one overrides or implements.', link: `${JSDOC}inheritdoc.html` },
  since: { title: '@since', summary: 'The version in which this was added.', link: `${JSDOC}since.html` },
  author: { title: '@author', summary: 'Who wrote the code.', link: `${JSDOC}author.html` },
  default: { title: '@default', summary: 'The default value of a property.', link: `${JSDOC}default.html` },
  defaultvalue: { title: '@defaultValue', summary: 'TSDoc: the default value of a property.', link: 'https://tsdoc.org/pages/tags/defaultvalue/' },
  remarks: { title: '@remarks', summary: 'TSDoc: longer explanation, kept separate from the one-line summary at the top.', link: 'https://tsdoc.org/pages/tags/remarks/' },
  private: { title: '@private', summary: 'Marks a member as **private** (not part of the public API). In JS files TypeScript enforces it.', link: `${JSDOC}private.html` },
  protected: { title: '@protected', summary: 'Marks a member as **protected**: only for subclasses.', link: `${JSDOC}protected.html` },
  public: { title: '@public', summary: 'Marks a member as **public** API.', link: `${JSDOC}public.html` },
  internal: { title: '@internal', summary: 'Not part of the public API; `tsc --stripInternal` can remove it from `.d.ts` output.', link: 'https://tsdoc.org/pages/tags/internal/' },
  readonly: { title: '@readonly', summary: 'The property must not be reassigned.', link: `${JSDOC}readonly.html` },
  async: { title: '@async', summary: 'The function is asynchronous (returns a Promise).', link: `${JSDOC}async.html` },
  yields: { title: '@yields', summary: 'Documents the values a **generator** yields.', link: `${JSDOC}yields.html` },
  override: { title: '@override', summary: 'The method overrides one from a parent class.', link: `${JSDOC}override.html` },
  abstract: { title: '@abstract', summary: 'Must be implemented by subclasses.', link: `${JSDOC}abstract.html` },
  class: { title: '@class', summary: 'The function is a constructor, meant to be called with `new` (old-style JS classes).', link: `${JSDOC}class.html` },
  constructor: { title: '@constructor', summary: 'Synonym of `@class`.', link: `${JSDOC}class.html` },
  extends: { title: '@extends', summary: 'The class extends another class (in JS files, also gives generic arguments: `@extends {Base<string>}`).', link: `${JSDOC}augments.html` },
  augments: { title: '@augments', summary: 'Synonym of `@extends`.', link: `${JSDOC}augments.html` },
  implements: { title: '@implements', summary: 'The class implements an interface.', link: `${JSDOC}implements.html` },
  enum: { title: '@enum', summary: 'An object used as an enum: all its values have the given type.', link: `${JSDOC}enum.html` },
  module: { title: '@module', summary: 'Documents the file as a module.', link: `${JSDOC}module.html` },
  file: { title: '@file', summary: 'Describes the whole file (at the top).', link: `${JSDOC}file.html` },
  fileoverview: { title: '@fileoverview', summary: 'Synonym of `@file`.', link: `${JSDOC}file.html` },
  satisfies: { title: '@satisfies', summary: 'Checks a value against a type without changing its inferred type (like TypeScript\'s `satisfies`).', link: 'https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#satisfies' },
  import: { title: '@import', summary: 'Imports types into a JS file for use in other JSDoc tags.', example: '/** @import { User } from "./types" */', link: 'https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#import' },
};

const tsDirective = (name: string, summary: string): CommentKind => ({
  test: new RegExp(`^//\\s*@${name}\\b`),
  category: 'directive',
  title: `\`// @${name}\``,
  summary,
  link: 'https://www.typescriptlang.org/docs/handbook/intro-to-js-ts.html#ts-check',
});

const jsKinds = (ts: boolean): CommentKind[] => [
  {
    test: /^\/\/\/\s*<reference\b/,
    category: 'directive',
    title: '`/// <reference />` (triple-slash directive)',
    summary: 'Tells TypeScript to include extra type declarations, e.g. `types="node"` or a `path` to a `.d.ts`. Only valid at the very top of a file. In modules, `import` is usually better.',
    link: 'https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html',
  },
  tsDirective('ts-expect-error', 'Suppresses the type error on the **next line**, and is itself an error if that line has none, so stale suppressions get noticed. Preferred over `@ts-ignore`.'),
  tsDirective('ts-ignore', 'Suppresses any type error on the **next line**. Silences real bugs too; prefer `@ts-expect-error` or fixing the type.'),
  tsDirective('ts-nocheck', 'Turns off type checking for the whole file.'),
  tsDirective('ts-check', 'Turns on type checking for this JavaScript file (using its JSDoc types).'),
  {
    test: /^\/[/*]\s*eslint(-disable|-enable)?\b/,
    category: 'directive',
    title: 'ESLint directive',
    summary: 'Configures the ESLint linter: `eslint-disable-next-line rule-name` skips a rule on the next line, `/* eslint-disable */` for the rest of the file. Name the rule and say why.',
    link: 'https://eslint.org/docs/latest/use/configure/rules#disable-rules',
  },
  {
    test: /^\/\/\s*prettier-ignore\b/,
    category: 'directive',
    title: '`// prettier-ignore`',
    summary: 'Tells the Prettier formatter to leave the next statement or node exactly as written.',
    link: 'https://prettier.io/docs/en/ignore.html',
  },
  {
    test: /^\/\/[#@]\s*sourceMappingURL=/,
    category: 'directive',
    title: '`//# sourceMappingURL`',
    summary: 'Points to the **source map** for this (generated) file, so devtools can show the original source when debugging.',
    link: 'https://developer.mozilla.org/en-US/docs/Glossary/Source_map',
  },
  {
    test: /^\/\*\*(?![*/])/,
    category: 'doc',
    format: 'jsdoc',
    title: `\`/** */\` ${ts ? 'JSDoc / TSDoc' : 'JSDoc'} comment`,
    summary: `A **documentation comment** for the declaration below it. Editors show it in hovers and autocomplete. Tags like \`@param\` and \`@returns\` describe the parts${ts ? '' : ', and in JS files TypeScript also reads types from them (`@type`, `@param {string}`)'}.`,
    details: ts ? 'In TypeScript, types come from the code itself, so doc comments describe *meaning*; tags follow the TSDoc standard.' : undefined,
    example: '/**\n * Adds two numbers.\n * @param a - The first number.\n * @param b - The second number.\n * @returns The sum.\n */\nfunction add(a, b) { return a + b; }',
    link: ts ? 'https://tsdoc.org/' : 'https://jsdoc.app/about-getting-started.html',
  },
  todo,
  lineComment(),
  blockComment('Block comments do not nest: the first `*/` ends the comment. A comment starting with `/**` is a doc comment.', MDN_COMMENTS),
];

const jsSkip = new Set(['decorator']);

export const javascriptComments: CommentStyle = {
  kinds: jsKinds(false),
  skipBetween: jsSkip,
  tags: { jsdoc: jsdocTags },
  formatNames: FORMAT_NAMES,
};

export const typescriptComments: CommentStyle = {
  ...javascriptComments,
  kinds: jsKinds(true),
  formatNames: { ...FORMAT_NAMES, jsdoc: 'TSDoc' },
};

// ------------------------------------------------------------- C / C++

const doxygenTags: Record<string, TagDoc> = {
  brief: { title: '\\brief', summary: 'A **one-line summary** of the documented item, shown in overviews. Often implied by the first sentence (`JAVADOC_AUTOBRIEF`).', link: `${DOXYGEN}#cmdbrief` },
  details: { title: '\\details', summary: 'Starts the **detailed description**.', link: `${DOXYGEN}#cmddetails` },
  param: {
    title: '\\param',
    summary: 'Documents a **parameter**: `@param name description`. An optional direction says how it is used: `[in]`, `[out]` (the function writes through it) or `[in,out]`.',
    example: '/**\n * @param[in]  src  Bytes to copy.\n * @param[out] dst  Where to copy them.\n */',
    link: `${DOXYGEN}#cmdparam`,
    names: true,
  },
  tparam: { title: '\\tparam', summary: 'Documents a **template parameter** (C++).', link: `${DOXYGEN}#cmdtparam`, names: true },
  return: { title: '\\return', summary: 'Documents the **return value**.', link: `${DOXYGEN}#cmdreturn` },
  returns: { title: '\\returns', summary: 'Synonym of `\\return`.', link: `${DOXYGEN}#cmdreturns` },
  retval: { title: '\\retval', summary: 'Documents one specific **return value** and what it means, e.g. `@retval -1 on error`.', link: `${DOXYGEN}#cmdretval` },
  throws: { title: '\\throws', summary: 'Documents an **exception** the function can throw (C++).', link: `${DOXYGEN}#cmdthrows` },
  throw: { title: '\\throw', summary: 'Synonym of `\\throws`.', link: `${DOXYGEN}#cmdthrow` },
  exception: { title: '\\exception', summary: 'Synonym of `\\throws`.', link: `${DOXYGEN}#cmdexception` },
  note: { title: '\\note', summary: 'A highlighted **note** paragraph.', link: `${DOXYGEN}#cmdnote` },
  warning: { title: '\\warning', summary: 'A highlighted **warning** paragraph, e.g. about thread safety or ownership.', link: `${DOXYGEN}#cmdwarning` },
  pre: { title: '\\pre', summary: 'A **precondition**: what must be true before calling (e.g. "ptr is not NULL").', link: `${DOXYGEN}#cmdpre` },
  post: { title: '\\post', summary: 'A **postcondition**: what is guaranteed after the call.', link: `${DOXYGEN}#cmdpost` },
  see: { title: '\\see', summary: 'Points to related functions or types.', link: `${DOXYGEN}#cmdsee`, links: true },
  sa: { title: '\\sa', summary: '"See also": same as `\\see`.', link: `${DOXYGEN}#cmdsa`, links: true },
  deprecated: { title: '\\deprecated', summary: 'Marks the item as **deprecated** and lists it on Doxygen\'s deprecated page. Pair it with C++ `[[deprecated]]` to get compiler warnings too.', link: `${DOXYGEN}#cmddeprecated` },
  file: { title: '\\file', summary: 'Documents the **file** itself.', link: `${DOXYGEN}#cmdfile` },
  author: { title: '\\author', summary: 'Who wrote it.', link: `${DOXYGEN}#cmdauthor` },
  todo: { title: '\\todo', summary: 'A TODO that Doxygen collects on a todo list page.', link: `${DOXYGEN}#cmdtodo` },
  bug: { title: '\\bug', summary: 'A known bug, collected on a bug list page.', link: `${DOXYGEN}#cmdbug` },
  code: { title: '\\code', summary: 'Starts a **code block** (ends with `\\endcode`).', link: `${DOXYGEN}#cmdcode` },
  endcode: { title: '\\endcode', summary: 'Ends a code block started with `\\code`.', link: `${DOXYGEN}#cmdendcode` },
  ref: { title: '\\ref', summary: 'A **link** to another documented item or section.', link: `${DOXYGEN}#cmdref`, links: true },
  p: { title: '\\p', summary: 'Shows the next word in code font, typically a parameter name.', link: `${DOXYGEN}#cmdp` },
  c: { title: '\\c', summary: 'Shows the next word in code font.', link: `${DOXYGEN}#cmdc` },
  a: { title: '\\a', summary: 'Shows the next word in italics (often a parameter name).', link: `${DOXYGEN}#cmda` },
  b: { title: '\\b', summary: 'Shows the next word in bold.', link: `${DOXYGEN}#cmdb` },
  since: { title: '\\since', summary: 'The version in which this was added.', link: `${DOXYGEN}#cmdsince` },
};

const cKinds = (cpp: boolean): CommentKind[] => [
  {
    test: /^\/\*\*(?![*/])|^\/\*!|^\/\/\/(?!\/)|^\/\/!/,
    category: 'doc',
    format: 'doxygen',
    title: 'Doxygen doc comment',
    summary: 'A **documentation comment** (`/** */`, `/*! */`, `///` or `//!`) for the declaration below it. Doxygen generates docs from it, and editors (clangd) show it in hovers. Commands like `@brief` and `@param` (or `\\brief`, `\\param`) describe the parts.',
    example: '/**\n * @brief Copies n bytes.\n * @param dst Destination buffer.\n * @param src Source buffer.\n * @return dst\n */\nvoid *copy(void *dst, const void *src, size_t n);',
    link: 'https://www.doxygen.nl/manual/docblocks.html',
  },
  {
    test: /^\/\/\s*NOLINT/,
    category: 'directive',
    title: '`// NOLINT`',
    summary: 'Tells clang-tidy to skip warnings on this line (`NOLINTNEXTLINE` for the next). Optionally name the check: `// NOLINT(bugprone-*)`.',
    link: 'https://clang.llvm.org/extra/clang-tidy/#suppressing-undesired-diagnostics',
  },
  {
    test: /^\/\/\s*(fall ?through|FALLTHROUGH)/i,
    category: 'directive',
    title: '`// fallthrough` comment',
    summary: 'Tells compilers (`-Wimplicit-fallthrough`) the missing `break` is intentional.' + (cpp ? ' In C++17 prefer `[[fallthrough]];`.' : ' C23 adds `[[fallthrough]];`.'),
  },
  todo,
  lineComment(cpp ? undefined : '`//` comments are allowed since C99; very old C code uses only `/* */`.'),
  blockComment('Block comments do **not** nest: `/* a /* b */ c */` ends after `b */`, leaving `c */` as code. To disable code that contains comments, use `#if 0 ... #endif`.', cpp ? 'https://en.cppreference.com/w/cpp/comment' : 'https://en.cppreference.com/w/c/comment'),
];

export const cComments: CommentStyle = {
  kinds: cKinds(false),
  tags: { doxygen: doxygenTags },
  formatNames: FORMAT_NAMES,
};

export const cppComments: CommentStyle = {
  ...cComments,
  kinds: cKinds(true),
  skipBetween: new Set(['attribute_declaration']),
};

// ---------------------------------------------------------------------- C#

const xmlTags: Record<string, TagDoc> = {
  summary: { title: '<summary>', summary: 'A short **description** of the member. This is what IntelliSense shows in hovers and completion lists.', example: '/// <summary>Loads the user with the given id.</summary>', link: `${XMLDOC}#summary` },
  remarks: { title: '<remarks>', summary: 'Extra, longer information, shown separately from the summary.', link: `${XMLDOC}#remarks` },
  param: { title: '<param name="...">', summary: 'Describes one **parameter**; `name` must match the parameter (the compiler warns otherwise).', example: '/// <param name="id">The user\'s id.</param>', link: `${XMLDOC}#param`, names: true },
  paramref: { title: '<paramref name="..."/>', summary: 'Refers to a **parameter** inside other text, shown in code font.', link: `${XMLDOC}#paramref`, names: true },
  typeparam: { title: '<typeparam name="...">', summary: 'Describes a **generic type parameter**.', link: `${XMLDOC}#typeparam`, names: true },
  typeparamref: { title: '<typeparamref name="..."/>', summary: 'Refers to a type parameter inside other text.', link: `${XMLDOC}#typeparamref`, names: true },
  returns: { title: '<returns>', summary: 'Describes the **return value**.', link: `${XMLDOC}#returns` },
  value: { title: '<value>', summary: 'Describes the value a **property** represents.', link: `${XMLDOC}#value` },
  exception: { title: '<exception cref="...">', summary: 'Documents an **exception** the member can throw and when. `cref` names the exception type.', example: '/// <exception cref="ArgumentNullException">If name is null.</exception>', link: `${XMLDOC}#exception` , links: true },
  example: { title: '<example>', summary: 'An **example** of how to use the member, usually with a `<code>` block.', link: `${XMLDOC}#example` },
  code: { title: '<code>', summary: 'A multi-line **code block**.', link: `${XMLDOC}#code` },
  c: { title: '<c>', summary: 'Inline **code** in text: `<c>null</c>`.', link: `${XMLDOC}#c` },
  para: { title: '<para>', summary: 'A **paragraph** break inside `<summary>`/`<remarks>`.', link: `${XMLDOC}#para` },
  see: { title: '<see cref="..."/>', summary: 'An inline **link**: `cref` to a type or member (checked by the compiler), `href` to a URL, or `langword` for a keyword like `null`.', example: '/// Returns <see langword="null"/> if missing. See <see cref="Save"/>.', link: `${XMLDOC}#see` , links: true },
  seealso: { title: '<seealso cref="..."/>', summary: 'Adds an entry to a "See also" section.', link: `${XMLDOC}#seealso` , links: true },
  inheritdoc: { title: '<inheritdoc/>', summary: 'Reuse the documentation of the base member or interface member this one overrides or implements.', link: `${XMLDOC}#inheritdoc` },
  include: { title: '<include file="..." path="..."/>', summary: 'Pulls the documentation from an external XML file.', link: `${XMLDOC}#include` },
  list: { title: '<list type="...">', summary: 'A bulleted, numbered or table **list** (`type="bullet|number|table"`) of `<item>`s.', link: `${XMLDOC}#list` },
  item: { title: '<item>', summary: 'One entry of a `<list>`, with `<term>` and/or `<description>`.', link: `${XMLDOC}#list` },
  term: { title: '<term>', summary: 'The term of a list item.', link: `${XMLDOC}#list` },
  description: { title: '<description>', summary: 'The description of a list item.', link: `${XMLDOC}#list` },
  listheader: { title: '<listheader>', summary: 'The header row of a table `<list>`.', link: `${XMLDOC}#list` },
  br: { title: '<br/>', summary: 'A line break.', link: XMLDOC },
};

export const csharpComments: CommentStyle = {
  kinds: [
    {
      test: /^\/\/\/(?!\/)|^\/\*\*(?![*/])/,
      category: 'doc',
      format: 'xmldoc',
      title: '`///` XML documentation comment',
      summary: 'A **documentation comment** for the member below it, written in XML. IntelliSense shows it in hovers, and with `<GenerateDocumentationFile>` the compiler writes it to an XML file shipped with your library (and warns about mistakes).',
      example: '/// <summary>Adds two numbers.</summary>\n/// <param name="a">The first number.</param>\n/// <returns>The sum.</returns>\npublic int Add(int a, int b) => a + b;',
      link: 'https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/',
    },
    {
      test: /^\/\/\s*ReSharper\s+(disable|restore)/,
      category: 'directive',
      title: 'ReSharper / Rider directive',
      summary: 'Turns a ReSharper/Rider inspection off or on for the following code. The compiler ignores it; for compiler warnings use `#pragma warning disable`.',
    },
    todo,
    lineComment(),
    blockComment('Block comments do not nest. A comment starting with `/**` is an XML doc comment, but `///` is the usual style.', 'https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/lexical-structure#633-comments'),
  ],
  tags: { xmldoc: xmlTags },
  formatNames: FORMAT_NAMES,
};
