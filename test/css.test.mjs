import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { before, describe, test } from 'node:test';
import { at, load, readWasm, text } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Parsers, explain, scopeFor, explainLines, outlineFunction } = require('../dist/test/core.js');

let L;
before(async () => {
  L = await load('css', 'css', 'tour.css');
});

const hover = (...args) => L.hover(...args);
const scope = (...args) => L.scope(...args);
const md = (...args) => hover(...args)?.markdown;
const scopeText = (...args) => {
  const s = scope(...args);
  return s && L.text(s.primary);
};

describe('CSS hovers', () => {
  test('the sample parses cleanly', () => {
    assert.equal(L.tree.rootNode.hasError, false);
  });

  test('properties: summary, example, MDN link, inherited and vendor notes', () => {
    const h = md('display: flex');
    assert.match(h, /^\*\*`display`\*\* · CSS property/);
    assert.match(h, /```css\n/);
    assert.match(h, /developer\.mozilla\.org\/en-US\/docs\/Web\/CSS\/display/);
    assert.match(md('line-height'), /\*\*Inherited\*\*/);
    assert.doesNotMatch(md('display: flex'), /Inherited/);
    assert.match(md('-webkit-appearance'), /native look[\s\S]*vendor-prefixed/);
    assert.match(md('font-display'), /CSS descriptor[\s\S]*while the web font is loading/);
  });

  test('custom properties: declared vs used in var()', () => {
    assert.match(md('--brand: #'), /^\*\*Custom property\*\* · Declares the \*\*custom property\*\* \(CSS variable\) `--brand` on the elements `:root` matches[\s\S]*Used on line 78/);
    assert.match(md('--gap)', 0), /^\*\*Custom property reference\*\* · Reads the custom property `--gap`, declared on line 9 \(in `:root`\)/);
    assert.match(md('--brand)'), /declared on lines 8 and 109/);
    // var(--x) highlights the declaration.
    assert.equal(scopeText('--gap)'), '--gap: 1rem;');
    assert.equal(scopeText('--brand: #'), '--brand: #3366ff;');
  });

  test('values are explained in context', () => {
    assert.match(md('flex;'), /^\*\*`flex`\*\* · CSS keyword\n\nAs a value of `display`: a \*\*flex container\*\*/);
    assert.match(md('column;'), /As a value of `flex-direction`/);
    assert.match(md('relative'), /containing block/);
    assert.match(md('linear infinite'), /`animation-timing-function` part/);
    assert.match(md('infinite'), /forever/);
    assert.match(md('none !important'), /no animation runs/);
    assert.match(md('swap'), /fallback font right away/);
    assert.match(md('auto-fit'), /empty tracks collapse/);
    assert.match(md('to right'), /direction/);
    assert.match(md('transform 200ms'), /CSS property name[\s\S]*property to animate/);
    assert.match(md('system-ui'), /user-interface font/);
    assert.match(md('gray;'), /CSS named color[\s\S]*`#808080`/);
    assert.match(md('transparent'), /transparent/);
    assert.match(md('dark)'), /media feature value[\s\S]*dark/);
    assert.match(md('inline-grid'), /As a value of `display`/);
  });

  test('numbers and units say what they mean', () => {
    assert.match(md('1rem'), /^\*\*`1rem`\*\* · CSS length\n\n\*\*1rem\*\* = 1 × the font size of the \*\*root element\*\*[\s\S]*16px/);
    assert.equal(L.text(hover('1rem', 0, 0).span), '1rem'); // the number part, not only the unit
    assert.equal(L.text(hover('1rem', 0, 2).span), '1rem');
    assert.match(md('60ch'), /60 characters/);
    assert.match(md('100%'), /\*\*100%\*\* of the width of the containing block/);
    assert.match(md('200ms'), /CSS time[\s\S]*0\.2s/);
    assert.match(md('1turn'), /360deg/);
    assert.match(md('1fr'), /CSS flex value[\s\S]*free space/);
    assert.match(md('0.5em'), /font size of this element/);
    assert.match(md('1.5;'), /multiple of the element's font size/);
    assert.match(md('10;'), /stacking level/);
    assert.match(md('20 20 20'), /\*\*red\*\* channel/);
    assert.match(md('90%'), /\*\*alpha\*\*/);
    assert.match(md('0.15 250'), /\*\*chroma\*\*/);
  });

  test('colors and strings', () => {
    assert.match(md('#3366ff'), /hex color[\s\S]*`rgb\(51 102 255\)`/);
    assert.equal(L.text(hover('#3366ff', 0, 3).span), '#3366ff');
    assert.match(md('#ddd'), /short form doubles each digit: `#ddd` is `#dddddd`/);
    assert.match(md('" ↗"'), /Generated text/);
    assert.match(md('"header header"'), /\*\*row\*\* of the area map/);
    assert.match(md('"woff2")'), /font format/);
  });

  test('functions', () => {
    assert.match(md('calc(var'), /^\*\*`calc\(\)`\*\* · CSS function/);
    assert.match(md('var(--gap)'), /\*\*fallback\*\*/);
    assert.match(md('minmax'), /at least/);
    assert.match(md('translateY'), /vertically/);
    assert.match(md('oklch'), /OKLCH/);
    assert.match(md('linear-gradient'), /straight line/);
    assert.equal(scopeText('calc(100%'), 'calc(100% - 2 * var(--gap))');
  });

  test('calc() uses CSS precedence, not the grammar\'s left-to-right grouping', () => {
    const minus = md('- 2 *');
    assert.match(minus, /↳ \*\*Here:\*\* `-` combines `100%` and `2 \* var\(--gap\)`\./);
    assert.match(minus, /\*\*Grouped as:\*\* `100% - \(2 \* var\(--gap\)\)`/);
    assert.match(md('* var(--gap));'), /`\*` combines `2` and `var\(--gap\)`/);
    // The grammar's node for `-` is `100% - 2`: the whole expression is highlighted instead.
    assert.equal(scopeText('- 2 *'), '100% - 2 * var(--gap)');
    // A lone operator has no grouping note; `/` outside calc() separates.
    assert.doesNotMatch(md('* 2)'), /Grouped as/);
    assert.match(md('/ 9;'), /Not a division[\s\S]*ratio/);
    assert.doesNotMatch(md('/ 9;'), /Grouped as/);
    assert.match(md('/ 90%'), /alpha/);
  });

  test('selectors', () => {
    assert.match(md('*,\n*::before'), /universal selector/);
    assert.match(md('.card {', 0), /class selector/);
    assert.match(md('card {'), /^\*\*Class selector\*\* · Matches elements whose `class` attribute contains `card`[\s\S]*also styles `\.card` on lines/);
    assert.match(md('main {'), /^\*\*ID selector\*\*[\s\S]*\*\*\(1, 0, 0\)\*\*/);
    assert.match(md('body {'), /\*\*`body`\*\* · CSS type selector/);
    assert.match(md('> h2'), /child combinator[\s\S]*Here: `h2` elements that are direct children of an element matching `\.card`/);
    assert.match(md('+ p'), /next-sibling combinator/);
    assert.match(md('~ .meta'), /subsequent-sibling combinator[\s\S]*Here: `\.meta` elements that come somewhere after a sibling matching `\.card \.title`/);
    assert.match(md('title ~'), /The selector `\.card \.title ~ \.meta` matches `\.meta` elements[\s\S]*specificity \*\*\(0, 3, 0\)\*\*/);
    assert.match(md('[href'), /attribute selector/);
    assert.match(md('href^'), /\*\*`\[href\]`\*\* · CSS attribute selector[\s\S]*starts with `"https"`/);
    assert.match(md('^='), /starts with/);
    assert.match(md('done'), /specificity \*\*\(0, 2, 1\)\*\*/); // li:nth-child(2n + 1):not(.done)
  });

  test('pseudo-classes and pseudo-elements', () => {
    assert.match(md('hover,'), /^\*\*`:hover`\*\* · CSS pseudo-class\n\nMatches while the \*\*mouse pointer is over\*\*/);
    assert.match(md('focus-within'), /contains/);
    assert.match(md('nth-child'), /^\*\*`:nth-child`\*\* · CSS pseudo-class/);
    assert.match(md('2n + 1'), /1st, 3rd, 5th, 7th, \.\.\. elements/);
    assert.match(md('not(.done)'), /do \*\*not\*\* match/);
    assert.match(md('root {'), /root element/);
    assert.match(md('before,'), /^\*\*`::before`\*\* · CSS pseudo-element/);
    assert.match(md('::after {'), /pseudo-element/);
  });

  test('nesting: & stands for the parent rule', () => {
    const h = md('&:hover');
    assert.match(h, /nesting selector/);
    assert.match(h, /↳ \*\*Here:\*\* stands for the selector of `\.button \{`/);
    const s = scope('&:hover');
    assert.equal(L.text(s.primary).split('\n')[0], '&:hover {');
    assert.equal(L.text(s.related).split('\n')[0], '.button {');
  });

  test('at-rules, media queries and keyframes', () => {
    assert.match(md('@media screen'), /^\*\*`@media`\*\* · CSS at-rule/);
    assert.match(md('@import'), /Loads another stylesheet/);
    assert.match(md('@charset'), /encoding/);
    assert.match(md('@font-face'), /web font/);
    assert.match(md('@layer reset'), /cascade layer/);
    assert.match(md('@container'), /container query/);
    assert.match(md('@supports'), /feature query/);
    assert.match(md('@keyframes'), /animation/);
    assert.match(md('screen and'), /CSS media type/);
    assert.match(md('and (max'), /\*\*both\*\*/);
    assert.match(md('not (display'), /without/);
    assert.match(md('max-width: 600'), /CSS media feature[\s\S]*at most/);
    assert.match(md('prefers-reduced-motion'), /minimize animations/);
    assert.match(md('min-width: 400'), /container feature/);
    assert.match(md('display: grid) and'), /In `@supports`/);
    assert.match(md('from {'), /same as `0%`/);
    assert.match(md('50% {'), /keyframe[\s\S]*halfway/);
    assert.match(md('to {'), /same as `100%`/);
    assert.match(md('!important'), /CSS flag/);
  });

  test('punctuation', () => {
    assert.match(md(': 1rem'), /Separates the \*\*property\*\* from its \*\*value\*\*/);
    assert.match(md(';\n  --gap'), /Ends a \*\*declaration\*\*/);
    assert.match(md(',\n*::before'), /selector list/);
    assert.match(md(', system-ui'), /value list/);
    assert.match(md('{\n  --brand'), /declaration block[\s\S]*`:root`/);
    assert.match(md('{\n  .card {\n    padding'), /block of the `@media` rule/);
    assert.match(md('(max-width'), /media feature/);
  });
});

describe('CSS scopes', () => {
  test('a selector highlights its whole rule, with the closing brace outlined', () => {
    const s = scope('card {');
    assert.ok(L.text(s.primary).startsWith('.card {\n  display: flex;'));
    assert.ok(L.text(s.primary).endsWith('}'));
    assert.deepEqual(s.boundaries.map((b) => L.text(b)), ['card', '}']);
    assert.ok(scopeText('hover,').startsWith('.card:hover,\n.card:focus-within {'));
    assert.ok(scopeText('> h2').startsWith('.card > h2 + p {'));
    assert.ok(scopeText('body {').startsWith('body {'));
  });

  test('a property highlights its declaration', () => {
    assert.equal(scopeText('flex-direction: column'), 'flex-direction: column;');
    assert.equal(scopeText('!important'), 'animation: none !important;');
    assert.equal(scope('flex;'), undefined); // values don't scope
  });

  test('an at-rule keyword highlights the whole at-rule with its block', () => {
    const s = scope('@media screen');
    assert.ok(L.text(s.primary).startsWith('@media screen and (max-width: 600px) {'));
    assert.deepEqual(s.boundaries.map((b) => L.text(b)), ['@media', '}']);
    assert.ok(scopeText('@keyframes').endsWith('}\n}'));
    assert.equal(scopeText('@layer reset'), '@layer reset, components;');
    assert.ok(scopeText('50% {').startsWith('50% {'));
    assert.equal(scopeText('max-width: 600'), '(max-width: 600px)');
  });

  test('names highlight what they declare or refer to', () => {
    assert.ok(scopeText('spin {').startsWith('@keyframes spin {'));
    assert.ok(scopeText('spin 1s').startsWith('@keyframes spin {')); // animation: spin → its @keyframes
    assert.match(md('spin 1s'), /^\*\*Keyframes reference\*\* · Runs the animation `spin`, declared by `@keyframes spin` on line 89/);
    assert.match(md('spin {'), /^\*\*Keyframes name\*\*[\s\S]*Used on line 86/);
    assert.match(md('components {'), /^\*\*Layer name\*\* · Adds rules to the \*\*cascade layer\*\* `components` \(first named on line 5\)/);
    assert.match(md('reset, components'), /Declares the \*\*cascade layer\*\* `reset`/);
  });

  test('Explain This Line reads CSS', () => {
    const line = (needle) => explainLines(L.spec, L.tree, at(L.src, needle).row, at(L.src, needle).row);
    const decl = line('  width: calc(100% - 2');
    assert.equal(decl.structure, 'This line is the `width` declaration (line 32).');
    assert.deepEqual(decl.items.map((i) => i.text), ['width', ':', 'calc', '(', '100%', '-', '2', '*', 'var', '(', '--gap']);
    assert.match(decl.items.at(-1).markdown, /declared on line 9/);
    assert.equal(line('.card > h2').structure, 'This line starts the rule `.card > h2 + p` (lines 45–47).');
    assert.equal(line('@media screen').structure, 'This line starts the `@media` rule (lines 101–105).');
    assert.equal(line('  50% {').structure, 'This line starts the `50%` keyframe (lines 93–95).');
    assert.equal(line('*::before').structure, 'This line is the selector `*::before` (line 15).');
    const multi = explainLines(L.spec, L.tree, at(L.src, '@media screen').row, at(L.src, '@media screen').row + 4);
    assert.equal(multi.items.find((i) => i.text === 'padding').scope.label, 'the block of the rule `.card`');
    assert.equal(multi.items.find((i) => i.text === 'card').scope.label, 'the block of the `@media` rule');
  });

  test('Explain This Function: CSS has no functions', () => {
    assert.equal(outlineFunction(L.spec, L.tree, at(L.src, 'calc(100%')), undefined);
    assert.equal(outlineFunction(L.spec, L.tree, at(L.src, 'display: flex')), undefined);
  });
});

describe('CSS embedded in an HTML file', () => {
  const html = [
    '<!doctype html>',
    '<html>',
    '<head>',
    '  <title>Embedded</title>',
    '  <style>:root { --accent: teal; }',
    '    .card:hover { color: var(--accent); margin: 1rem; }',
    '    @media (max-width: 600px) { .card { padding: 0; } }',
    '  </style>',
    '</head>',
    '<body><p class="card">Hi</p></body>',
    '</html>',
    '',
  ].join('\n');
  const start = html.indexOf(':root');
  const end = html.indexOf('  </style>');
  const point = (offset) => {
    const lines = html.slice(0, offset).split('\n');
    return { row: lines.length - 1, column: lines.at(-1).length };
  };
  const range = { startIndex: start, endIndex: end, startPosition: point(start), endPosition: point(end) };
  const pos = (needle, offset = 0) => point(html.indexOf(needle) + offset);
  let spec;
  let tree;
  before(async () => {
    spec = require('../dist/test/lang-css.js').css;
    const parsers = await Parsers.load(readWasm, [spec]);
    tree = parsers.parse('css', html, undefined, [range]);
  });

  test('the stylesheet starts in the middle of the file', () => {
    assert.equal(tree.rootNode.type, 'stylesheet');
    assert.equal(tree.rootNode.hasError, false);
    assert.deepEqual(tree.rootNode.startPosition, { row: 4, column: 9 });
  });

  test('hovers and scopes use positions in the whole file', () => {
    const h = explain(spec, tree, pos('hover {', 1));
    assert.match(h.markdown, /^\*\*`:hover`\*\* · CSS pseudo-class/);
    assert.equal(text(html, h.span), 'hover');
    const s = scopeFor(spec, tree, pos('hover {', 1));
    assert.equal(text(html, s.primary), '.card:hover { color: var(--accent); margin: 1rem; }');
    const ref = scopeFor(spec, tree, pos('--accent)', 1));
    assert.equal(text(html, ref.primary), '--accent: teal;');
    assert.match(explain(spec, tree, pos('--accent)', 1)).markdown, /declared on line 5 \(in `:root`\)/);
    assert.match(explain(spec, tree, pos('1rem', 0)).markdown, /\*\*1rem\*\* = 1 ×/);
    const media = scopeFor(spec, tree, pos('@media', 1));
    assert.equal(text(html, media.primary), '@media (max-width: 600px) { .card { padding: 0; } }');
    // Outside the stylesheet there is nothing to explain.
    assert.equal(explain(spec, tree, pos('Embedded')), undefined);
    assert.equal(explain(spec, tree, pos('class="card"', 8)), undefined);
  });

  test('Explain This Line works on lines that are only partly CSS', () => {
    const r = explainLines(spec, tree, 4, 4);
    assert.deepEqual(r.items.map((i) => i.text), [':', 'root', '{', '--accent', ':', 'teal']);
    assert.equal(r.structure, 'This line is the rule `:root` (line 5).');
  });
});
