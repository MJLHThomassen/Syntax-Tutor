import type { Node } from 'web-tree-sitter';
import type { DocEntry, DocTable, JumpTarget, LanguageSpec, Role } from '../core/model';
import { ancestor } from '../core/nodes';
import { cssComments } from './comments';
import {
  ATTRIBUTES,
  AT_RULES,
  COMMON_KEYWORDS,
  CONTAINER_FEATURES,
  ELEMENTS,
  FUNCTIONS,
  GLOBAL_KEYWORDS,
  INHERITED,
  MDN,
  MEDIA_FEATURES,
  MEDIA_TYPES,
  NAMED_COLORS,
  PROPERTIES,
  PSEUDO_CLASSES,
  PSEUDO_ELEMENTS,
  SYSTEM_COLORS,
  TOOL_AT_RULES,
  UNITS,
  VALUE_GROUPS,
  type Prop,
} from './css-data';

/**
 * CSS. Stylesheets are made of rule sets (selectors + a block of declarations) and
 * at-rules. Property names, values, selectors' names and media features are all
 * identifiers here: names a user picks (classes, ids, custom properties, keyframes,
 * layers) get roles, and the built-in ones get docs through `identifierDoc`, which
 * look at the context (`flex` as a property or as a `display` value).
 *
 * Works on a stylesheet embedded in an HTML or Vue file too (parsed with included
 * ranges): nothing assumes the stylesheet starts at the top of the file.
 */

const mdn = (page: string) => `${MDN}/${page}`;
const code = (s: string) => (s.includes('`') ? `\`\` ${s} \`\`` : `\`${s}\``);
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();
const shorten = (s: string, max = 50) => {
  const t = oneLine(s);
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};
const lines = (rows: number[]) => {
  const ns = [...new Set(rows.map((r) => r + 1))];
  if (ns.length === 1) return `line ${ns[0]}`;
  return `lines ${ns.slice(0, -1).join(', ')} and ${ns.at(-1)}`;
};

/** The top of the tree: the stylesheet, which may start in the middle of an HTML file. */
function rootOf(n: Node): Node {
  let r = n;
  while (r.parent) r = r.parent;
  return r;
}

/** All descendants of `root` of the given types, in document order. */
function all(root: Node, ...types: string[]): Node[] {
  return root.descendantsOfType(types).filter((n): n is Node => !!n);
}

// ------------------------------------------------------------ static docs

const SELECTOR = (page: string) => mdn(page);

const docs: DocTable = {
  // At-rules spelled as their own tokens by the grammar (the others are `at_keyword`s, see docFor).
  ...Object.fromEntries(
    ['@media', '@import', '@charset', '@keyframes', '@namespace', '@supports', '@scope'].map((k) => [
      k,
      { kind: 'keyword', label: 'at-rule', summary: AT_RULES[k].summary, details: AT_RULES[k].details, example: AT_RULES[k].example, link: mdn(k) } satisfies DocEntry,
    ]),
  ),

  // ---------------------------------------------------------------- selectors
  'class_selector/.': {
    kind: 'syntax',
    title: '.name (class selector)',
    label: 'selector',
    summary: 'A **class selector**: `.card` matches every element whose `class` attribute contains the word `card`, like `<div class="card big">`. Specificity (0, 1, 0).',
    details: 'Classes are the usual way to style things: reusable and easy to override. `.a.b` (no space) needs both classes on the same element.',
    example: '.card { padding: 1rem; }\n.button.primary { background: royalblue; }',
    link: SELECTOR('Class_selectors'),
  },
  'id_selector/#': {
    kind: 'syntax',
    title: '#name (ID selector)',
    label: 'selector',
    summary: 'An **ID selector**: `#main` matches the element with `id="main"` (ids are meant to be unique on the page). Specificity (1, 0, 0): it beats any number of classes, which makes it hard to override.',
    example: '#main { max-width: 60rem; }',
    link: SELECTOR('ID_selectors'),
  },
  'universal_selector/*': {
    kind: 'syntax',
    title: '* (universal selector)',
    label: 'selector',
    summary: 'The **universal selector**: matches **every** element. Specificity (0, 0, 0). Often used in resets like `*, *::before, *::after { box-sizing: border-box; }`.',
    example: '* { margin: 0; }\n.card > * + * { margin-top: 1rem; }',
    link: SELECTOR('Universal_selectors'),
  },
  'child_selector/>': {
    kind: 'operator',
    title: 'A > B (child combinator)',
    label: 'combinator',
    summary: 'The **child combinator**: `A > B` matches `B` elements that are **direct children** of an `A` (not grandchildren). Without the `>`, a space would match descendants at any depth.',
    example: 'ul > li { list-style: square; }   /* only the top-level items */',
    link: SELECTOR('Child_combinator'),
  },
  'adjacent_sibling_selector/+': {
    kind: 'operator',
    title: 'A + B (next-sibling combinator)',
    label: 'combinator',
    summary: 'The **next-sibling combinator**: `A + B` matches a `B` that comes **right after** an `A`, with the same parent.',
    example: 'h2 + p { margin-top: 0; }   /* the paragraph right after a heading */\nli + li { border-top: 1px solid #eee; } /* every item but the first */',
    link: SELECTOR('Next-sibling_combinator'),
  },
  'sibling_selector/~': {
    kind: 'operator',
    title: 'A ~ B (subsequent-sibling combinator)',
    label: 'combinator',
    summary: 'The **subsequent-sibling combinator**: `A ~ B` matches every `B` that comes **after** an `A` (not necessarily right after), with the same parent.',
    example: 'input:checked ~ .details { display: block; }',
    link: SELECTOR('Subsequent-sibling_combinator'),
  },
  'pseudo_class_selector/:': {
    kind: 'syntax',
    title: ':name (pseudo-class)',
    label: 'selector',
    summary: 'Starts a **pseudo-class**: a condition on the element\'s state or position that HTML alone can\'t express, like `:hover`, `:focus` or `:first-child`. Specificity (0, 1, 0), like a class.',
    example: 'a:hover { color: red; }\nli:nth-child(odd) { background: #f6f6f6; }',
    link: mdn('Pseudo-classes'),
  },
  'pseudo_element_selector/::': {
    kind: 'syntax',
    title: '::name (pseudo-element)',
    label: 'selector',
    summary: 'Selects a **pseudo-element**: a part of the element that isn\'t a real HTML element, such as `::before`, `::after`, `::placeholder` or `::first-line`. Specificity (0, 0, 1).',
    example: '.quote::before { content: "“"; }',
    link: mdn('Pseudo-elements'),
  },
  'namespace_selector/|': {
    kind: 'syntax',
    title: 'ns|name (namespace separator)',
    label: 'selector',
    summary: 'Separates a **namespace prefix** (declared with `@namespace`) from the element name: `svg|a` matches `<a>` elements in the SVG namespace only. `*|a` matches any namespace.',
    link: SELECTOR('Namespace_separator'),
  },
  'attribute_selector/[': {
    kind: 'syntax',
    title: '[attr] (attribute selector)',
    label: 'selector',
    summary: 'An **attribute selector**: matches elements by their HTML attributes. `[disabled]` checks that the attribute is there; with an operator and a value it compares the value. Specificity (0, 1, 0).',
    example: 'a[target="_blank"]::after { content: " ↗"; }\ninput[type="checkbox"] { accent-color: teal; }',
    link: SELECTOR('Attribute_selectors'),
  },
  'attribute_selector/]': {
    kind: 'syntax',
    title: '[attr] (attribute selector)',
    label: 'selector',
    summary: 'Ends an **attribute selector**.',
    link: SELECTOR('Attribute_selectors'),
  },
  'attribute_selector/=': { kind: 'operator', title: '[attr=value]', label: 'attribute operator', summary: 'Matches when the attribute\'s value is **exactly** `value`.', example: 'input[type="email"] { ... }', link: SELECTOR('Attribute_selectors') },
  'attribute_selector/~=': { kind: 'operator', title: '[attr~=value]', label: 'attribute operator', summary: 'Matches when the attribute is a space-separated list of words and **one of the words** is exactly `value` (how `.class` works for `class`).', example: '[data-tags~="new"] { ... }', link: SELECTOR('Attribute_selectors') },
  'attribute_selector/|=': { kind: 'operator', title: '[attr|=value]', label: 'attribute operator', summary: 'Matches when the value is exactly `value` or **starts with `value-`**: made for language codes, `[lang|="en"]` matches `en` and `en-US`.', example: '[lang|="en"] { quotes: "“" "”"; }', link: SELECTOR('Attribute_selectors') },
  'attribute_selector/^=': { kind: 'operator', title: '[attr^=value]', label: 'attribute operator', summary: 'Matches when the value **starts with** `value`.', example: 'a[href^="https://"] { ... }', link: SELECTOR('Attribute_selectors') },
  'attribute_selector/$=': { kind: 'operator', title: '[attr$=value]', label: 'attribute operator', summary: 'Matches when the value **ends with** `value`.', example: 'a[href$=".pdf"]::after { content: " (PDF)"; }', link: SELECTOR('Attribute_selectors') },
  'attribute_selector/*=': { kind: 'operator', title: '[attr*=value]', label: 'attribute operator', summary: 'Matches when the value **contains** `value` anywhere.', example: 'a[href*="example.com"] { ... }', link: SELECTOR('Attribute_selectors') },
  'selectors/,': {
    kind: 'syntax',
    title: 'A, B (selector list)',
    label: 'selector list',
    summary: 'A **selector list**: the rule applies to elements matching **any** of the selectors. Each selector keeps its own specificity.',
    details: 'Gotcha: if one selector in the list is invalid (or unknown to the browser), the **whole rule** is dropped. `:is(A, B)` is forgiving instead.',
    example: 'h1, h2, h3 { line-height: 1.2; }',
    link: SELECTOR('Selector_list'),
  },
  '#nesting_selector': {
    kind: 'keyword',
    title: '& (nesting selector)',
    label: 'selector',
    summary: 'The **nesting selector**: inside a nested rule, `&` stands for the selector of the **parent rule**. `&:hover` is the parent itself when hovered; `& .child` is a descendant of it; `.dark &` is the parent inside `.dark`.',
    details: 'Native CSS nesting works in all current browsers. Without `&`, a nested selector is a descendant of the parent (`.card { .title {} }` is `.card .title`).',
    example: '.button {\n  color: white;\n  &:hover { color: gold; }\n  & + & { margin-left: 8px; }\n}',
    link: SELECTOR('Nesting_selector'),
  },
  'arguments/of': { kind: 'keyword', title: ':nth-child(An+B of S)', label: 'keyword', summary: 'In `:nth-child()`: count only the siblings that match the selector after `of`. `:nth-child(2 of .item)` is the second `.item` among its siblings.', link: mdn(':nth-child') },
  'selector_query/selector': { kind: 'keyword', title: 'selector()', label: 'feature query', summary: 'In `@supports`: tests whether the browser understands the **selector** inside, e.g. `selector(:has(a))`, so you can use new selectors with a fallback.', example: '@supports selector(:has(a)) {\n  .card:has(img) { padding: 0; }\n}', link: mdn('@supports') },

  // ---------------------------------------------------------------- declarations
  'declaration/:': {
    kind: 'syntax',
    title: 'property: value',
    label: 'syntax',
    summary: 'Separates the **property** from its **value** in a declaration. Each declaration ends with `;`.',
    details: 'A declaration the browser doesn\'t understand (a typo, an invalid value) is **silently ignored**, and the rest of the rule still applies: devtools show it struck through.',
    example: 'color: red;',
    link: mdn('Syntax'),
  },
  ';': {
    kind: 'syntax',
    title: '; (semicolon)',
    summary: 'Ends a **declaration** (or a statement such as `@import`). It may be left out after the last declaration of a block, but always writing it avoids mistakes when you add a line.',
    example: '.a {\n  color: red;\n  margin: 0;\n}',
    link: mdn('Syntax'),
  },
  ',': {
    kind: 'syntax',
    title: ', (comma)',
    summary: 'Separates the items of a list.',
    link: mdn('Syntax'),
  },
  'declaration/,': {
    kind: 'syntax',
    title: ', (value list)',
    summary: 'Separates the items of a **comma-separated value list**: fallback fonts in `font-family`, several backgrounds, shadows, transitions or animations. Each item is a complete value.',
    example: 'font-family: Inter, system-ui, sans-serif;\ntransition: opacity 0.2s, transform 0.2s;',
    link: mdn('Value_definition_syntax'),
  },
  'arguments/,': { kind: 'syntax', title: ', (arguments)', summary: 'Separates the **arguments** of a function, or the selectors in `:is()`, `:where()`, `:not()` and `:has()`.', link: mdn('Syntax') },
  'media_statement/,': { kind: 'syntax', title: ', (media query list)', summary: 'Separates media queries: the rule applies when **any** of them matches (a comma means *or*).', example: '@media print, (max-width: 600px) { ... }', link: mdn('@media') },
  'import_statement/,': { kind: 'syntax', title: ', (media query list)', summary: 'Separates media queries: the import applies when any of them matches.', link: mdn('@import') },
  'at_rule/,': { kind: 'syntax', title: ', (list)', summary: 'Separates the items of a list, e.g. the layer names in `@layer reset, base, components;` (which fixes their order).', link: mdn('@layer') },
  '#important': {
    kind: 'keyword',
    title: '!important',
    label: 'flag',
    summary: 'Makes this declaration win over **all normal declarations** for the property, regardless of specificity and order. Only another `!important` declaration can override it.',
    details: 'Use it sparingly: it escalates ("then I need another `!important`"). Fix the specificity or use `@layer` instead. It is fine for utility classes and to override third-party inline styles.',
    example: '.hidden { display: none !important; }',
    link: mdn('important'),
  },

  // ---------------------------------------------------------------- math
  'binary_expression/+': { kind: 'operator', title: '+ (addition)', label: 'math operator', summary: 'Adds two values in `calc()` (and the other math functions). The units may differ: `calc(100% + 2rem)`. Spaces around `+` are **required**: `1rem+2px` is invalid.', link: mdn('calc') },
  'binary_expression/-': { kind: 'operator', title: '- (subtraction)', label: 'math operator', summary: 'Subtracts in `calc()`. The units may differ: `calc(100% - 2rem)`. Spaces around `-` are **required**: without them, `100%-2rem` reads as a single (invalid) value.', link: mdn('calc') },
  'binary_expression/*': { kind: 'operator', title: '* (multiplication)', label: 'math operator', summary: 'Multiplies in `calc()`. At least one side must be a plain number: `calc(2 * var(--gap))`.', link: mdn('calc') },
  'binary_expression//': { kind: 'operator', title: '/ (division)', label: 'math operator', summary: 'Divides in `calc()`. The right side must be a plain number (not zero): `calc(100% / 3)`.', link: mdn('calc') },
  'parenthesized_value/(': { kind: 'syntax', title: '( ) (grouping)', summary: 'Parentheses inside `calc()` **group** a part of the calculation, so it is done first.', example: 'width: calc((100% - 2rem) / 3);', link: mdn('calc') },
  'parenthesized_value/)': { kind: 'syntax', title: '( ) (grouping)', summary: 'Ends a group in a calculation.', link: mdn('calc') },

  // ---------------------------------------------------------------- at-rule parts
  'feature_query/:': { kind: 'syntax', title: '(feature: value)', label: 'syntax', summary: 'Separates a media feature (or, in `@supports`, a property) from the value it is tested against.', link: mdn('@media') },
  'keyframe_block/from': { kind: 'keyword', title: 'from (keyframe)', label: 'keyframe selector', summary: 'The **start** of the animation: the same as `0%`.', example: '@keyframes grow {\n  from { transform: scale(0); }\n  to { transform: scale(1); }\n}', link: mdn('@keyframes') },
  'to/to': { kind: 'keyword', title: 'to (keyframe)', label: 'keyframe selector', summary: 'The **end** of the animation: the same as `100%`.', example: '@keyframes fade {\n  to { opacity: 0; }\n}', link: mdn('@keyframes') },
  'scope_statement/to': { kind: 'keyword', title: '@scope (...) to (...)', label: 'keyword', summary: 'The **lower boundary** of the scope: elements inside it are left out. A "donut" scope: style a component without reaching into the components nested inside it.', link: mdn('@scope') },
  '#escape_sequence': {
    kind: 'literal',
    title: '\\ (escape)',
    label: 'escape',
    summary: 'A backslash escape: `\\` followed by up to six **hexadecimal digits** is that Unicode character (`\\201C` is “, `\\A` a line break in `content`); `\\` before any other character takes it literally (`\\"`). A space after the hex digits ends the escape.',
    example: 'content: "\\201C";\n.sm\\:hidden { display: none; }  /* class "sm:hidden" */',
    link: mdn('string#escaping_characters'),
  },
};

