// Every operator gets an explanation: each operator token a grammar defines has a
// doc entry, and every operator that actually occurs in the samples is explained
// on hover. Shared operator docs live in src/docs/operators.ts.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';

const require = createRequire(import.meta.url);
const { Parsers, explain } = require('../dist/test/core.js');

const LANGS = [
  ['go', 'go', ['tour.go', 'comments/comments.go']],
  ['rust', 'rust', ['tour.rs', 'comments/comments.rs']],
  ['c', 'c', ['tour.c', 'comments/comments.c']],
  ['cpp', 'cpp', ['tour.cpp', 'comments/comments.cpp']],
  ['csharp', 'csharp', ['tour.cs', 'comments/comments.cs']],
  ['javascript', 'javascript', ['tour.js', 'comments/comments.js']],
  ['typescript', 'typescript', ['tour.ts', 'comments/comments.ts']],
  ['typescript', 'tsx', ['tour.tsx']],
];

/** Tokens made only of punctuation: operators and separators. Brackets and quotes are covered elsewhere. */
const OPERATOR = /^[^\w\s"'`\[\](){}]+$/;
/** Comment delimiters are explained by the comment support, not as operators. */
const COMMENT_MARKERS = new Set(['//', '/*', '*/']);

const wasm = new URL('../dist/wasm/', import.meta.url).pathname;

describe('operator coverage', () => {
  for (const [file, exp, samples] of LANGS) {
    const spec = require(`../dist/test/lang-${file}.js`)[exp];

    test(`${exp}: every operator token in the grammar has a doc`, async () => {
      const parsers = await Parsers.load(wasm, [spec]);
      const lang = parsers.language(spec.id);
      const keys = Object.keys(spec.docs);
      const missing = [];
      for (let i = 0; i < lang.nodeTypeCount; i++) {
        const t = lang.types[i];
        if (!t || lang.nodeTypeIsNamed(i) || !lang.nodeTypeIsVisible(i) || !OPERATOR.test(t) || COMMENT_MARKERS.has(t)) continue;
        if (!keys.some((k) => k === t || k.endsWith(`/${t}`))) missing.push(t);
      }
      parsers.dispose();
      assert.deepEqual(missing, [], `operators without a doc: ${missing.join(' ')}`);
    });

    test(`${exp}: every operator in the samples is explained on hover`, async () => {
      const parsers = await Parsers.load(wasm, [spec]);
      const unexplained = [];
      for (const sample of samples) {
        const src = readFileSync(new URL(`../samples/${sample}`, import.meta.url), 'utf8');
        const tree = parsers.parse(spec.id, src);
        const walk = (n) => {
          if (n.type.endsWith('comment')) return;
          if (n.childCount === 0) {
            if (!n.isNamed && OPERATOR.test(n.text) && !/string|char|rune|template|preproc_arg/.test(n.parent?.type ?? '')) {
              const e = explain(spec, tree, n.startPosition);
              if (!e) unexplained.push(`${sample}:${n.startPosition.row + 1} ${n.text} (in ${n.parent?.type})`);
              // Angle brackets of generics, templates and JSX are not comparisons.
              else if (/^[<>]$/.test(n.text) && !/binary|relational|comparison/.test(n.parent?.type ?? '') && /less than|greater than/.test(e.markdown)) {
                unexplained.push(`${sample}:${n.startPosition.row + 1} ${n.text} (in ${n.parent?.type}) explained as a comparison`);
              }
            }
            return;
          }
          for (let i = 0; i < n.childCount; i++) walk(n.child(i));
        };
        walk(tree.rootNode);
        tree.delete();
      }
      parsers.dispose();
      assert.deepEqual(unexplained, []);
    });
  }
});
