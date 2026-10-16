// "Explain this line" (src/core/lines.ts) across languages.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { before, describe, test } from 'node:test';
import { at, load } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { explainLines } = require('../dist/test/core.js');

const L = {};
before(async () => {
  L.go = await load('go', 'go', 'tour.go');
  L.rs = await load('rust', 'rust', 'tour.rs');
  L.ts = await load('typescript', 'typescript', 'tour.ts');
  L.cs = await load('csharp', 'csharp', 'tour.cs');
});

/** Explain the line(s) starting at the line containing `needle`. */
function lines(l, needle, extra = 0) {
  const row = at(l.src, needle).row;
  return explainLines(l.spec, l.tree, row, row + extra);
}
const heads = (r) => r.items.map((i) => `${i.text} | ${i.markdown.split('\n')[0]}`);

describe('explain this line', () => {
  test('every part of a Go range loop, in reading order, with the structure', () => {
    const r = lines(L.go, 'for _, n := range nums {');
    assert.equal(r.structure, 'This line starts the `for` statement (lines 38–40).');
    assert.deepEqual(r.items.map((i) => i.text), ['for', '_', 'n', ':=', 'range', 'nums', '{']);
    assert.match(r.items[2].markdown, /\*\*Loop variable\*\*/);
    assert.match(r.items[3].markdown, /:= \(in range\)/);
    assert.match(r.items[5].markdown, /declared on line 36 \(parameter\)/);
    assert.ok(r.items[5].plain);
  });

  test('plain names point at their declaration; members do not guess', () => {
    const r = lines(L.go, 'total += n');
    assert.equal(r.structure, 'This line is the assignment statement (line 39).');
    assert.match(r.items[0].markdown, /`total`.*\n\nUsed here; declared on line 37 \(variable\)/);
    assert.match(r.items[1].markdown, /declared on line 38 \(loop variable\)/);
    const ts = lines(L.ts, 'if (isString(shape.name)');
    const name = ts.items.find((i) => i.text === 'name');
    assert.match(name.markdown, /A field or method of the value before the `\.`/);
  });

  test('a closing bracket whose opener is on the line is skipped; the opener explains the pair', () => {
    const r = lines(L.ts, 'if (isString(shape.name)');
    assert.equal(r.items.filter((i) => i.text === ')').length, 0);
    assert.match(r.items.find((i) => i.text === '(').markdown, /condition of the `if` statement/);
  });

  test('Rust: let, ?, turbofish and loop variables', () => {
    const r = lines(L.rs, 'let n = item.trim()');
    assert.equal(r.structure, 'This line is the `let` declaration (line 45).');
    assert.deepEqual(
      heads(r).filter((h) => !h.includes('brackets')).map((h) => h.split(' | ')[0]),
      ['let', 'n', 'item', 'trim', 'parse', '::', 'i32', '?'],
    );
    assert.match(r.items.find((i) => i.text === 'item').markdown, /declared on line 44 \(loop variable\)/);
  });

  test('several lines at once', () => {
    const r = lines(L.cs, 'foreach (var item in items)', 3);
    assert.match(r.structure, /^These lines are the `foreach` statement/);
    assert.ok(r.items.some((i) => i.text === 'foreach'));
    assert.ok(r.items.length > 6);
  });
});