// ------------------------------------------------------------ helpers

const STATEMENTS = new Set(['media_statement', 'import_statement', 'charset_statement', 'namespace_statement', 'keyframes_statement', 'supports_statement', 'scope_statement', 'at_rule', 'postcss_statement']);

const SELECTOR_TYPES = new Set([
  'class_selector', 'id_selector', 'attribute_selector', 'pseudo_class_selector', 'pseudo_element_selector', 'descendant_selector', 'child_selector',
  'sibling_selector', 'adjacent_sibling_selector', 'namespace_selector', 'universal_selector', 'nesting_selector', 'tag_name',
]);

/** The at-keyword of an at-rule statement (`@media`, `@font-face`, ...). */
function atKeyword(statement: Node | null | undefined): string | undefined {
  if (!statement || !STATEMENTS.has(statement.type)) return undefined;
  const first = statement.child(0);
  return first && first.text.startsWith('@') ? first.text.toLowerCase() : undefined;
}

/** The at-rule (keyword) a node is inside, if any: the nearest one. */
function insideAt(node: Node): string | undefined {
  return atKeyword(ancestor(node, (n) => STATEMENTS.has(n.type)));
}

const VENDOR = /^-(webkit|moz|ms|o)-/;
const VENDOR_NAMES: Record<string, string> = { webkit: 'Chrome, Safari and Edge', moz: 'Firefox', ms: 'old Internet Explorer and Edge', o: 'old Opera' };
const vendorNote = (name: string) => {
  const m = name.match(VENDOR);
  return m ? `The \`-${m[1]}-\` prefix makes it a **vendor-prefixed** name: an experimental or older version for ${VENDOR_NAMES[m[1]]}. Write the standard name too (after it), or let a tool like Autoprefixer add prefixes.` : '';
};

/** The declaration's property a value belongs to, lowercased, without vendor prefix. */
function propertyOf(node: Node): string | undefined {
  const decl = node.type === 'declaration' ? node : ancestor(node, (n) => n.type === 'declaration', (n) => n.type === 'block');
  const name = decl?.firstNamedChild;
  return name?.type === 'property_name' ? name.text.toLowerCase().replace(VENDOR, '') : undefined;
}

/** The function call a value is an argument of, lowercased: `calc`, `rgb`, ... */
function functionOf(node: Node): { name: string; call: Node; args: Node } | undefined {
  const args = ancestor(node, (n) => n.type === 'arguments', (n) => n.type === 'declaration' || n.type === 'block');
  const call = args?.parent;
  if (!args || call?.type !== 'call_expression') return undefined;
  return { name: (call.firstNamedChild?.text ?? '').toLowerCase().replace(VENDOR, ''), call, args };
}

const MATH = new Set(['calc', 'min', 'max', 'clamp', 'round', 'mod', 'rem', 'abs', 'sign', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'pow', 'sqrt', 'hypot', 'log', 'exp', 'calc-size']);

/** Whether a `binary_expression` is math (inside `calc()` and friends) rather than a `/`-separated value. */
function isMath(expr: Node): boolean {
  const fn = functionOf(expr);
  return !!fn && MATH.has(fn.name);
}

const PROPERTY_PAGE = (name: string, prop?: Prop) => mdn(prop?.page ?? name);

// ------------------------------------------------------------ calc() precedence

/**
 * tree-sitter-css parses math left to right without precedence: `100% - 2 * var(--gap)`
 * comes out as `(100% - 2) * var(--gap)`. CSS (like ordinary math) does `*` and `/`
 * first, so the grouping is rebuilt here from the flat list of operands and operators.
 */
interface Term {
  text: string;
  op?: string;
  /** Index of the operator in source order. */
  index?: number;
  left?: Term;
  right?: Term;
}

const isMulDiv = (op: string) => op === '*' || op === '/';
const operatorOf = (expr: Node) => expr.children.find((c) => !!c && !c.isNamed && /^[-+*/]$/.test(c.text));

/** The outermost of directly nested math expressions. */
function mathRoot(expr: Node): Node {
  let r = expr;
  while (r.parent?.type === 'binary_expression') r = r.parent;
  return r;
}

function flatten(expr: Node, operands: string[], ops: Node[]): void {
  for (let i = 0; i < expr.childCount; i++) {
    const c = expr.child(i)!;
    if (c.type === 'binary_expression') flatten(c, operands, ops);
    else if (c.isNamed) {
      if (!c.type.includes('comment')) operands.push(oneLine(c.text));
    } else ops.push(c);
  }
}

