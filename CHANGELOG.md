# Changelog

## 0.1.0

First release. Supports Go, Rust, C, C++, C#, JavaScript and TypeScript (including JSX/TSX).

- **Hover explanations** for keywords, operators, built-ins, literals and declaration names, each with a short explanation, an example and a link to the official docs. The explanation depends on where the token appears, for example `*` as pointer type, dereference or multiplication.
- **Scope highlighting**: the construct a keyword or declaration name belongs to gets a marker-style background, with an outline on its opening keyword and closing bracket. Triggered by the cursor, by hovering, or both.
- **Jump targets**: `return`, `break`, `continue`, `goto`, `throw`, `yield`/`await`, Go's `defer`/`fallthrough` and Rust's `?` also highlight the scope they leave or jump to, in a lighter color. Labelled loops are followed.
- **Comments and doc comments**: hovers say what kind of comment it is (plain, doc comment, directive or `TODO`). Doc comments highlight the declaration they document, doc tags such as `@param`, `\brief` or `<param name="x">` get their own explanation, and parameter names and doc links highlight what they refer to.
- **Bracket explanations** based on where the bracket sits in the syntax tree.
- Works without a language server, using tree-sitter (WASM), and alongside one in the same hover popup.
- Settings to turn hovers and highlighting on or off, choose the highlight trigger, show or hide jump-target highlights, and pick which comments get explained (`all`, `doc` or `off`). Two toggle commands and three customizable colors.
