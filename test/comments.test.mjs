// Comment support lives in the shared core (src/core/comments.ts) with per-language
// styles in src/docs/comments.ts, so it is tested across languages here, against
// the samples in samples/comments/.
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { createRequire } from 'node:module';
import { at, load } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { explain, scopeFor } = require('../dist/test/core.js');

const L = {};
before(async () => {
  for (const [key, file, exp, sample] of [
    ['go', 'go', 'go', 'comments.go'],
    ['rs', 'rust', 'rust', 'comments.rs'],
    ['c', 'c', 'c', 'comments.c'],
    ['cpp', 'cpp', 'cpp', 'comments.cpp'],
    ['cs', 'csharp', 'csharp', 'comments.cs'],
    ['js', 'javascript', 'javascript', 'comments.js'],
    ['ts', 'typescript', 'typescript', 'comments.ts'],
  ]) {
    L[key] = await load(file, exp, `comments/${sample}`);
  }
});

/** Hover markdown and scope (primary text, related first line) at a snippet (+1 char into it). */
function probe(l, needle, offset = 1) {
  const h = l.hover(needle, 0, offset);
  const s = l.scope(needle, 0, offset);
  return {
    md: h?.markdown ?? '',
    primary: s ? l.text(s.primary) : undefined,
    related: s?.related ? l.text(s.related).split('\n')[0] : undefined,
  };
}

describe('comment blocks', () => {
  test('consecutive // lines are one block, and a Go comment above a declaration is its doc comment', () => {
    const p = probe(L.go, 'It panics if');
    assert.match(p.md, /^\*\*Doc comment\*\* · Go doc comment \(Go doc\)/);
    assert.match(p.md, /↳ \*\*Documents:\*\* `func Area\(w, h float64\) float64 \{`/);
    assert.ok(p.primary.startsWith('// Area returns') && p.primary.endsWith('// Deprecated: Use [Rect.Area] instead.'), p.primary);
    assert.equal(p.related, 'func Area(w, h float64) float64 {');
  });

  test('a blank line ends a block; plain comments and block comments', () => {
    assert.match(probe(L.go, 'TODO: support').md, /TODO \/ FIXME note/);
    const block = probe(L.go, 'A block comment');
    assert.match(block.md, /`\/\* \*\/` block comment/);
    assert.equal(block.primary, '/* A block comment,\n   on two lines. */');
  });

  test('different comment styles never merge', () => {
    assert.equal(probe(L.c, 'NOLINT').primary, '// NOLINT(readability-magic-numbers)');
    assert.equal(probe(L.c, 'TODO: add').primary, '/* TODO: add min() */');
  });

  test('a comment after code is about that line', () => {
    const p = probe(L.js, 'trailing comment');
    assert.match(p.md, /↳ \*\*About:\*\* `return `hello \$\{name\}`\.repeat\(times\);` on the same line/);
    assert.equal(p.related, 'return `hello ${name}`.repeat(times);');
    const cs = probe(L.cs, 'trailing comment');
    assert.equal(cs.related, 'public double Divide(double a, double b) => a / b;'); // not the [Obsolete] line above
  });

  test('Rust: comments inside functions, nested block comments, SAFETY notes', () => {
    assert.match(probe(L.rs, 'a trailing').md, /About:\*\* `assert!\(w >= 0\.0 && h >= 0\.0\);`/);
    assert.equal(probe(L.rs, 'that nests').primary, '/* A block comment /* that nests */ in Rust. */');
    assert.match(probe(L.rs, 'SAFETY:').md, /`\/\/ SAFETY:` comment/);
  });
});