function buildTerm(operands: string[], ops: string[]): Term {
  const terms: Term[] = [{ text: operands[0] }];
  const sums: { op: string; index: number }[] = [];
  ops.forEach((op, i) => {
    const right: Term = { text: operands[i + 1] ?? '' };
    if (isMulDiv(op)) {
      const left = terms.pop()!;
      terms.push({ text: '', op, index: i, left, right });
    } else {
      sums.push({ op, index: i });
      terms.push(right);
    }
  });
  let t = terms[0];
  sums.forEach((s, j) => (t = { text: '', op: s.op, index: s.index, left: t, right: terms[j + 1] }));
  return t;
}

function renderTerm(t: Term): string {
  if (!t.op) return t.text;
  const wrap = (x: Term) => (x.op ? `(${renderTerm(x)})` : x.text);
  return `${wrap(t.left!)} ${t.op} ${wrap(t.right!)}`;
}

/** A term as written (without the grouping parentheses). */
function rawTerm(t: Term): string {
  return t.op ? `${rawTerm(t.left!)} ${t.op} ${rawTerm(t.right!)}` : t.text;
}

function findTerm(t: Term, index: number): Term | undefined {
  if (!t.op) return undefined;
  return t.index === index ? t : findTerm(t.left!, index) ?? findTerm(t.right!, index);
}

/** Whether the tree's grouping differs from CSS's precedence somewhere in this expression. */
function misnested(root: Node): boolean {
  for (const b of [root, ...all(root, 'binary_expression')]) {
    const op = operatorOf(b)?.text ?? '';
    if (isMulDiv(op) && b.namedChildren.some((c) => c?.type === 'binary_expression' && !isMulDiv(operatorOf(c)?.text ?? ''))) return true;
  }
  return false;
}

/** The grouping note for an operator in `calc()` (and friends), with CSS's precedence. Null for `/` separators. */
function mathGrouping(token: Node) {
  const expr = token.parent;
  if (!expr || expr.type !== 'binary_expression') return undefined;
  if (!isMath(expr)) return null;
  const root = mathRoot(expr);
  const operands: string[] = [];
  const ops: Node[] = [];
  flatten(root, operands, ops);
  const index = ops.findIndex((o) => o.equals(token));
  if (ops.length < 2 || index < 0) return null;
  const tree = buildTerm(operands, ops.map((o) => o.text));
  const own = findTerm(tree, index);
  if (!own) return null;
  const short = (s: string) => (s.length > 40 ? `${s.slice(0, 39)}…` : s);
  const grouped = renderTerm(tree);
  return {
    operator: token.text,
    operands: [own.left!, own.right!].map((x) => short(rawTerm(x))),
    grouped: grouped.length > 100 || grouped === oneLine(root.text) ? undefined : grouped,
  };
}

// ------------------------------------------------------------ selectors

type Specificity = [number, number, number];
const ZERO: Specificity = [0, 0, 0];
const plus = (a: Specificity, b: Specificity): Specificity => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const compare = (a: Specificity, b: Specificity) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const maxOf = (list: Specificity[]) => list.reduce((m, s) => (compare(s, m) > 0 ? s : m), ZERO);

/** The selector before a `.`, `#`, `[`, `:` or `::` (the compound it extends), if any. */
function prefixOf(n: Node): Specificity {
  const first = n.child(0);
  return first?.isNamed && SELECTOR_TYPES.has(first.type) ? specificity(first) : ZERO;
}

/** Selectors in an `arguments` node (of `:is()`, `:not()`, ...), optionally only those after `of`. */
function argumentSelectors(args: Node | undefined, afterOf = false): Node[] {
  if (!args) return [];
  const out: Node[] = [];
  let seenOf = !afterOf;
  for (let i = 0; i < args.childCount; i++) {
    const c = args.child(i)!;
    if (c.text === 'of' && !c.isNamed) seenOf = true;
    else if (seenOf && SELECTOR_TYPES.has(c.type)) out.push(c);
  }
  return out;
}

/** Specificity of a selector, as (ids, classes, types). */
function specificity(n: Node): Specificity {
  switch (n.type) {
    case 'tag_name':
      return [0, 0, 1];
    case 'universal_selector':
      return ZERO;
    case 'nesting_selector': {
      // `&` counts like `:is(<parent selectors>)`.
      const outer = parentRule(n);
      const sel = outer?.firstNamedChild;
      return sel?.type === 'selectors' ? maxOf(sel.namedChildren.filter((c): c is Node => !!c && SELECTOR_TYPES.has(c.type)).map(specificity)) : ZERO;
    }
    case 'class_selector':
    case 'attribute_selector':
      return plus(prefixOf(n), [0, 1, 0]);
    case 'id_selector':
      return plus(prefixOf(n), [1, 0, 0]);
    case 'pseudo_element_selector':
      return plus(prefixOf(n), [0, 0, 1]);
    case 'pseudo_class_selector': {
      const name = n.namedChildren.find((c) => c?.type === 'class_name')?.text.toLowerCase() ?? '';
      const args = n.namedChildren.find((c) => c?.type === 'arguments') ?? undefined;
      if (name === 'where') return prefixOf(n);
      if (/^(is|not|has|matches|-webkit-any|-moz-any)$/.test(name)) return plus(prefixOf(n), maxOf(argumentSelectors(args).map(specificity)));
      if (/^nth-(last-)?child$/.test(name)) return plus(plus(prefixOf(n), [0, 1, 0]), maxOf(argumentSelectors(args, true).map(specificity)));
      if (PSEUDO_ELEMENTS[name] && LEGACY_PSEUDO_ELEMENTS.has(name)) return plus(prefixOf(n), [0, 0, 1]);
      return plus(prefixOf(n), [0, 1, 0]);
    }
    case 'namespace_selector':
      // `ns|name`: the prefix is a namespace, not a type.
      return n.lastNamedChild ? specificity(n.lastNamedChild) : ZERO;
    case 'descendant_selector':
    case 'child_selector':
    case 'sibling_selector':
    case 'adjacent_sibling_selector':
      return n.namedChildren.filter((c): c is Node => !!c && SELECTOR_TYPES.has(c.type)).reduce((s, c) => plus(s, specificity(c)), ZERO);
  }
  return ZERO;
}

const LEGACY_PSEUDO_ELEMENTS = new Set(['before', 'after', 'first-line', 'first-letter']);

/** The complete selector (one item of the rule's selector list) a selector part belongs to. */
function complexSelector(node: Node): Node | undefined {
  let n: Node | undefined;
  for (let p: Node | null = node; p; p = p.parent) {
    if (SELECTOR_TYPES.has(p.type)) n = p;
    else if (p !== node && p.type !== 'class_name' && p.type !== 'arguments') break;
  }
  return n;
}

/** The rule a nested rule is nested in (what `&` stands for). */
function parentRule(node: Node): Node | undefined {
  const own = ancestor(node, (n) => n.type === 'rule_set');
  return own && ancestor(own, (n) => n.type === 'rule_set');
}

/** "`li` elements that are direct children of `ul`": a selector read from right to left. */
function describe(sel: Node): string {
  const parts = sel.namedChildren.filter((c): c is Node => !!c && SELECTOR_TYPES.has(c.type));
  const [left, right] = [parts[0], parts.at(-1)];
  const subject = right ? `${code(shorten(right.text, 40))} elements` : 'elements';
  const of = left ? code(shorten(left.text, 40)) : '';
  switch (sel.type) {
    case 'descendant_selector':
      return `${subject} anywhere inside an element matching ${of}`;
    case 'child_selector':
      return left && left !== right ? `${subject} that are direct children of an element matching ${of}` : `${subject} that are direct children (of the element being tested)`;
    case 'adjacent_sibling_selector':
      return left && left !== right ? `${subject} that come right after a sibling matching ${of}` : `${subject} that come right after it`;
    case 'sibling_selector':
      return left && left !== right ? `${subject} that come somewhere after a sibling matching ${of}` : `${subject} that come after it`;
  }
  return `elements matching ${code(shorten(sel.text, 40))}`;
}

/** "The selector `ul > li` matches … and has specificity (0, 0, 2)." */
function selectorNote(node: Node): string {
  const sel = complexSelector(node);
  if (!sel) return '';
  const s = specificity(sel);
  const what = /descendant|child|sibling/.test(sel.type) ? ` matches ${describe(sel)}, and` : '';
  return `The selector ${code(shorten(sel.text, 60))}${what} has specificity **(${s.join(', ')})**: (ids, classes/attributes/pseudo-classes, types/pseudo-elements). When rules conflict, the higher specificity wins; on a tie, the later rule.`;
}

/** The rule (or at-rule) a selector part styles. */
function ruleOf(node: Node): Node | undefined {
  return ancestor(node, (n) => n.type === 'rule_set' || STATEMENTS.has(n.type));
}

// ------------------------------------------------------------ values

interface Ctx {
  property?: string;
  fn?: { name: string; call: Node; args: Node };
  feature?: string;
  pseudo?: string;
  at?: string;
}

function contextOf(node: Node): Ctx {
  const query = ancestor(node, (n) => n.type === 'feature_query', (n) => n.type === 'block');
  const pseudo = ancestor(node, (n) => n.type === 'pseudo_class_selector', (n) => n.type === 'block');
  const feature = query?.namedChildren.find((c) => c?.type === 'feature_name')?.text.toLowerCase();
  const at = insideAt(node);
  return {
    // In `@supports (display: grid)`, the "feature" is a property.
    property: propertyOf(node) ?? (at === '@supports' ? feature?.replace(VENDOR, '') : undefined),
    fn: functionOf(node),
    feature: at === '@supports' ? undefined : feature,
    pseudo: pseudo && node.parent?.type === 'arguments' ? pseudo.namedChildren.find((c) => c?.type === 'class_name')?.text.toLowerCase() : undefined,
    at,
  };
}

