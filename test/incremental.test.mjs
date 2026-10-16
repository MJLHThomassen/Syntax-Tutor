// Incremental parsing (src/core/incremental.ts): after recording edits on the old
// tree, re-parsing must give exactly the tree a full parse gives, node for node
// and position for position, including after non-ASCII text.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';

const require = createRequire(import.meta.url);
const { Parsers, editTree } = require('../dist/test/core.js');

const LANGS = [
  ['go', 'go', 'tour.go'],
  ['rust', 'rust', 'tour.rs'],
  ['c', 'c', 'tour.c'],
  ['cpp', 'cpp', 'tour.cpp'],
  ['csharp', 'csharp', 'tour.cs'],
  ['javascript', 'javascript', 'tour.js'],
  ['typescript', 'typescript', 'tour.ts'],
];

/** Row/column (UTF-16) of an offset. */
function pointAt(text, offset) {
  const before = text.slice(0, offset).split('\n');
  return { row: before.length - 1, column: before.at(-1).length };
}

/** Deterministic pseudo-random numbers, so failures reproduce. */
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
}

/** Every node as "type start-end", in document order. */
function shape(tree) {
  const out = [];
  const walk = (n) => {
    out.push(`${n.type} ${n.startPosition.row}:${n.startPosition.column}-${n.endPosition.row}:${n.endPosition.column} [${n.startIndex},${n.endIndex}]`);
    for (let i = 0; i < n.childCount; i++) walk(n.child(i));
  };
  walk(tree.rootNode);
  return out;
}

/**
 * A batch of non-overlapping edits that keep the code valid, all in coordinates of
 * `text`: rename an identifier, add text inside a string, insert a comment line.
 */
function makeBatch(tree, text, random, comment) {
  const ids = [];
  const strings = [];
  const lineStarts = [];
  const walk = (n) => {
    if (n.childCount === 0 && /^(identifier|field_identifier|property_identifier|type_identifier)$/.test(n.type)) ids.push(n);
    if (/^(string_content|string_fragment|interpreted_string_literal_content)$/.test(n.type) && n.text.length > 1) strings.push(n);
    for (let i = 0; i < n.childCount; i++) walk(n.child(i));
  };
  walk(tree.rootNode);
  for (let i = 0, off = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);
  // Only insert comments before lines that start a statement-ish line (not inside strings or comments).
  const safeLines = lineStarts.filter((o) => /^\s*(return|let|const|var|if|for|int|auto|fn|func|\})\b/.test(text.slice(o, o + 40)) && !/`/.test(text.slice(o, o + 200).split('\n')[0]));

  const pick = (xs) => xs[Math.floor(random() * xs.length)];
  const candidates = [];
  const id = pick(ids);
  if (id) candidates.push({ from: id.startIndex, to: id.endIndex, text: `${id.text}_é${Math.floor(random() * 100)}` });
  const str = pick(strings);
  if (str) {
    const at = str.startIndex + 1 + Math.floor(random() * (str.text.length - 1));
    if (!/\\/.test(text.slice(at - 1, at + 1))) candidates.push({ from: at, to: at, text: 'é👋x' });
  }
  const line = pick(safeLines);
  if (line !== undefined) candidates.push({ from: line, to: line, text: `${comment} héllo 👋 ${Math.floor(random() * 1000)}\n` });
  // Drop overlaps so all edits refer to the same old text, like one VS Code change event.
  const batch = [];
  for (const c of candidates.sort((a, b) => a.from - b.from)) if (!batch.length || c.from >= batch.at(-1).to) batch.push(c);
  return batch;
}

function apply(text, batch) {
  let out = text;
  for (const c of [...batch].sort((a, b) => b.from - a.from)) out = out.slice(0, c.from) + c.text + out.slice(c.to);
  return out;
}

describe('incremental parsing', () => {
  for (const [file, exp, sample] of LANGS) {
    test(`${exp}: edited + re-parsed tree equals a full parse`, async () => {
      const spec = require(`../dist/test/lang-${file}.js`)[exp];
      const parsers = await Parsers.load(new URL('../dist/wasm', import.meta.url).pathname, [spec]);
      let text = readFileSync(new URL(`../samples/${sample}`, import.meta.url), 'utf8');
      let tree = parsers.parse(spec.id, text);
      assert.equal(tree.rootNode.hasError, false, 'sample should parse cleanly');
      const random = rng(42);
      for (let round = 0; round < 25; round++) {
        const batch = makeBatch(tree, text, random, '//');
        assert.ok(batch.length > 0);
        const newText = apply(text, batch);
        editTree(
          tree,
          batch.map((c) => ({
            rangeOffset: c.from,
            rangeLength: c.to - c.from,
            start: pointAt(text, c.from),
            end: pointAt(text, c.to),
            text: c.text,
          })),
        );
        const incremental = parsers.parse(spec.id, newText, tree);
        const full = parsers.parse(spec.id, newText);
        assert.deepEqual(shape(incremental), shape(full), `round ${round}: ${JSON.stringify(batch)}`);
        full.delete();
        tree.delete();
        tree = incremental;
        text = newText;
      }
      tree.delete();
      parsers.dispose();
    });
  }
});
