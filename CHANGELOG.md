# Changelog

## Unreleased

- **Explain This Line** command (editor context menu, `Ctrl+Shift+Alt+E` / `Cmd+Shift+Alt+E`): a side panel that explains every part of the current line or selection in reading order, says what construct the line is, and shows where plain names are declared. Hovering an entry highlights it in the editor, clicking selects it, and **Follow cursor** keeps the panel in step with the cursor.
- Go `range` and Rust `for` loop variables are recognised as declarations.
- Explain This Line also shows the language server's documentation for names and members (the doc string IntelliSense shows on hover) in a collapsed section. Only when there is real documentation: bare signatures are left out.
- Explain This Line shows nesting for multi-line selections: parts inside blocks and `case`/`match` branches opened in the selection are indented under an "inside …" header, with a coloured border per level.
- Explain This Line shows a string literal as one entry headed by the literal itself (not its quotes and text separately), while code inside `${…}` / `{…}` interpolations still gets its own entries.
- Clicking an entry in the Explain panel scrolls to it and highlights it without changing your selection; double-click puts the cursor on it.

## 0.1.0

First release. Supports Go, Rust, C, C++, C#, JavaScript and TypeScript (including JSX/TSX).

- **Hover explanations** for keywords, operators, built-ins, literals and declaration names, each with a short explanation, an example and a link to the official docs. The explanation depends on where the token appears, for example `*` as pointer type, dereference or multiplication.
- **Scope highlighting**: the construct a keyword or declaration name belongs to gets a marker-style background, with an outline on its opening keyword and closing bracket. Triggered by the cursor, by hovering, or both.
- **Jump targets**: `return`, `break`, `continue`, `goto`, `throw`, `yield`/`await`, Go's `defer`/`fallthrough` and Rust's `?` also highlight the scope they leave or jump to, in a lighter color. Labelled loops are followed.
- **Comments and doc comments**: hovers say what kind of comment it is (plain, doc comment, directive or `TODO`). Doc comments highlight the declaration they document, doc tags such as `@param`, `\brief` or `<param name="x">` get their own explanation, and parameter names and doc links highlight what they refer to.
- **Bracket explanations** based on where the bracket sits in the syntax tree.
- Works without a language server, using tree-sitter (WASM), and alongside one in the same hover popup.
- Settings to turn hovers and highlighting on or off, choose the highlight trigger, show or hide jump-target highlights, and pick which comments get explained (`all`, `doc` or `off`). Two toggle commands and three customizable colors.