/** Keyword meanings inside some functions' arguments. */
const FN_VALUES: Record<string, Record<string, string>> = {
  'linear-gradient': { to: 'starts a **direction**: `to right` goes from left to right, `to bottom right` diagonally (the default is `to bottom`)', ...VALUE_GROUPS.SIDES },
  'radial-gradient': { circle: 'a circular gradient', ellipse: 'an elliptical gradient (the default)', at: 'starts the **center position** of the gradient', 'closest-side': 'the gradient ends at the closest side', 'farthest-corner': 'the gradient ends at the farthest corner (the default)', 'closest-corner': 'ends at the closest corner', 'farthest-side': 'ends at the farthest side', ...VALUE_GROUPS.SIDES },
  'conic-gradient': { from: 'starts the **starting angle**', at: 'starts the center position', ...VALUE_GROUPS.SIDES },
  repeat: {
    'auto-fill': 'as many tracks as **fit** in the container; empty tracks are kept',
    'auto-fit': 'as many tracks as fit, but **empty tracks collapse**, so the items stretch to fill the row',
  },
  minmax: { auto: 'the content\'s size', 'min-content': 'the smallest size without overflow', 'max-content': 'the content\'s full size' },
  steps: { start: 'jumps at the start of each step', end: 'jumps at the end of each step (the default)', 'jump-start': 'jumps at the start', 'jump-end': 'jumps at the end', 'jump-none': 'no jump at either end', 'jump-both': 'jumps at both ends' },
  'color-mix': { in: 'starts the **color space** to mix in', srgb: 'mix in the sRGB color space', oklch: 'mix in the OKLCH color space (keeps colors vivid)', oklab: 'mix in the Oklab color space (perceptually even)', hsl: 'mix in the HSL color space' },
  circle: { at: 'starts the center position', ...VALUE_GROUPS.SIDES },
  ellipse: { at: 'starts the center position', ...VALUE_GROUPS.SIDES },
  inset: { round: 'starts the corner radius' },
};

const keyword = (title: string, summary: string, link: string, details?: string, label = 'keyword'): DocEntry => ({ kind: 'value', title, label, summary, details, link });

/** The meaning of the keyword `v` in context, if it is a known one. */
function keywordDoc(v: string, ctx: Ctx): DocEntry | undefined {
  const k = v.toLowerCase();
  const g = Object.hasOwn(GLOBAL_KEYWORDS, k) ? GLOBAL_KEYWORDS[k] : undefined;
  if (g) return keyword(v, g.summary, mdn(g.page), 'Every property accepts the global keywords `inherit`, `initial`, `unset`, `revert` and `revert-layer`.', 'global keyword');
  if (ctx.feature && !ctx.at?.match(/@supports/)) {
    const meaning = MEDIA_FEATURES[ctx.feature.replace(/^(min|max)-/, '')]?.values?.[k];
    if (meaning) return keyword(v, `In a \`(${ctx.feature}: ...)\` media query: ${meaning}.`, mdn(`@media/${ctx.feature}`), undefined, 'media feature value');
  }
  if (ctx.pseudo && /^nth-/.test(ctx.pseudo)) {
    if (k === 'odd') return keyword(v, 'In `:nth-child()`: the 1st, 3rd, 5th, ... elements (the same as `2n+1`).', mdn(`:${ctx.pseudo}`));
    if (k === 'even') return keyword(v, 'In `:nth-child()`: the 2nd, 4th, 6th, ... elements (the same as `2n`).', mdn(`:${ctx.pseudo}`));
    if (/n/.test(k)) return keyword(v, anPlusB(k), mdn(`:${ctx.pseudo}`), undefined, 'An+B formula');
  }
  if (ctx.pseudo === 'dir' && (k === 'ltr' || k === 'rtl')) return keyword(v, k === 'ltr' ? 'Left-to-right text.' : 'Right-to-left text.', mdn(':dir'));
  const fnMeaning = ctx.fn && FN_VALUES[ctx.fn.name]?.[k];
  if (fnMeaning) return keyword(v, `In \`${ctx.fn!.name}()\`: ${fnMeaning}.`, mdn(FUNCTIONS[ctx.fn!.name]?.page ?? ctx.fn!.name));
  const prop = ctx.property ? PROPERTIES[ctx.property] : undefined;
  if (prop && ctx.property) {
    const own = prop.values?.[k];
    if (own) return keyword(v, `As a value of \`${ctx.property}\`: ${own}.`, PROPERTY_PAGE(ctx.property, prop));
    for (const l of prop.longhands ?? []) {
      const m = PROPERTIES[l]?.values?.[k];
      if (m) return keyword(v, `As a value of \`${ctx.property}\` (the \`${l}\` part): ${m}.`, PROPERTY_PAGE(l, PROPERTIES[l]));
    }
    if (/^(transition|transition-property|will-change)$/.test(ctx.property) && Object.hasOwn(PROPERTIES, k)) {
      return keyword(v, `The property to ${ctx.property === 'will-change' ? 'prepare for changes' : 'animate'}: \`${k}\`. ${PROPERTIES[k].summary}`, PROPERTY_PAGE(k, PROPERTIES[k]), undefined, 'property name');
    }
  }
  const hex = NAMED_COLORS.get(k);
  if (hex) {
    const [r, g2, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return keyword(v, `A **named color**: \`#${hex}\`, which is \`rgb(${r} ${g2} ${b})\`. CSS has 148 color names; they are handy for quick tests, but a design usually needs exact colors.`, mdn('named-color'), undefined, 'named color');
  }
  if (SYSTEM_COLORS.has(k)) return keyword(v, 'A **system color**: a color from the user\'s operating system or browser theme (for example in high-contrast mode), so your page can match it.', mdn('system-color'), undefined, 'system color');
  for (const group of [VALUE_GROUPS.FONT_FAMILY]) if (group[k]) return keyword(v, `A generic font family: ${group[k]}.`, mdn('font-family#generic-name'));
  const common = Object.hasOwn(COMMON_KEYWORDS, k) ? COMMON_KEYWORDS[k] : undefined;
  if (common) return keyword(v, `${common.charAt(0).toUpperCase()}${common.slice(1)}.`, ctx.property ? PROPERTY_PAGE(ctx.property, prop) : mdn('Value_definition_syntax'));
  return undefined;
}

/** What an `An+B` formula selects: `2n+1` → 1st, 3rd, 5th, ... */
function anPlusB(formula: string): string {
  const m = formula.replace(/\s+/g, '').match(/^([+-]?\d*)n([+-]\d+)?$/);
  if (!m) return 'An `An+B` formula: `n` counts 0, 1, 2, ...; the element at each resulting position (from 1) matches.';
  const a = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : parseInt(m[1], 10);
  const b = m[2] ? parseInt(m[2], 10) : 0;
  const hits: number[] = [];
  for (let n = 0; n < 50 && hits.length < 4; n++) {
    const pos = a * n + b;
    if (pos >= 1 && !hits.includes(pos)) hits.push(pos);
    if (a <= 0 && pos < 1) break;
  }
  const ord = (x: number) => `${x}${x % 10 === 1 && x % 100 !== 11 ? 'st' : x % 10 === 2 && x % 100 !== 12 ? 'nd' : x % 10 === 3 && x % 100 !== 13 ? 'rd' : 'th'}`;
  const list = hits.map(ord).join(', ');
  const more = a > 0 ? ', ...' : '';
  return `An **An+B** formula: \`n\` counts 0, 1, 2, ..., so \`${formula}\` selects the ${list || 'no'}${more} element${hits.length === 1 && !more ? '' : 's'}.${a < 0 ? ' A negative `n` selects the first few: `-n+3` is the first three.' : ''}`;
}

/** Doc for a plain value (a keyword, a name, a URL, ...). Undefined where a role explains it instead. */
function valueDoc(node: Node): DocEntry | undefined {
  const v = node.text;
  const ctx = contextOf(node);
  if (customPropertyReference(node) || animationName(node, ctx)) return undefined;
  if (node.parent?.type === 'grid_value') return keyword(v, `A **grid line name**: names the line between two tracks, so items can be placed with \`grid-column: ${v} / ...\`.`, mdn('grid-template-columns'), undefined, 'line name');
  if (ctx.fn?.name === 'url') return keyword(v, 'The **URL** of the file to load (without quotes). Relative URLs are relative to the stylesheet. Quote it if it contains spaces or parentheses.', mdn('url_value'), undefined, 'URL');
  if (ctx.fn?.name === 'attr') return keyword(v, `The name of the **HTML attribute** whose value is used: \`attr(${v})\` reads \`${v}="..."\` from the element.`, mdn('attr'), undefined, 'attribute name');
  if (ctx.fn?.name === 'counter' || ctx.fn?.name === 'counters') return keyword(v, 'The name of a CSS counter (from `counter-reset`).', mdn('counter'), undefined, 'counter name');
  if (node.parent?.type === 'attribute_selector') return keyword(v, 'The **value** the attribute is compared with. Without quotes it must be a single word; quote it otherwise.', mdn('Attribute_selectors'), undefined, 'attribute value');
  const known = keywordDoc(v, ctx);
  if (known) return known;
  if (ctx.property === 'grid-area' || /^grid-(row|column)(-start|-end)?$/.test(ctx.property ?? '')) {
    return keyword(v, `The name of a **grid area** (from \`grid-template-areas\`) or a named grid line: the item is placed there.`, mdn('grid-area'), undefined, 'area name');
  }
  if (ctx.property === 'font-family') return keyword(v, 'A **font name**. Without quotes it may only contain letters, digits (not at the start), `-` and `_`; quote names like `"Times New Roman"`.', mdn('font-family'), undefined, 'font name');
  if (ctx.property === 'container-name' || (ctx.property === 'container' && !node.previousNamedSibling)) return keyword(v, 'A **container name**: `@container name (...)` queries can target this container.', mdn('container-name'), undefined, 'container name');
  if (ctx.property === 'counter-reset' || ctx.property === 'counter-increment') return keyword(v, 'The name of a CSS counter.', mdn(ctx.property), undefined, 'counter name');
  if (VENDOR.test(v)) return keyword(v, `A vendor-prefixed keyword. ${vendorNote(v)}`, mdn('Reference'), undefined, 'keyword');
  if (ctx.property) return keyword(v, `A value of \`${ctx.property}\`.`, PROPERTY_PAGE(ctx.property, PROPERTIES[ctx.property]), undefined, 'value');
  if (ctx.fn) return keyword(v, `An argument of \`${ctx.fn.name}()\`.`, mdn(FUNCTIONS[ctx.fn.name]?.page ?? ctx.fn.name), undefined, 'value');
  return undefined;
}

// ------------------------------------------------------------ numbers and colors

const UNIT_LABEL: Record<string, string> = { length: 'length', angle: 'angle', time: 'time', resolution: 'resolution', frequency: 'frequency', flex: 'flex value' };
const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;

/** Which channel a number is in a color function, by its position: `rgb(r g b / a)`. */
function channelOf(node: Node, fn: string): string | undefined {
  const key = fn === 'rgba' ? 'rgb' : fn === 'hsla' ? 'hsl' : fn;
  const args = node.parent;
  if (!args || !Object.hasOwn(CHANNELS, key)) return undefined;
  // The alpha is after a `/`: a binary_expression `b / a` in this grammar.
  if (args.type === 'binary_expression') return args.lastNamedChild?.equals(node) ? 'the **alpha** (opacity): `0` is transparent, `1` (or `100%`) opaque' : channelOf(args, fn);
  if (args.type !== 'arguments') return undefined;
  const values = args.namedChildren.filter((c): c is Node => !!c);
  const index = values.findIndex((c) => c.startIndex <= node.startIndex && node.endIndex <= c.endIndex);
  return CHANNELS[key][index];
}

const CHANNELS: Record<string, string[]> = {
  rgb: ['the **red** channel (0–255)', 'the **green** channel (0–255)', 'the **blue** channel (0–255)', 'the **alpha** (opacity, 0–1)'],
  hsl: ['the **hue**: an angle on the color wheel (0 red, 120 green, 240 blue)', 'the **saturation** (0% gray, 100% vivid)', 'the **lightness** (0% black, 50% the pure color, 100% white)', 'the **alpha** (opacity, 0–1)'],
  hwb: ['the **hue** angle', 'the **whiteness**', 'the **blackness**', 'the **alpha**'],
  oklch: ['the **lightness** (0 black to 1 white, or a percentage)', 'the **chroma**: how colorful (0 is gray; about 0.4 at most)', 'the **hue**: an angle on the color wheel', 'the **alpha**'],
  lch: ['the **lightness** (0–100)', 'the **chroma** (colorfulness)', 'the **hue** angle', 'the **alpha**'],
  oklab: ['the **lightness**', 'the green–red axis', 'the blue–yellow axis', 'the **alpha**'],
  lab: ['the **lightness**', 'the green–red axis', 'the blue–yellow axis', 'the **alpha**'],
};

/** A number, with or without unit, explained in context. */
function numberDoc(node: Node): DocEntry | undefined {
  const text = node.text;
  const unitNode = node.namedChildren.find((c) => c?.type === 'unit');
  const unit = unitNode?.text ?? '';
  const numeric = unit ? text.slice(0, text.length - unit.length) : text;
  const n = Number(numeric);
  const ctx = contextOf(node);
  const prop = ctx.property ? PROPERTIES[ctx.property] : undefined;
  const parent = node.parent;

  if (parent?.type === 'keyframe_block') {
    return {
      kind: 'keyword',
      title: text,
      label: 'keyframe selector',
      summary: `A **keyframe** at ${text} of the animation's duration: these styles apply ${n === 0 ? 'at the start' : n === 100 ? 'at the end' : n === 50 ? 'halfway through' : `when it is ${text} done`}. The browser animates smoothly between keyframes.`,
      details: '`from` is `0%` and `to` is `100%`. Several percentages can share one block: `0%, 100% { ... }`.',
      link: mdn('@keyframes'),
    };
  }
  if (ctx.pseudo && /^nth-/.test(ctx.pseudo) && !unit) {
    return { kind: 'literal', title: text, label: 'number', summary: `In \`:${ctx.pseudo}()\`: the **${ordinal(n)}** element${/last/.test(ctx.pseudo) ? ', counting from the end' : ''} (counting starts at 1).`, link: mdn(`:${ctx.pseudo}`) };
  }

  const link = (page: string) => mdn(page);
  if (unit === '%') {
    let of: string | undefined;
    const channel = ctx.fn && channelOf(node, ctx.fn.name);
    if (channel) of = undefined;
    else if (ctx.fn && /gradient$/.test(ctx.fn.name)) of = 'the gradient line: where this color stop sits along the gradient';
    else if (ctx.fn && /^translate/.test(ctx.fn.name)) of = 'the element\'s **own** size';
    else if (ctx.fn && /^(brightness|contrast|grayscale|invert|opacity|saturate|sepia)$/.test(ctx.fn.name)) of = 'the full effect (`100%` = the whole effect, the same as `1`)';
    else if (ctx.fn?.name === 'color-mix') of = 'the mix: how much of this color to use';
    else if (ctx.fn && /^(circle|ellipse|polygon|inset)$/.test(ctx.fn.name)) of = 'the element\'s reference box';
    else of = prop?.percent;
    return {
      kind: 'literal',
      title: text,
      label: 'percentage',
      summary: channel
        ? `A **percentage**: here ${channel}.`
        : of
          ? `**${n}%** of ${of}.`
          : `A **percentage**: ${n}% of a reference size that depends on the property (often the parent's size).`,
      link: link('percentage'),
    };
  }
  if (unit) {
    const u = Object.hasOwn(UNITS, unit.toLowerCase()) ? UNITS[unit.toLowerCase()] : undefined;
    if (!u) {
      return {
        kind: 'literal',
        title: text,
        label: 'dimension',
        summary: `\`${unit}\` is **not a CSS unit**, so the browser ignores the whole declaration. Check the spelling (\`px\`, \`em\`, \`rem\`, \`%\`, \`vh\`, \`s\`, \`deg\`, ...).`,
        link: link('length'),
      };
    }
    const notes: string[] = [];
    if (n === 0 && u.kind === 'length') notes.push('Zero is zero in any unit: a zero length can be written as just `0`.');
    if (n < 0 && u.kind === 'length') notes.push('Negative lengths are allowed for margins, offsets (`top`, `left`, ...), `letter-spacing` and transforms, but not for sizes or padding.');
    if (unit.toLowerCase() === 'em' && ctx.property === 'font-size') notes.push('In `font-size`, `em` is relative to the **parent\'s** font size.');
    if (ctx.fn) {
      const channel = channelOf(node, ctx.fn.name);
      if (channel) notes.push(`Here it is ${channel}.`);
    }
    return { kind: 'literal', title: text, label: UNIT_LABEL[u.kind], summary: `**${text}** = ${u.means(n, text)}.`, details: notes.join(' ') || undefined, link: link(u.page) };
  }

  // A plain number.
  let meaning: string | undefined;
  const fn = ctx.fn?.name;
  const channel = fn && channelOf(node, fn);
  if (channel) meaning = `here ${channel}`;
  else if (fn === 'repeat' && !node.previousNamedSibling) meaning = 'how many times to **repeat** the tracks';
  else if (fn === 'steps') meaning = 'the number of steps';
  else if (fn === 'cubic-bezier') meaning = 'a coordinate of one of the curve\'s two control points (x values from 0 to 1)';
  else if (fn && /^scale/.test(fn)) meaning = 'a scale factor: `1` is the normal size, `2` twice as big';
  else if (fn && /^(brightness|contrast|grayscale|invert|opacity|saturate|sepia)$/.test(fn)) meaning = 'the amount: `1` is the full effect (`100%`), `0` none';
  else if (fn === 'var') meaning = 'the **fallback** value, used when the custom property isn\'t set';
  else if (fn && MATH.has(fn)) meaning = 'a plain number in the calculation: `*` and `/` need one on (at least) one side, so it multiplies or divides the other value';
  else if (prop?.number) meaning = prop.number;
  else if (n === 0) meaning = 'zero: a zero length or offset needs no unit';
  else if (prop?.percent) meaning = undefined;
  const missingUnit = !meaning && n !== 0 && !!prop?.percent && !fn;
  return {
    kind: 'literal',
    title: text,
    label: 'number',
    summary: missingUnit
      ? `A number **without a unit**, where \`${ctx.property}\` needs a length: the browser **ignores** this declaration. Add a unit, like \`${text}px\` (only \`0\` may go without one).`
      : meaning
        ? `**${text}**: ${meaning}.`
        : 'A **number** without a unit.',
    link: link('number'),
  };
}

/** `#3366ff` explained: its red, green and blue parts, and the alpha. */
function colorDoc(node: Node): DocEntry {
  const text = node.text;
  const hex = text.slice(1);
  let summary: string;
  if (/^[0-9a-f]+$/i.test(hex) && [3, 4, 6, 8].includes(hex.length)) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
    const [r, g, b, a] = [0, 2, 4, 6].map((i) => (i < full.length ? parseInt(full.slice(i, i + 2), 16) : undefined));
    const alpha = a === undefined ? '' : ` / ${Math.round((a / 255) * 100)}%`;
    const short = hex.length <= 4 ? ` The short form doubles each digit: \`${text}\` is \`#${full}\`.` : '';
    summary = `A **hex color**: red, green and blue as two hexadecimal digits each (00–ff = 0–255)${a === undefined ? '' : ', then the alpha (opacity)'}. \`${text}\` is \`rgb(${r} ${g} ${b}${alpha})\`.${short}`;
  } else {
    summary = `Not a valid hex color: after \`#\` it needs 3, 4, 6 or 8 hexadecimal digits (0–9, a–f), so the browser ignores the declaration.`;
  }
  return { kind: 'literal', title: text, label: 'color', summary, link: mdn('hex-color') };
}

