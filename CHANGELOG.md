# Changelog

## Unreleased

- **HTML support**:
  - Hovers for over 110 elements (document structure, sections, text, inline text, media, tables, forms, interactive elements, `<template>`, `<slot>`), each with an example and an MDN link. Void elements say they have no end tag; custom elements (`<my-widget>`), SVG/MathML elements, obsolete and unknown elements get their own explanation.
  - Hovers for global, ARIA, `data-*` and event handler (`onclick`) attributes and the element-specific ones, with meanings that follow the element: `type` on `<input>`, `<button>` or `<script>`, `name` on a form control or a `<meta>`, `value` on an `<input>` or `<option>`. Boolean attributes say so, and an attribute on an element it doesn't apply to gets a warning.
  - Attribute values are explained too: input types, `target="_blank"`, every `rel` keyword, `method`, `loading`, ids and class names, URLs (`#fragment`, `mailto:`, relative or absolute). Values that refer to another element (`for="email"`, `href="#menu"`, `aria-describedby`) point to it and highlight it.
  - Character references (`&amp;`, `&nbsp;`, `&#169;`, `&#x1F600;`) show the character they stand for. The doctype, start, end and self-closing tags (`<div/>` doesn't close a `<div>`!), stray end tags and `<!-- -->` comments (with `TODO`s and `<!-- prettier-ignore -->`) are explained.
  - A tag name highlights its whole element and outlines its start and end tags; an attribute highlights itself.
  - Explain This Line says which element a line starts ("This line starts the `<section>` element (lines 33–40)"), explains an end tag or the doctype as one part, and nests the content of elements opened in the selected lines.
  - The contents of `<script>` and `<style>` are not explained yet.
- Hovering the first character of a token right after an empty node (such as `</script>` after an empty script) now works.
- **CSS support**:
  - Hovers for about 240 properties (box model, flexbox, grid, typography, colors and backgrounds, borders and shadows, transforms, transitions and animations, logical properties, container queries, ...) with an example and an MDN link; inherited properties and vendor prefixes (`-webkit-...`) are pointed out, and so are unknown (misspelled) properties.
  - Values are explained for the property they belong to (`flex` in `display: flex`, `linear` in `animation`), including the global keywords (`inherit`, `initial`, `unset`, `revert`), the 148 named colors, hex colors (`#3366ff` is `rgb(51 102 255)`), color channels in `rgb()`/`hsl()`/`oklch()`, and numbers with units: `1.5rem` is "1.5 × the root font size: 24px with the default 16px", and a percentage says what it is a percentage of.
  - About 80 functions (`calc()`, `var()`, `clamp()`, `min()`/`max()`, colors, gradients, `repeat()`/`minmax()`, transforms, filters, ...). In `calc()`, operator grouping follows CSS's precedence; a `/` that separates values (`aspect-ratio: 16 / 9`, `rgb(0 0 0 / 50%)`) is explained as such.
  - Selectors: type, class, id, universal and attribute selectors (with every match operator), combinators (with what the selector matches, read in plain words), about 55 pseudo-classes and 15 pseudo-elements, the nesting selector `&`, and the **specificity** of the selector.
  - At-rules (`@media`, `@import`, `@font-face`, `@keyframes`, `@supports`, `@layer`, `@container`, `@property`, `@page`, `@scope`, ...), media types and features, keyframe selectors, and the at-rules of Sass and Tailwind (which aren't CSS).
  - Scopes: a selector highlights its rule, a property its declaration, an at-rule keyword the whole at-rule. Custom properties and `@keyframes` names say where they are declared and used, and `var(--x)` or an animation name highlights the declaration.
  - Comments: `/* */`, `/*! */` (kept by minifiers), Stylelint, Prettier and Autoprefixer directives, source maps, and a warning for `//`, which isn't a comment in CSS.
  - Works on stylesheets embedded in other files too (parsed with included ranges): `Parsers.parse` takes optional `includedRanges`.
- Explain This Line can name constructs per language (`LanguageSpec.nodeLabel`): "This line is the `display` declaration", "This line starts the `@media` rule".

## 0.3.0

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
