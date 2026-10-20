// Embedded languages (src/core/embedded.ts): parts of a document in another
// language (an HTML <script>, an onclick attribute) are parsed with their own
// grammar and explained by their own spec, at their positions in the document.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';
import { at, readWasm } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Parsers, parseEmbedded, regionAt, explain, scopeFor, explainDocumentLines, outlineFunction } = require('../dist/test/core.js');

/** Parses `src` as `spec`, with the specs it may embed, and returns its parts plus query helpers. */
async function document(spec, embeddable, src) {
  const specs = new Map([spec, ...embeddable].map((s) => [s.id, s]));
  const parsers = await Parsers.load(readWasm, [...specs.values()]);
  const own = { spec, tree: parsers.parse(spec.id, src) };
  const parts = { own, embedded: parseEmbedded(parsers, specs, spec, own.tree, src) };
  const regionOf = (needle, nth = 0, offset = 0) => regionAt(parts.own, parts.embedded, at(src, needle, nth, offset));
  return {
    parts,
    regionOf,
    /** Hover markdown at a snippet, explained by the language at that spot. */
    hover(needle, nth = 0, offset = 0) {
      const r = regionOf(needle, nth, offset);
      return explain(r.spec, r.tree, at(src, needle, nth, offset))?.markdown;
    },
    scope(needle, nth = 0, offset = 0) {
      const r = regionOf(needle, nth, offset);
      return scopeFor(r.spec, r.tree, at(src, needle, nth, offset), false);
    },
  };
}

const html = require('../dist/test/lang-html.js').html;
const javascript = require('../dist/test/lang-javascript.js').javascript;
const css = require('../dist/test/lang-css.js').css;

const PAGE = `<!DOCTYPE html>
<html>
<body>
  <button id="go" onclick="count += 1; render()">Go</button>
  <script>
    let count = 0;
    function render() {
      if (count > 3) return;
      document.getElementById('go').textContent = 'Clicked ' + count;
    }
  </script>
</body>
</html>
`;

describe('embedded languages', () => {
  test('HTML: <script> contents are JavaScript, at their place in the file', async () => {
    const doc = await document(html, [javascript], PAGE);
    assert.deepEqual(doc.parts.embedded.map((r) => r.spec.id), ['javascript', 'javascript']);
    assert.equal(doc.regionOf('let count').spec.id, 'javascript');
    assert.match(doc.hover('let count'), /^\*\*`let`\*\* · JavaScript keyword/);
    assert.match(doc.hover('function render'), /JavaScript keyword/);
    // The HTML around it is still explained as HTML.
    assert.equal(doc.regionOf('<script>', 0, 1).spec.id, 'html');
    assert.match(doc.hover('<script>', 0, 1), /HTML element/);
    assert.match(doc.hover('button id', 0, 1), /HTML element/);
  });

  test('HTML: scopes inside a <script> are JavaScript scopes in document coordinates', async () => {
    const doc = await document(html, [javascript], PAGE);
    const scope = doc.scope('if (count');
    const lines = PAGE.split('\n');
    assert.equal(lines[scope.primary.start.row].trim().startsWith('if (count > 3)'), true);
    assert.equal(scope.primary.start.row, 7);
  });

  test('HTML: onclick="..." is JavaScript', async () => {
    const doc = await document(html, [javascript], PAGE);
    assert.equal(doc.regionOf('count += 1').spec.id, 'javascript');
    assert.match(doc.hover('+='), /JavaScript operator/);
    // The attribute name itself is still HTML.
    assert.match(doc.hover('onclick'), /HTML/);
  });

  test('Explain This Line mixes the languages of a line, in reading order', async () => {
    const doc = await document(html, [javascript], PAGE);
    const row = 3; // <button id="go" onclick="count += 1; render()">Go</button>
    const line = PAGE.split('\n')[row];
    const result = explainDocumentLines(doc.parts, row, row, { row, column: line.indexOf('<') });
    const texts = result.items.map((i) => i.text);
    // HTML parts (the tag, attribute names) and JavaScript parts (+=, the call) together, sorted by position.
    assert.ok(texts.includes('button'), texts.join(' '));
    assert.ok(texts.includes('onclick'), texts.join(' '));
    assert.ok(texts.includes('+='), texts.join(' '));
    const cols = result.items.map((i) => i.span.start.column);
    assert.deepEqual(cols, [...cols].sort((a, b) => a - b));
    assert.match(result.structure ?? '', /button/);
  });

  test('Explain This Line on a <script> line explains it as JavaScript', async () => {
    const doc = await document(html, [javascript], PAGE);
    const row = 5; // let count = 0;
    const result = explainDocumentLines(doc.parts, row, row, { row, column: 4 });
    assert.deepEqual(result.items.map((i) => i.text).slice(0, 2), ['let', 'count']);
    assert.match(result.structure ?? '', /lexical declaration|`let`/);
  });

  test('Explain This Function works on a function inside <script>', async () => {
    const doc = await document(html, [javascript], PAGE);
    const r = doc.regionOf('if (count');
    const outline = outlineFunction(r.spec, r.tree, at(PAGE, 'if (count'));
    assert.equal(outline.label, 'the function `render`');
    assert.equal(outline.rows[0].text, 'If `count > 3`:');
    assert.equal(outline.rows[1].text, 'Returns early');
    assert.equal(outline.rows[1].depth, 1);
    assert.match(outline.rows[2].text, /^Sets /);
    assert.equal(outline.span.start.row, 6);
  });

  test('HTML: <style> contents are CSS', async () => {
    const src = '<html>\n<head>\n  <style>\n    .card > p { color: teal; margin: calc(1rem + 2px); }\n  </style>\n</head>\n</html>\n';
    const doc = await document(html, [javascript, css], src);
    assert.deepEqual(doc.parts.embedded.map((r) => r.spec.id), ['css']);
    assert.match(doc.hover('color'), /^\*\*`color`\*\* · CSS property/);
    assert.match(doc.hover('rem'), /CSS/);
    assert.equal(doc.regionOf('<style>', 0, 1).spec.id, 'html');
    const rule = doc.scope('.card', 0, 1);
    assert.equal(rule.primary.start.row, 3);
  });

  test('a <style lang="scss"> has no grammar here, so it stays unexplained HTML text', async () => {
    const doc = await document(html, [javascript, css], '<style lang="scss">\n$x: 1px;\n.a { b: $x; }\n</style>\n');
    assert.deepEqual(doc.parts.embedded, []);
  });

  test('a <script> with a data type (JSON) is not parsed as JavaScript', async () => {
    const src = '<script type="application/json">{"a": 1}</script>\n<script type="module">import x from "y";</script>\n';
    const doc = await document(html, [javascript], src);
    assert.deepEqual(doc.parts.embedded.map((r) => r.spec.id), ['javascript']);
    assert.equal(doc.regionOf('"a"').spec.id, 'html');
    assert.equal(doc.regionOf('import').spec.id, 'javascript');
  });

  test('an embedded language whose grammar is not loaded is skipped', async () => {
    const specs = new Map([[html.id, html]]);
    const parsers = await Parsers.load(readWasm, [html]);
    const tree = parsers.parse(html.id, PAGE);
    assert.deepEqual(parseEmbedded(parsers, specs, html, tree, PAGE), []);
  });
});