/** A string, explained by where it is. */
function stringDoc(node: Node): DocEntry {
  const ctx = contextOf(node);
  const parent = node.parent;
  const doc = (summary: string, link: string, details?: string): DocEntry => ({ kind: 'literal', title: '"..." (string)', label: 'string', summary, details, link });
  const general = 'Double and single quotes mean the same. Escape a character with a backslash: `"\\201C"`.';
  if (parent?.type === 'import_statement') return doc('The **URL** of the stylesheet to import. A plain string works like `url(...)` here.', mdn('@import'));
  if (parent?.type === 'charset_statement') return doc('The name of the **encoding**: in practice always `"UTF-8"`.', mdn('@charset'));
  if (parent?.type === 'namespace_statement') return doc('The **namespace URL**.', mdn('@namespace'));
  if (parent?.type === 'attribute_selector') return doc('The **value** the attribute is compared with.', mdn('Attribute_selectors'));
  if (ctx.fn?.name === 'url') return doc('The **URL** of the file to load. Relative URLs are relative to the stylesheet, not the page.', mdn('url_value'));
  if (ctx.fn?.name === 'format') return doc('The **font format**: `"woff2"` (best: small and supported everywhere), `"woff"`, `"truetype"`, `"opentype"`.', mdn('@font-face/src'));
  if (ctx.fn?.name === 'local') return doc('The name of a font **installed** on the user\'s computer.', mdn('@font-face/src'));
  switch (ctx.property) {
    case 'content':
      return doc('**Generated text**: shown as the pseudo-element\'s content. It isn\'t in the HTML, so it can\'t be selected and may not be read aloud. `""` (empty) still creates the pseudo-element, for decorations.', mdn('content'), '`\\A` is a line break (with `white-space: pre`); `\\201C` inserts a character by its Unicode number.');
    case 'font-family':
      return doc(ctx.at === '@font-face' ? 'The **name** you give this font; use exactly this name in `font-family` elsewhere.' : 'A **font name**. Quotes are needed when the name has spaces, digits or punctuation, like `"Helvetica Neue"`.', mdn('font-family'));
    case 'grid-template-areas':
      return doc('One **row** of the area map: each word is the name of the area that cell belongs to, `.` an empty cell. All rows need the same number of cells, and every area must be a rectangle.', mdn('grid-template-areas'));
    case 'quotes':
      return doc('A quotation mark to insert with `open-quote` / `close-quote`.', mdn('quotes'));
    case 'syntax':
      return doc('The **type** of the registered custom property, like `"<length>"`, `"<color>"`, `"<number> | auto"`, or `"*"` for anything.', mdn('@property/syntax'));
  }
  return doc(`A **string**: text in quotes. ${general}`, mdn('string'));
}

