// Shared helpers for the analyzer tests: parse a sample file with one language
// spec and query hovers/scopes by searching for snippets of the sample.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Parsers, explain, scopeFor } = require('../dist/test/core.js');

/** Reads a file from dist/wasm, for Parsers.load. */
export const readWasm = (file) => readFile(new URL(`../dist/wasm/${file}`, import.meta.url));

/** Position of the `nth` occurrence of `needle` (plus `offset` chars), in UTF-16 columns like VS Code. */
export function at(src, needle, nth = 0, offset = 0) {
  let i = -1;
  for (let k = 0; k <= nth; k++) {
    i = src.indexOf(needle, i + 1);
    assert.notEqual(i, -1, `"${needle}" #${nth} not found`);
  }
  i += offset;
  const lines = src.slice(0, i).split('\n');
  return { row: lines.length - 1, column: lines.at(-1).length };
}

/** Source text covered by a span. */
export function text(src, span) {
  const lines = src.split('\n');
  if (span.start.row === span.end.row) return lines[span.start.row].slice(span.start.column, span.end.column);
  return [
    lines[span.start.row].slice(span.start.column),
    ...lines.slice(span.start.row + 1, span.end.row),
    lines[span.end.row].slice(0, span.end.column),
  ].join('\n');
}

/**
 * Loads `src/docs/<file>.ts`'s export `exportName` (from its test bundle) and
 * parses `samples/<sample>`. Returns query helpers bound to that sample.
 */
export async function load(file, exportName, sample) {
  const spec = require(`../dist/test/lang-${file}.js`)[exportName];
  assert.ok(spec, `${exportName} not exported from lang-${file}.js`);
  const parsers = await Parsers.load(readWasm, [spec]);
  const src = readFileSync(new URL(`../samples/${sample}`, import.meta.url), 'utf8');
  const tree = parsers.parse(spec.id, src);
  return {
    spec,
    src,
    tree,
    /** Hover explanation at a snippet, or undefined. */
    hover: (needle, nth, offset) => explain(spec, tree, at(src, needle, nth, offset)),
    /** Scope at a snippet, or undefined. `lookBehind` mimics a text cursor just after a word. */
    scope: (needle, nth, offset, lookBehind) => scopeFor(spec, tree, at(src, needle, nth, offset), lookBehind),
    /** Source text of a span. */
    text: (span) => text(src, span),
  };
}
