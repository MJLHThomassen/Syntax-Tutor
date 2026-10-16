# Syntax Tutor

Learn a programming language while you read code. Hover over a keyword, operator or built-in to see what it means, and see at a glance which block of code it belongs to.

Supports **Go**, **Rust**, **C**, **C++**, **C#**, **JavaScript** and **TypeScript** (including JSX/TSX).

## Features

- **Hover explanations.** Hover a keyword, operator, built-in, literal or declaration name to see what it means. You get a short explanation, an example and a link to the official docs. The same token gets a different explanation depending on where it appears: `*` in `*int` (pointer type), `*p` (dereference) and `a * b`, or `<-` as send, receive or channel direction.
- **Scope highlighting.** Put the cursor on (or hover) a keyword or a declaration name. The construct it belongs to gets a marker-style background, and the opening keyword and closing bracket get an outline. For example, `func`, `fn` or a function's name highlights the whole function, `else` highlights the whole `if`/`else` chain, and `range` highlights its `for` loop.
- **Jump targets.** For `return`, `break`, `continue`, `goto`, `throw`, `yield`/`await` and language-specific jumps (Go's `defer`/`fallthrough`, Rust's `?`), the scope they leave or jump to gets a second, lighter highlight. Labelled loops are followed, and the hover tells you where the jump goes.
- **Comments and doc comments.** Hovering a comment says what kind it is: plain, doc comment (JSDoc/TSDoc, Doxygen, C# XML doc, rustdoc `///`/`//!`, Go doc comments), a directive (`//go:build`, `// @ts-expect-error`, `/// <reference>`, `// NOLINT`, ESLint, ...) or a `TODO`. The whole comment block is highlighted, and a doc comment also lightly highlights the declaration it documents. Doc tags get their own explanation: `@param`, `\brief`, `<summary>`, `<param name="x">`, Rust `# Examples` / doc tests, Go `Deprecated:`. A tag that names a parameter highlights that parameter, and doc links (`{@link foo}`, `[Name]`, `<see cref="..."/>`) highlight the linked declaration.
- **Explain This Line.** Right-click a line (or select several) and choose **Syntax Tutor: Explain This Line**, or press `Ctrl+Shift+Alt+E` (`Cmd+Shift+Alt+E` on Mac). A side panel explains every part of the line in reading order: keywords, operators and brackets get their explanation, and plain names say where they are declared ("declared on line 12 as a parameter"). When your language extension (TypeScript, gopls, rust-analyzer, C#, C/C++) has documentation for a name or member, the entry gets a collapsed **IntelliSense documentation** section with that doc string; bare signatures like `(local variable) Guid userId` are left out. A sentence at the top says what the line is, for example "This line starts the `for` statement (lines 38–40)". With several lines selected, parts inside a block or branch opened in those lines are indented under a small "inside the body of the `if` statement" header, with a coloured border per nesting level. Hover an entry to highlight it in the editor, click it to scroll there (your selection stays), double-click to put the cursor on it, and turn on **Follow cursor** to keep the panel in step as you move through the code.

Syntax Tutor parses code with [tree-sitter](https://tree-sitter.github.io/), so it needs no language server (gopls, rust-analyzer, clangd, ...). If you do use one, both hovers appear in the same popup, and the Syntax Tutor part starts with **🎓 *Syntax Tutor***.

<!--
## Screenshots

TODO: add screenshots or GIFs before publishing, then remove this comment.

How to capture them:
1. Run `npm run build`, open this folder in VS Code and press F5. The window that opens shows `samples/`.
2. Pick a clean theme and a larger font (for example "editor.fontSize": 16), and hide the minimap and sidebar.
3. Capture these, in this order:
   - hover.png: the hover popup on `*` in `samples/tour.go` (or on `?` in `samples/tour.rs`).
   - scope.gif: move the cursor over `func`, `else` and `range` in `samples/tour.go` to show the scope highlight.
   - jump.png: the cursor on `return` or `break`, showing the lighter jump-target highlight.
   - doc-comment.png: hovering `@param` in `samples/comments/comments.ts`.
   On macOS, Cmd+Shift+4 takes a screenshot and Cmd+Shift+5 records the screen. Turn a recording into a GIF with
   Kap (https://getkap.co) or `ffmpeg -i in.mov -vf "fps=12,scale=900:-1" scope.gif`. Keep GIFs under about 5 MB.
4. Save them in `images/` and add `!images/*.png` and `!images/*.gif` to .vscodeignore.
5. The Marketplace needs absolute https image URLs. Relative paths only work once package.json has a `repository` field
   (vsce then rewrites them). Without one, use full URLs to wherever the images are hosted. Then replace this comment
   with a "## Screenshots" heading and one Markdown image line per file. (No image syntax in this comment:
   vsce checks image links even inside comments and refuses to package.)
-->

## Settings

| Setting | Default | |
|---|---|---|
| `syntaxTutor.hover.enabled` | `true` | Show hover explanations |
| `syntaxTutor.scopeHighlight.enabled` | `true` | Highlight scopes |
| `syntaxTutor.scopeHighlight.trigger` | `both` | `cursor`, `hover` or `both` |
| `syntaxTutor.scopeHighlight.showRelated` | `true` | Lighter highlight for jump targets and documented declarations |
| `syntaxTutor.comments` | `all` | `all`, `doc` (skip plain comments) or `off` |

Commands: **Syntax Tutor: Explain This Line**, **Syntax Tutor: Toggle Hover Explanations** and **Syntax Tutor: Toggle Scope Highlighting**.

You can change the colors in `settings.json`:

```json
"workbench.colorCustomizations": {
  "syntaxTutor.scopeBackground": "#ffd70030",
  "syntaxTutor.relatedScopeBackground": "#4fc1ff18",
  "syntaxTutor.scopeBorder": "#ffd70090"
}
```

A highlight started by hovering stays until you hover something else or move the cursor, because VS Code doesn't report when the mouse leaves a hover.

## Development

The sections below are for working on the extension itself.

### Run from source

```bash
npm install
npm run build
```

Open this folder in VS Code and press **F5** (the "Run Extension" launch config). A new window opens on `samples/`. Open one of the `tour.*` files and start hovering. `samples/comments/` has a file per language that shows the comment and doc-comment features.

To build a `.vsix` and install it in your normal VS Code:

```bash
npm run package
code --install-extension syntax-tutor-0.1.0.vsix
```

### How it works

| File | What it does |
|---|---|
| `src/docs/<language>.ts` | Everything language-specific: the doc tables, what identifiers mean in context (`role`), and where jumps go (`jumpTarget`) |
| `src/core/analyzer.ts` | Finds the token under the cursor, picks its doc entry, and works out its scope |
| `src/core/comments.ts`, `src/docs/comments.ts` | Comment blocks, doc comments and their tags; the comment kinds and tag docs per language |
| `src/core/brackets.ts` | Explains brackets from their place in the syntax tree |
| `src/core/parser.ts` | Loads the tree-sitter grammars |
| `src/extension.ts` | VS Code wiring: hover provider, decorations, settings |

Doc entries are looked up from most to least specific:

1. `"<parent node type>/<token>"`, for example `"pointer_type/*"`
2. `"<token>"`, for example `"func"`
3. `"#<node type>"`, for literals such as `"#raw_string_literal"`

To find the node type names for a construct, paste some code into the playground on [tree-sitter.github.io](https://tree-sitter.github.io/tree-sitter/), or print `tree.rootNode.toString()`.

#### Adding a language

1. Add the grammar package (it should ship a `.wasm` file) and copy the file in `scripts/build.mjs`.
2. Write `src/docs/<lang>.ts`, exporting a `LanguageSpec` (`languageIds` lists the VS Code language ids it handles).
3. Add it to `ALL_SPECS` in `src/extension.ts`, and add `onLanguage:<id>` to `activationEvents`.
4. Add `samples/tour.<ext>` and `test/<lang>.test.mjs`. `node scripts/build.mjs --lang <lang>` rebuilds just that language's test bundle.

### Tests

```bash
npm test             # analyzer tests per language against samples/ (node:test)
npm run test:vscode  # runs the extension in an isolated VS Code instance
```