// ------------------------------------------------------------ names

/** `--x` inside `var(...)`: a reference to a custom property. */
function customPropertyReference(node: Node): boolean {
  if (node.type !== 'plain_value' || !node.text.startsWith('--')) return false;
  const fn = functionOf(node);
  return !!fn && fn.name === 'var' && fn.args.firstNamedChild?.equals(node) === true;
}

/** Whether a value is in an `animation` / `animation-name` declaration and isn't a keyword: then it names a `@keyframes`. */
function animationName(node: Node, ctx = contextOf(node)): boolean {
  if (node.type !== 'plain_value' || node.parent?.type !== 'declaration') return false;
  if (ctx.property !== 'animation' && ctx.property !== 'animation-name') return false;
  const k = node.text.toLowerCase();
  if (Object.hasOwn(GLOBAL_KEYWORDS, k) || k === 'none') return false;
  const prop = PROPERTIES[ctx.property];
  return !prop.values?.[k] && !(prop.longhands ?? []).some((l) => PROPERTIES[l]?.values?.[k]);
}

/** Declarations of the custom property `name` in the stylesheet. */
function customPropertyDeclarations(root: Node, name: string): Node[] {
  return all(root, 'property_name').filter((p) => p.text === name && p.parent?.type === 'declaration').map((p) => p.parent!);
}

/** Where a declaration's rule applies, e.g. "`:root`". */
function selectorOfDeclaration(decl: Node): string | undefined {
  const rule = ancestor(decl, (n) => n.type === 'rule_set' || n.type === 'at_rule' || n.type === 'keyframe_block');
  const sel = rule?.type === 'rule_set' ? rule.firstNamedChild : undefined;
  return sel ? shorten(sel.text, 40) : undefined;
}

/** `@keyframes` statements named `name`. */
function keyframesNamed(root: Node, name: string): Node[] {
  return all(root, 'keyframes_name').filter((k) => k.text === name).map((k) => k.parent!).filter(Boolean);
}

/** Values that use the animation `name`. */
function animationUses(root: Node, name: string): Node[] {
  return all(root, 'plain_value').filter((v) => v.text === name && animationName(v));
}

/** The nearest of `candidates` before `node`, or else the first one. */
function nearest(node: Node, candidates: Node[]): Node | undefined {
  const before = candidates.filter((c) => c.startIndex < node.startIndex);
  return before.at(-1) ?? candidates[0];
}

function role(node: Node): Role | undefined {
  const parent = node.parent;
  if (!parent) return undefined;
  const name = code(node.text);
  switch (node.type) {
    case 'identifier': {
      if (parent.type !== 'class_name' || parent.parent?.type !== 'class_selector') return undefined;
      const rule = ruleOf(node);
      const others = all(rootOf(node), 'class_name')
        .filter((c) => c.text === parent.text && c.parent?.type === 'class_selector' && !ruleOf(c)?.equals(rule ?? c))
        .map((c) => c.startPosition.row);
      const also = others.length ? ` This file also styles \`.${parent.text}\` on ${lines(others)}.` : '';
      return {
        title: 'Class selector',
        summary: `Matches elements whose \`class\` attribute contains ${name}, like \`<div class="${parent.text}">\`.${also} ${selectorNote(node)}`,
        scope: rule,
      };
    }
    case 'id_name':
      return {
        title: 'ID selector',
        summary: `Matches the element with \`id="${node.text}"\`. An id gives a selector a high specificity, so these rules are hard to override: classes are usually a better choice for styling. ${selectorNote(node)}`,
        scope: ruleOf(node),
      };
    case 'keyframes_name': {
      const uses = animationUses(rootOf(node), node.text).map((u) => u.startPosition.row);
      return {
        title: 'Keyframes name',
        summary: `Declares the animation ${name}. Run it with \`animation: ${node.text} 1s\` (or \`animation-name\`). ${uses.length ? `Used on ${lines(uses)}.` : 'Not used in this file.'}`,
        scope: parent,
      };
    }
    case 'property_name': {
      if (!node.text.startsWith('--') || parent.type !== 'declaration') return undefined;
      const where = selectorOfDeclaration(parent);
      const uses = all(rootOf(node), 'plain_value').filter((v) => v.text === node.text && customPropertyReference(v)).map((v) => v.startPosition.row);
      return {
        title: 'Custom property',
        summary: `Declares the **custom property** (CSS variable) ${name}${where ? ` on the elements ${code(where)} matches` : ''}; their descendants **inherit** it. Read it anywhere below with \`var(${node.text})\`. ${uses.length ? `Used on ${lines(uses)}.` : 'Not used in this file.'}`,
        scope: parent,
      };
    }
    case 'plain_value': {
      if (customPropertyReference(node)) {
        const decls = customPropertyDeclarations(rootOf(node), node.text);
        const registered = all(rootOf(node), 'keyword_query').filter((k) => k.text === node.text && atKeyword(k.parent) === '@property');
        const target = nearest(node, decls) ?? registered[0]?.parent ?? undefined;
        if (!target) {
          return {
            title: 'Custom property reference',
            summary: `Reads the custom property ${name}, which isn't declared in this file: it may come from another stylesheet, an inline \`style\` or JavaScript. If it isn't set at all, the fallback after the comma is used.`,
          };
        }
        const rows = decls.map((d) => d.startPosition.row);
        const where = decls.length ? selectorOfDeclaration(target) : undefined;
        const several = decls.length > 1 ? ' Which value applies depends on the element: the declaration from the matching rule that wins the cascade, or the one inherited from the nearest ancestor.' : '';
        return {
          title: 'Custom property reference',
          summary: `Reads the custom property ${name}, declared on ${decls.length ? lines(rows) : lines([target.startPosition.row])}${where ? ` (in ${code(where)})` : ''}.${several}`,
          scope: target,
        };
      }
      if (animationName(node)) {
        const target = nearest(node, keyframesNamed(rootOf(node), node.text));
        return target
          ? { title: 'Keyframes reference', summary: `Runs the animation ${name}, declared by \`@keyframes ${node.text}\` on line ${target.startPosition.row + 1}.`, scope: target }
          : { title: 'Keyframes reference', summary: `Runs the animation ${name}: a \`@keyframes ${node.text}\` rule that isn't in this file (or a typo: an unknown name runs no animation).` };
      }
      return undefined;
    }
    case 'keyword_query': {
      const statement = parent.type === 'at_rule' ? parent : undefined;
      const at = atKeyword(statement);
      if (at === '@layer') {
        const earlier = all(rootOf(node), 'keyword_query').filter((k) => k.text === node.text && atKeyword(k.parent) === '@layer' && k.startIndex < node.startIndex);
        return {
          title: 'Layer name',
          summary: earlier.length
            ? `Adds rules to the **cascade layer** ${name} (first named on line ${earlier[0].startPosition.row + 1}). The layer keeps its place in the layer order.`
            : `Declares the **cascade layer** ${name}. Layers declared earlier lose to later ones, whatever the specificity.`,
          scope: statement,
        };
      }
      if (at === '@property') {
        return { title: 'Registered custom property', summary: `Registers the custom property ${name} with a type, so it can be animated and checked. Use it like any custom property: \`var(${node.text})\`.`, scope: statement };
      }
      return undefined;
    }
    case 'namespace_name':
      return { title: 'Namespace prefix', summary: `Declares the namespace prefix ${name}: in selectors, \`${node.text}|element\` then matches elements in this namespace only.`, scope: parent };
    case 'tag_name': {
      if (parent.type !== 'namespace_selector' || node.nextSibling?.text !== '|') return undefined;
      const decl = all(rootOf(node), 'namespace_name').find((n) => n.text === node.text);
      return {
        title: 'Namespace prefix reference',
        summary: `The namespace prefix ${name}${decl ? `, declared with \`@namespace\` on line ${decl.startPosition.row + 1}` : ''}: only elements in that namespace match.`,
        scope: decl?.parent ?? undefined,
      };
    }
  }
  return undefined;
}

// ------------------------------------------------------------ identifier docs

function propertyDoc(node: Node): DocEntry | undefined {
  const raw = node.text;
  if (raw.startsWith('--')) return undefined;
  const name = raw.toLowerCase();
  const base = name.replace(VENDOR, '');
  const at = insideAt(node);
  const prop = Object.hasOwn(PROPERTIES, name) ? PROPERTIES[name] : Object.hasOwn(PROPERTIES, base) ? PROPERTIES[base] : undefined;
  const descriptor = at === '@font-face' || at === '@property' || at === '@page' || at === '@counter-style';
  const vendor = vendorNote(name);
  if (!prop) {
    return {
      kind: 'keyword',
      title: raw,
      label: descriptor ? 'descriptor' : 'property',
      summary: vendor
        ? `A vendor-prefixed property. ${vendor}`
        : `A CSS property Syntax Tutor has no notes on. If it is **misspelled**, the browser silently **ignores the whole declaration** (devtools show it struck through).`,
      link: mdn(base),
    };
  }
  const fontFace: Record<string, string> = {
    'font-family': 'In `@font-face`: the **name** you give this font. Use exactly this name in `font-family` elsewhere to get it.',
    'font-weight': 'In `@font-face`: which **weight(s)** this font file provides, e.g. `700`, or a range like `100 900` for a variable font.',
    'font-style': 'In `@font-face`: whether this file is the normal or the **italic** version of the font.',
  };
  const summary = (at === '@font-face' && fontFace[base]) || prop.summary;
  const details = [prop.details, INHERITED.has(base) ? '**Inherited**: children get the same value unless they set their own.' : '', vendor].filter(Boolean).join('\n\n') || undefined;
  return { kind: 'keyword', title: raw, label: descriptor ? 'descriptor' : 'property', summary, details, example: prop.example, link: PROPERTY_PAGE(base, prop) };
}

function pseudoClassDoc(name: string, node: Node): DocEntry {
  const k = name.toLowerCase();
  if (LEGACY_PSEUDO_ELEMENTS.has(k)) {
    return {
      kind: 'keyword',
      title: `:${name}`,
      label: 'pseudo-element',
      summary: `The old single-colon spelling of the \`::${k}\` pseudo-element. It still works for these four (\`:before\`, \`:after\`, \`:first-line\`, \`:first-letter\`), but \`::${k}\` is the modern syntax. ${PSEUDO_ELEMENTS[k].summary}`,
      link: mdn(`::${k}`),
    };
  }
  const p = Object.hasOwn(PSEUDO_CLASSES, k) ? PSEUDO_CLASSES[k] : undefined;
  const page = k.replace(VENDOR, '');
  if (!p) {
    return {
      kind: 'keyword',
      title: `:${name}`,
      label: 'pseudo-class',
      summary: VENDOR.test(k) ? `A vendor-prefixed pseudo-class. ${vendorNote(k)}` : 'A pseudo-class Syntax Tutor has no notes on. An unknown pseudo-class makes the browser drop the **whole rule** (and every selector in its list).',
      link: mdn(`:${page}`),
    };
  }
  return { kind: 'keyword', title: `:${name}`, label: 'pseudo-class', summary: p.summary, details: p.details, example: p.example, link: mdn(`:${page}`) };
}

