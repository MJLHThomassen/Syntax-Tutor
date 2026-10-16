# Syntax Tutor

A VS Code extension for learning a programming language by reading code. Supports **Go**, **Rust**, **C**, **C++**, **C#**, **JavaScript** and **TypeScript** (including JSX/TSX).

- **Hover explanations.** Hover a keyword, operator, built-in, literal or declaration name to see what it means. You get a short explanation, an example and a link to the official docs. The same token gets a different explanation depending on where it appears: `*` in `*int` (pointer type), `*p` (dereference) and `a * b`, or `<-` as send, receive or channel direction.
- **Scope highlighting.** Put the cursor on (or hover) a keyword or a declaration name. The construct it belongs to gets a marker-style background, and the opening keyword and closing bracket get an outline. For example, `func`, `fn` or a function's name highlights the whole function, `else` highlights the whole `if`/`else` chain, and `range` highlights its `for` loop.
- **Jump targets.** For `return`, `break`, `continue`, `goto`, `throw`, `yield`/`await` and language-specific jumps (Go's `defer`/`fallthrough`, Rust's `?`), the scope they leave or jump to gets a second, lighter highlight. Labelled loops are followed, and the hover tells you where the jump goes.

- **Comments and doc comments.** Hovering a comment says what kind it is: plain, doc comment (JSDoc/TSDoc, Doxygen, C# XML doc, rustdoc `///`/`//!`, Go doc comments), a directive (`//go:build`, `// @ts-expect-error`, `/// <reference>`, `// NOLINT`, ESLint, ...) or a `TODO`. The whole comment block is highlighted, and a doc comment also lightly highlights the declaration it documents. Doc tags get their own explanation: `@param`, `\brief`, `<summary>`, `<param name="x">`, Rust `# Examples` / doc tests, Go `Deprecated:`. A tag that names a parameter highlights that parameter, and doc links (`{@link foo}`, `[Name]`, `<see cref="..."/>`) highlight the linked declaration.

Parsing uses [tree-sitter](https://tree-sitter.github.io/) (WASM build), so it works without a language server (gopls, rust-analyzer, clangd, ...). It also works next to them: VS Code shows all hovers in one popup, and the Syntax Tutor part starts with **🎓 *Syntax Tutor***.

## Try it

```bash
npm install
npm run build
```

Open this folder in VS Code and press **F5** (the "Run Extension" launch config). A new window opens on `samples/`. Open one of the `tour.*` files and start hovering. `samples/comments/` has a file per language that shows the comment and doc-comment features.

To install it in your normal VS Code:

```bash
npm run package
code --install-extension syntax-tutor-0.1.0.vsix
```

## Settings

| Setting | Default | |
|---|---|---|
| `syntaxTutor.hover.enabled` | `true` | Show hover explanations |
| `syntaxTutor.scopeHighlight.enabled` | `true` | Highlight scopes |
| `syntaxTutor.scopeHighlight.trigger` | `both` | `cursor`, `hover` or `both` |
| `syntaxTutor.scopeHighlight.showRelated` | `true` | Lighter highlight for jump targets and documented declarations |
| `syntaxTutor.comments` | `all` | `all`, `doc` (skip plain comments) or `off` |

Commands: **Syntax Tutor: Toggle Hover Explanations** and **Syntax Tutor: Toggle Scope Highlighting**.

You can change the colors in `settings.json`:

```json
"workbench.colorCustomizations": {
  "syntaxTutor.scopeBackground": "#ffd70030",
  "syntaxTutor.relatedScopeBackground": "#4fc1ff18",
  "syntaxTutor.scopeBorder": "#ffd70090"
}
```

A highlight started by hovering stays until you hover something else or move the cursor, because VS Code doesn't report when the mouse leaves a hover.

## How it works

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

### Adding a language

1. Add the grammar package (it should ship a `.wasm` file) and copy the file in `scripts/build.mjs`.
2. Write `src/docs/<lang>.ts`, exporting a `LanguageSpec` (`languageIds` lists the VS Code language ids it handles).
3. Add it to `ALL_SPECS` in `src/extension.ts`, and add `onLanguage:<id>` to `activationEvents`.
4. Add `samples/tour.<ext>` and `test/<lang>.test.mjs`. `node scripts/build.mjs --lang <lang>` rebuilds just that language's test bundle.

## Tests

```bash
npm test             # analyzer tests per language against samples/ (node:test)
npm run test:vscode  # runs the extension in an isolated VS Code instance
```
