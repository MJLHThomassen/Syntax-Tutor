# Changelog

## Unreleased

- **Python support**, with the same depth as the other languages:
  - Hovers for every keyword (including the soft keywords `match`, `case`, `type` and `_`), operator and separator, the built-in functions, types, constants and exceptions, and every kind of literal: f-strings and their `{ }` fields, raw, bytes and triple-quoted strings, hex/octal/binary, float and imaginary numbers.
  - The meaning follows the context: `else` on an `if`, a loop or a `try`; `in` in a `for` versus a membership test; `as` in imports, `with`, `except` and patterns; `*` and `**` as arithmetic, unpacking, `*args`/`**kwargs`, starred assignment or the keyword-only marker; `/` as division or the positional-only marker; the many uses of `:`; `@` as decorator or matrix multiplication.
  - Declaration names say what they are: functions, methods (with special methods like `__init__` and `__add__` explained), class and static methods, properties, `self`/`cls`, positional-only and keyword-only parameters, globals and constants, class and instance attributes, loop and comprehension variables, `with`/`except` targets, imports and `match` capture patterns.
  - Scope highlighting for indentation blocks: `def`, `class` (with their decorators), `if`/`elif`/`else` chains, loops, `try`/`except`, `with`, `match`/`case` and comprehensions. Jump targets for `return`, `break`, `continue`, `raise`, `yield` and `await`.
  - **Docstrings** are explained as doc comments and highlight the module, class or function they document. Google (`Args:`), NumPy (`Parameters`) and Sphinx (`:param x:`) styles are recognised, with hovers for their sections, parameter entries (which highlight the parameter), cross-references (`` :func:`name` ``) and doctests (`>>>`).
  - `#` comments: shebang, encoding declarations, `# type:`, `# noqa`, `# pylint:`, `# pragma: no cover`, `# fmt: off`, `#:` attribute docs and `TODO`s.
  - Explain This Line nests the parts of indented blocks like braced ones.
- A trailing comment's hover now quotes the whole line of code before it.
- **Explain This Function** (editor context menu): an outline of the function the cursor is in, in the Explain panel. A summary says what it takes and returns and how many loops and decisions it has; each step is a row in plain words ("If `b == 0`:", "For each `n` in `nums`:", "Returns early with `0, err`"), nested like the code. Hidden exits such as Rust's `?` are pointed out. Hover a step to highlight it, click to scroll there.
- **Operator grouping**: in an expression with several operators, an operator's hover (and its Explain This Line entry) says what it works on and shows the expression with its implicit groups in parentheses. For example, in `a + b * c == d`, `+` combines `a` and `b * c`, and the expression is grouped as `(a + (b * c)) == d`.

## 0.2.0

- **Works in VS Code for the web**: vscode.dev and github.dev (press `.` on a GitHub repository).
- Grammars load the first time a language is needed, instead of all at startup. This makes startup faster, and in the browser only the grammars you use are downloaded.

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