function pseudoElementDoc(name: string): DocEntry {
  const k = name.toLowerCase();
  const p = Object.hasOwn(PSEUDO_ELEMENTS, k) ? PSEUDO_ELEMENTS[k] : undefined;
  const page = k.startsWith('-webkit-scrollbar') ? '::-webkit-scrollbar' : `::${k}`;
  if (!p) {
    return {
      kind: 'keyword',
      title: `::${name}`,
      label: 'pseudo-element',
      summary: VENDOR.test(k) ? `A vendor-prefixed pseudo-element. ${vendorNote(k)} A selector list containing a pseudo-element the browser doesn't know is dropped entirely.` : 'A pseudo-element Syntax Tutor has no notes on.',
      link: mdn(page),
    };
  }
  return { kind: 'keyword', title: `::${name}`, label: 'pseudo-element', summary: p.summary, details: p.details, example: p.example, link: mdn(page) };
}

function typeSelectorDoc(node: Node): DocEntry {
  const k = node.text.toLowerCase();
  const what = Object.hasOwn(ELEMENTS, k) ? ` (${ELEMENTS[k]})` : k.includes('-') ? ' (a custom element)' : '';
  return {
    kind: 'keyword',
    title: node.text,
    label: 'type selector',
    summary: `A **type selector**: matches every \`<${k}>\` element${what}.`,
    details: selectorNote(node) || undefined,
    link: mdn('Type_selectors'),
  };
}

function featureDoc(node: Node): DocEntry {
  const name = node.text.toLowerCase();
  const at = insideAt(node);
  if (at === '@supports' || ancestor(node, (n) => n.type === 'call_expression' && n.firstNamedChild?.text === 'supports')) {
    const p = propertyDoc(node);
    return {
      ...(p ?? { kind: 'keyword', summary: '' }),
      kind: 'keyword',
      title: node.text,
      label: 'property',
      summary: `In \`@supports\`: the rules apply only if the browser supports the property \`${name}\` with this value. ${p?.summary ?? ''}`.trim(),
    } as DocEntry;
  }
  if (at === '@container') {
    const meaning = CONTAINER_FEATURES[name];
    return {
      kind: 'keyword',
      title: node.text,
      label: 'container feature',
      summary: meaning ? `A **container feature**: tests ${meaning}. The container is the nearest ancestor with a \`container-type\`.` : 'A container feature: a property of the query container to test.',
      link: mdn('@container'),
    };
  }
  const base = name.replace(/^(min|max)-/, '');
  const f = MEDIA_FEATURES[name] ?? MEDIA_FEATURES[base];
  return {
    kind: 'keyword',
    title: node.text,
    label: 'media feature',
    summary: f ? f.summary : 'A media feature: a property of the device or the user\'s settings that the media query tests.',
    details: f?.values ? `Values: ${Object.entries(f.values).map(([v, m]) => `\`${v}\` (${m})`).join(', ')}.` : undefined,
    link: mdn(`@media/${MEDIA_FEATURES[base] ? base : name}`),
  };
}

function keywordQueryDoc(node: Node): DocEntry | undefined {
  const k = node.text.toLowerCase();
  const at = insideAt(node);
  if (at === '@layer' || at === '@property') return undefined;
  if (at === '@media' || at === '@import' || at === '@custom-media') {
    if (MEDIA_TYPES[k]) return { kind: 'keyword', title: node.text, label: 'media type', summary: `A **media type**: ${MEDIA_TYPES[k]}.`, details: 'Media types other than `all`, `screen` and `print` are deprecated.', link: mdn('@media#media_types') };
    const f = MEDIA_FEATURES[k];
    if (f) return { kind: 'keyword', title: node.text, label: 'media feature', summary: `${f.summary} Written without a value, \`(${k})\` matches if the feature is not zero or \`none\`.`, link: mdn(`@media/${k}`) };
  }
  if (at === '@container') {
    if (node.parent?.type === 'parenthesized_query') return featureDoc(node);
    return { kind: 'keyword', title: node.text, label: 'container name', summary: 'The **name** of the query container to test (set with `container-name`); without a name, the nearest container ancestor is used.', link: mdn('@container') };
  }
  return undefined;
}

function functionDoc(node: Node): DocEntry {
  const raw = node.text;
  const name = raw.toLowerCase();
  const base = name.replace(VENDOR, '');
  const f = Object.hasOwn(FUNCTIONS, base) ? FUNCTIONS[base] : undefined;
  const vendor = vendorNote(name);
  if (!f) {
    return {
      kind: 'keyword',
      title: `${raw}()`,
      label: 'function',
      summary: vendor ? `A vendor-prefixed function. ${vendor}` : 'A CSS function Syntax Tutor has no notes on. An unknown function makes the browser ignore the whole declaration.',
      link: mdn(base),
    };
  }
  return { kind: 'keyword', title: `${raw}()`, label: 'function', summary: f.summary, details: [f.details, vendor].filter(Boolean).join('\n\n') || undefined, example: f.example, link: mdn(f.page ?? base) };
}

function attributeDoc(node: Node): DocEntry {
  const name = node.text;
  const k = name.toLowerCase();
  const sel = node.parent!;
  const op = sel.children.find((c) => !!c && !c.isNamed && /^[~|^$*]?=$/.test(c.text))?.text;
  const value = op ? sel.children.find((c) => !!c && c.startIndex > node.endIndex && (c.type === 'string_value' || c.type === 'plain_value'))?.text : undefined;
  const verbs: Record<string, string> = { '=': 'is exactly', '~=': 'contains the word', '|=': 'is or starts with (followed by `-`)', '^=': 'starts with', '$=': 'ends with', '*=': 'contains' };
  const hint = Object.hasOwn(ATTRIBUTES, k) ? ` (\`${k}\` is ${ATTRIBUTES[k]})` : k.startsWith('data-') ? ' (a `data-*` attribute: custom data you put in the HTML)' : k.startsWith('aria-') ? ' (an ARIA attribute, for accessibility)' : '';
  return {
    kind: 'keyword',
    title: `[${name}]`,
    label: 'attribute selector',
    summary: `Matches elements that have the \`${name}\` attribute${hint}${op && value ? ` and whose value ${verbs[op] ?? 'matches'} ${code(value)}` : ''}. Specificity (0, 1, 0), like a class.`,
    details: selectorNote(node) || undefined,
    link: mdn('Attribute_selectors'),
  };
}

function identifierDoc(node: Node): DocEntry | undefined {
  const parent = node.parent;
  switch (node.type) {
    case 'property_name':
      return propertyDoc(node);
    case 'plain_value':
      return valueDoc(node);
    case 'identifier':
    case 'class_name': {
      const cls = node.type === 'identifier' ? parent : node;
      if (cls?.type !== 'class_name' || cls.parent?.type !== 'pseudo_class_selector') return undefined;
      return pseudoClassDoc(cls.text, node);
    }
    case 'tag_name': {
      if (parent?.type === 'pseudo_element_selector' && node.previousSibling?.text === '::') return pseudoElementDoc(node.text);
      if (parent?.type === 'namespace_selector' && node.nextSibling?.text === '|') return undefined;
      return typeSelectorDoc(node);
    }
    case 'feature_name':
      return featureDoc(node);
    case 'keyword_query':
      return keywordQueryDoc(node);
    case 'function_name':
      return functionDoc(node);
    case 'attribute_name':
      return attributeDoc(node);
  }
  return undefined;
}

// ------------------------------------------------------------ token docs

function atRuleDoc(token: Node): DocEntry {
  const k = token.text.toLowerCase();
  const rule = Object.hasOwn(AT_RULES, k) ? AT_RULES[k] : undefined;
  if (rule) return { kind: 'keyword', title: token.text, label: 'at-rule', summary: rule.summary, details: rule.details, example: rule.example || undefined, link: mdn(k) };
  const tool = Object.hasOwn(TOOL_AT_RULES, k) ? TOOL_AT_RULES[k] : undefined;
  if (tool) {
    return {
      kind: 'keyword',
      title: token.text,
      label: 'at-rule (not CSS)',
      summary: `Not a CSS at-rule: it belongs to ${tool}. A build step must turn it into plain CSS; a browser would ignore it.`,
      link: mdn('At-rule'),
    };
  }
  return {
    kind: 'keyword',
    title: token.text,
    label: 'at-rule',
    summary: 'An **at-rule**: an instruction for the CSS engine, starting with `@`. Syntax Tutor has no notes on this one; browsers ignore at-rules they don\'t know (preprocessors such as Sass or PostCSS plugins define their own).',
    link: mdn('At-rule'),
  };
}

/** What the block of an at-rule holds. */
const BLOCK_CONTENT: Record<string, string> = {
  '@media': 'the rules inside apply only when the media query matches',
  '@supports': 'the rules inside apply only when the browser supports the feature',
  '@container': 'the rules inside apply only when the container matches the condition',
  '@layer': 'the rules inside belong to this cascade layer',
  '@scope': 'the rules inside only reach elements within the scope',
  '@starting-style': 'the styles an element starts from when it appears',
};

