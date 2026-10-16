# Changelog

## 0.1.0

First release. Supports Go, Rust, C, C++, C#, JavaScript and TypeScript (including JSX/TSX).

- **Hover explanations** for keywords, every operator and separator, built-ins, literals and declaration names, each with a short explanation, an example and a link to the official docs. The explanation depends on where the token appears, for example `*` as pointer type, dereference or multiplication.
- **Scope highlighting**: the construct a keyword or declaration name belongs to gets a marker-style background, with an outline on its opening keyword and closing bracket. Triggered by the cursor, by hovering, or both.
- **Jump targets**: `return`, `break`, `continue`, `goto`, `throw`, `yield`/`await`, Go's `defer`/`fallthrough` and Rust's `?` also highlight the scope they leave or jump to, in a lighter color. Labelled loops are followed.
- **Comments and doc comments**: hovers say what kind of comment it is (plain, doc comment, directive or `TODO`). Doc comments highlight the declaration they document, doc tags such as `@param`, `\brief` or `<param name="x">` get their own explanation, and parameter names and doc links highlight what they refer to.
- **Bracket explanations** based on where the bracket sits in the syntax tree.
- **Explain This Line** (editor context menu, `Ctrl+Shift+Alt+E` / `Cmd+Shift+Alt+E`): a side panel that explains every part of the current line or selection in reading order.
  - A sentence at the top says what construct the line is, for example "This line starts the `for` statement (lines 38–40)".
  - Plain names say where they are declared, and members say they belong to the value before the `.`. When your language extension has documentation for a name, it is available in a collapsed **IntelliSense documentation** section; bare signatures are left out.
  - String literals are one entry, headed by the literal itself; code inside `${…}` / `{…}` interpolations gets its own entries.
  - With several lines selected, parts inside blocks and `case`/`match` branches opened in the selection are indented under an "inside …" header, with a coloured border per level.
  - Hovering an entry highlights it in the editor, clicking scrolls to it without changing your selection, double-clicking puts the cursor on it, and **Follow cursor** keeps the panel in step as you move.
- Works without a language server, using tree-sitter (WASM), and alongside one in the same hover popup. Edits are parsed incrementally, so only the changed part of a file is re-parsed.
- Settings to turn hovers and highlighting on or off, choose the highlight trigger, set how long a hover-started highlight stays, show or hide jump-target highlights, and pick which comments get explained (`all`, `doc` or `off`). Three commands (Explain This Line and two toggles) and three customizable colors.