describe('doc comments', () => {
  test('each language names its doc comment and the declaration it documents', () => {
    assert.match(probe(L.rs, 'Returns the area').md, /`\/\/\/` doc comment.*rustdoc[\s\S]*Documents:\*\* `pub fn area/);
    assert.match(probe(L.rs, 'Shapes: a tiny').md, /inner doc comment[\s\S]*the module or crate this file defines/);
    assert.match(probe(L.c, 'Returns the larger').md, /Doxygen doc comment[\s\S]*Documents:\*\* `int max/);
    assert.match(probe(L.js, 'Greets someone').md, /JSDoc comment[\s\S]*Documents:\*\* `export function greet/);
    assert.match(probe(L.ts, 'Finds the first').md, /TSDoc/);
  });

  test('attributes between a doc comment and its item are skipped', () => {
    assert.equal(probe(L.rs, 'Returns the area').related, 'pub fn area(w: f64, h: f64) -> f64 {'); // over #[inline]
    assert.match(probe(L.cs, 'Divides').md, /Documents:\*\* `public double Divide\(double a, double b\) => a \/ b;`/); // not [Obsolete]
  });
});

describe('doc tags', () => {
  test('@param highlights its text and the parameter it names', () => {
    const p = probe(L.js, '@param {string}');
    assert.match(p.md, /^\*\*`@param`\*\* · JSDoc tag/);
    assert.match(p.md, /refers to `name` in `export function greet/);
    assert.equal(p.primary, '@param {string} name - Who to greet.');
    assert.equal(p.related, 'name');
    assert.equal(probe(L.ts, '@param match').related, 'match');
    assert.equal(probe(L.ts, '@typeParam').related, 'T');
  });

  test('Doxygen commands with @ or \\, directions and template parameters', () => {
    assert.equal(probe(L.c, '@param[out]').related, 'dst');
    assert.equal(probe(L.c, '@brief').primary, '@brief Copies @p n bytes from @p src to @p dst.'); // no trailing " *"
    assert.equal(probe(L.cpp, '\\tparam').related, 'T');
  });

  test('XML doc elements span open to close tag', () => {
    const p = probe(L.cs, '<param name="b">');
    assert.equal(p.primary, '<param name="b">The divisor.</param>');
    assert.equal(p.related, 'b');
    assert.ok(probe(L.cs, '<summary>').primary.startsWith('<summary>\n    /// Divides'));
    assert.equal(probe(L.cs, '<returns>', 2).primary, '<returns>The quotient.</returns>');
    // the closing tag gives the same element
    assert.equal(probe(L.cs, '</param>\n    /// <param name="b">', 2).primary, '<param name="a">The dividend.</param>');
  });

  test('doc links highlight the linked declaration in the same file', () => {
    assert.match(probe(L.go, '[Perimeter]').md, /links to `func Perimeter/);
    assert.equal(probe(L.rs, '[`perimeter`]').related, 'pub fn perimeter(w: f64, h: f64) -> f64 {');
    assert.equal(probe(L.js, '{@link shout}').related, 'shout = (s) => s.toUpperCase()');
    assert.equal(probe(L.cs, '<seealso').related, 'public double Multiply(double a, double b) => a * b;');
  });

  test('rustdoc sections and doc tests, Go Deprecated paragraphs', () => {
    const ex = probe(L.rs, '# Examples', 0);
    assert.match(ex.md, /# Examples.*rustdoc tag[\s\S]*doc tests/);
    assert.ok(ex.primary.startsWith('# Examples') && ex.primary.endsWith('/// ```'), ex.primary);
    assert.match(probe(L.rs, '```\n/// assert', 0).md, /doc test/);
    assert.match(probe(L.rs, '# Safety', 0).md, /unsafe fn/);
    assert.equal(probe(L.go, 'Deprecated:', 0).primary, 'Deprecated: Use [Rect.Area] instead.');
  });
});

describe('directives', () => {
  test('compiler and tool directives are recognised', () => {
    assert.match(probe(L.go, '//go:build').md, /build constraint/);
    assert.match(probe(L.go, '//go:generate').md, /go generate/);
    assert.match(probe(L.go, '// Output').md, /example test/);
    assert.match(probe(L.ts, '<reference').md, /triple-slash directive/);
    assert.match(probe(L.ts, '@ts-expect-error').md, /next line/);
    assert.match(probe(L.js, '@ts-check').md, /type checking/);
    assert.match(probe(L.js, 'eslint-disable').md, /ESLint/);
    assert.match(probe(L.cs, 'ReSharper').md, /ReSharper/);
  });
});

describe('the comments option', () => {
  test('"doc" skips plain comments, "off" skips all', () => {
    const { spec, tree, src } = L.go;
    const plain = at(src, 'A block comment', 0, 1);
    const doc = at(src, 'Area returns', 0, 1);
    assert.equal(explain(spec, tree, plain, { comments: 'doc' }), undefined);
    assert.ok(explain(spec, tree, doc, { comments: 'doc' }));
    assert.equal(explain(spec, tree, doc, { comments: 'off' }), undefined);
    assert.equal(scopeFor(spec, tree, doc, false, { comments: 'off' }), undefined);
  });
});