/** What a `{` or `}` opens or closes. */
function braceDoc(token: Node): DocEntry | undefined {
  const block = token.parent;
  const owner = block?.parent;
  if (!block || !owner) return undefined;
  const open = token.text === '{';
  const title = '{ } (block)';
  if (block.type === 'keyframe_block_list') return { kind: 'syntax', title, summary: `${open ? 'Opens' : 'Closes'} the list of **keyframes** of the \`@keyframes\` rule.`, link: mdn('@keyframes') };
  if (owner.type === 'rule_set') {
    const sel = owner.firstNamedChild;
    return {
      kind: 'syntax',
      title: '{ } (declaration block)',
      summary: `${open ? 'Opens' : 'Closes'} the **declaration block** of the rule${sel?.type === 'selectors' ? ` for ${code(shorten(sel.text, 40))}` : ''}: the \`property: value;\` declarations inside apply to every element the selector matches. It may also contain nested rules.`,
      link: mdn('Syntax#css_rulesets'),
    };
  }
  if (owner.type === 'keyframe_block') return { kind: 'syntax', title, summary: `${open ? 'Opens' : 'Closes'} the styles of this **keyframe**.`, link: mdn('@keyframes') };
  const at = atKeyword(owner);
  if (at) return { kind: 'syntax', title, summary: `${open ? 'Opens' : 'Closes'} the block of the \`${at}\` rule: ${BLOCK_CONTENT[at] ?? 'its descriptors (declarations)'}.`, link: mdn(at) };
  return undefined;
}

/** What a `(` or `)` encloses. */
function parenDoc(token: Node): DocEntry | undefined {
  const p = token.parent;
  if (!p) return undefined;
  const title = '( )';
  switch (p.type) {
    case 'arguments': {
      const owner = p.parent;
      if (owner?.type === 'call_expression') return { kind: 'syntax', title, summary: `Encloses the **arguments** of \`${owner.firstNamedChild?.text ?? ''}()\`. There must be no space between the function name and \`(\`.`, link: mdn('CSS_Values_and_Units/CSS_Value_Functions') };
      if (owner?.type === 'pseudo_class_selector' || owner?.type === 'pseudo_element_selector') return { kind: 'syntax', title, summary: 'Encloses the **argument** of a functional pseudo-class (or pseudo-element), such as a selector list or an `An+B` formula.', link: mdn('Pseudo-classes#functional_pseudo-classes') };
      return undefined;
    }
    case 'feature_query':
    {
      const at = insideAt(token);
      if (at === '@supports') return { kind: 'syntax', title, summary: 'Encloses a **feature test**: `(property: value)` is true if the browser supports that declaration.', link: mdn('@supports') };
      if (at === '@container') return { kind: 'syntax', title, summary: 'Encloses a **container condition**, like `(min-width: 400px)`: a test on the size of the query container.', link: mdn('@container') };
      return { kind: 'syntax', title, summary: 'Encloses a **media feature** test, like `(max-width: 600px)`. The parentheses are required.', link: mdn('@media') };
    }
    case 'parenthesized_query':
      return { kind: 'syntax', title, summary: 'Encloses (and groups) a condition of the query.', link: mdn('@media') };
    case 'selector_query':
      return { kind: 'syntax', title, summary: 'Encloses the selector to test.', link: mdn('@supports') };
    case 'scope_statement':
      return { kind: 'syntax', title, summary: 'Encloses a selector: the scope root (first) or the lower boundary (after `to`).', link: mdn('@scope') };
  }
  return undefined;
}

/** `/` in a value: division in math functions, a separator elsewhere. */
function slashDoc(token: Node): DocEntry | undefined {
  const expr = token.parent;
  if (!expr || expr.type !== 'binary_expression' || isMath(expr)) return undefined;
  const ctx = contextOf(token);
  const fn = ctx.fn?.name;
  const sep = (summary: string, link: string): DocEntry => ({ kind: 'syntax', title: '/ (separator)', label: 'syntax', summary: `Not a division: here \`/\` **separates** two parts of the value. ${summary}`, link });
  if (fn && /^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)$/.test(fn)) return sep('In a color function, what comes after it is the **alpha** (opacity): `rgb(0 0 0 / 50%)` is half-transparent black.', mdn('color_value'));
  switch (ctx.property) {
    case 'aspect-ratio':
      return sep('`16 / 9` is the **ratio** of width to height.', mdn('aspect-ratio'));
    case 'grid-area':
    case 'grid-row':
    case 'grid-column':
    case 'grid-template':
    case 'grid':
      return sep('It splits **start and end lines**: `grid-column: 1 / 3` spans from line 1 to line 3 (two columns).', mdn(ctx.property));
    case 'border-radius':
      return sep('Before it are the horizontal radii, after it the vertical ones: elliptical corners.', mdn('border-radius'));
    case 'font':
      return sep('It separates the font size from the **line height**: `16px/1.5`.', mdn('font'));
    case 'background':
      return sep('It separates the background **position** from its **size**: `center / cover`.', mdn('background'));
  }
  return sep('Some values are written in two parts with a `/` between them.', mdn('Value_definition_syntax'));
}

/** `and` / `or` / `not` / `only` in media queries and feature queries. */
function logicDoc(token: Node): DocEntry | undefined {
  const k = token.text;
  if (!/^(and|or|not|only)$/.test(k)) return undefined;
  const at = insideAt(token) ?? '@media';
  const supports = at === '@supports';
  const what = supports ? 'feature test' : at === '@container' ? 'container condition' : 'media query condition';
  const link = mdn(supports ? '@supports' : at === '@container' ? '@container' : '@media');
  const summaries: Record<string, string> = {
    and: `Combines conditions: the ${supports ? 'feature query' : 'query'} matches only if **both** sides match.`,
    or: `Combines conditions: matches if **either** side matches.${supports ? '' : ' In a media query list, a comma does the same.'}`,
    not: supports ? 'Negates a feature test: `not (display: grid)` matches browsers **without** grid support, for fallbacks.' : `Negates the ${what}: it matches when the condition does **not**.`,
    only: 'Hides the query from very old browsers that don\'t understand media features. Modern browsers ignore it; `only screen` means the same as `screen`.',
  };
  return { kind: 'keyword', title: k, label: 'keyword', summary: summaries[k], example: supports ? '@supports (display: grid) and (gap: 1rem) { ... }' : '@media screen and (min-width: 600px) { ... }\n@media not print { ... }', link };
}

/** A combinator, with what the selector around it means. */
function combinatorDoc(token: Node): DocEntry | undefined {
  const sel = token.parent;
  if (!sel || !/^(child|sibling|adjacent_sibling)_selector$/.test(sel.type)) return undefined;
  const base = docs[`${sel.type}/${token.text}`];
  return base && { ...base, details: `Here: ${describe(sel)}.` };
}

function docFor(token: Node): DocEntry | undefined {
  switch (token.type) {
    case 'integer_value':
    case 'float_value':
      return numberDoc(token);
    case 'color_value':
      return colorDoc(token);
    case 'at_keyword':
      return atRuleDoc(token);
    case '{':
    case '}':
      return braceDoc(token);
    case '(':
    case ')':
      return parenDoc(token);
    case '/':
      return slashDoc(token);
    case '>':
    case '+':
    case '~':
      return combinatorDoc(token);
    case 'and':
    case 'or':
    case 'not':
    case 'only':
      return logicDoc(token);
    case '[':
    case ']':
      if (token.parent?.type === 'grid_value') return { kind: 'syntax', title: '[name] (grid line names)', summary: 'Square brackets in a grid template **name the grid line** at that point, so items can be placed by name: `grid-column: content-start / content-end`.', link: mdn('grid-template-columns#line-name') };
      return undefined;
  }
  return undefined;
}

function literalDoc(literal: Node): DocEntry | undefined {
  switch (literal.type) {
    case 'integer_value':
    case 'float_value':
      return numberDoc(literal);
    case 'color_value':
      return colorDoc(literal);
    case 'string_value':
      return stringDoc(literal);
  }
  return undefined;
}

// ------------------------------------------------------------ structure

function jumpTarget(token: Node): JumpTarget | undefined {
  if (token.type !== 'nesting_selector') return undefined;
  const outer = parentRule(token);
  return outer && { node: outer, verb: 'stands for the selector of' };
}

/**
 * A keyframe's percentage, `from` or `to` belongs to the whole keyframe. A math
 * operator whose node the grammar grouped wrongly (see mathGrouping) gets the whole expression.
 */
function promote(scope: Node): Node {
  if (scope.parent?.type === 'keyframe_block' && /^(integer_value|float_value|from|to)$/.test(scope.type)) return scope.parent;
  if (scope.type === 'binary_expression' && isMath(scope)) {
    const root = mathRoot(scope);
    if (misnested(root)) return root;
  }
  return scope;
}

function nodeLabel(node: Node): string | undefined {
  switch (node.type) {
    case 'rule_set': {
      const sel = node.firstNamedChild;
      return sel?.type === 'selectors' ? `the rule ${code(shorten(sel.text, 40))}` : 'the rule';
    }
    case 'declaration': {
      const prop = node.firstNamedChild;
      return prop?.type === 'property_name' ? `the ${code(prop.text)} declaration` : 'the declaration';
    }
    case 'keyframe_block':
      return `the ${code(node.firstNamedChild?.text ?? '')} keyframe`;
    case 'block':
    case 'keyframe_block_list': {
      const owner = node.parent && nodeLabel(node.parent);
      return owner ? `the block of ${owner}` : undefined;
    }
  }
  // One selector of a rule's selector list.
  if (node.parent?.type === 'selectors' && SELECTOR_TYPES.has(node.type)) return `the selector ${code(shorten(node.text, 40))}`;
  const at = atKeyword(node);
  return at ? `the ${code(at)} rule` : undefined;
}

export const css: LanguageSpec = {
  comments: cssComments,
  id: 'css',
  // Tailwind CSS IntelliSense and PostCSS Language Support give `.css` files their own language ids.
  languageIds: ['css', 'tailwindcss', 'postcss'],
  displayName: 'CSS',
  wasm: 'tree-sitter-css.wasm',
  fence: 'css',
  docs,
  identifierTypes: new Set([
    'identifier', 'class_name', 'id_name', 'tag_name', 'property_name', 'plain_value', 'keyframes_name', 'feature_name', 'function_name',
    'attribute_name', 'namespace_name', 'keyword_query',
  ]),
  wrapperTypes: new Set([...SELECTOR_TYPES, 'selectors', 'class_name', 'arguments', 'to']),
  noScopeTokens: new Set([',', ';']),
  ownTextTypes: new Set(['integer_value', 'float_value', 'color_value']),
  role: (node) => role(node),
  jumpTarget,
  promote,
  docFor,
  literalDoc,
  identifierDoc: (node) => identifierDoc(node),
  // Identifiers only get docs through identifierDoc: `.from` is a class, not the keyframe `from`.
  acceptIdentifierDoc: () => false,
  // Math with CSS's precedence; `/` outside `calc()` separates parts of a value (`grid-area: 1 / 3 / 2`), it doesn't divide.
  grouping: mathGrouping,
  labelOf: nodeLabel,
};
