// Operator grouping (src/core/grouping.ts): an operator's hover says what it works
// on and shows the whole expression with its implicit groups in parentheses.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';
import { at, readWasm } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Parsers, explain, explainLines } = require('../dist/test/core.js');

/** Parses `src` with a language spec and returns the "↳ Here" part of the hover on the `nth` `op`. */
async function parse(file, exportName, src) {
  const spec = require(`../dist/test/lang-${file}.js`)[exportName];
  const parsers = await Parsers.load(readWasm, [spec]);
  const tree = parsers.parse(spec.id, src);
  return {
    spec,
    tree,
    here(op, nth = 0) {
      const markdown = explain(spec, tree, at(src, op, nth))?.markdown;
      assert.ok(markdown, `no hover on "${op}" #${nth}`);
      return markdown.split('\n\n---\n\n')[1];
    },
  };
}

const grouped = (text) => `**Grouped as:** \`${text}\``;

describe('operator grouping', () => {
  test('Go: precedence of *, +, == and &&', async () => {
    const { here } = await parse('go', 'go', 'package main\nfunc f() { x := a + b*c == d && !e }');
    assert.equal(here('*'), `↳ **Here:** \`*\` combines \`b\` and \`c\`.\n\n${grouped('((a + (b*c)) == d) && (!e)')}`);
    assert.match(here('+'), /^↳ \*\*Here:\*\* `\+` combines `a` and `b\*c`\./);
    assert.match(here('&&'), /combines `a \+ b\*c == d` and `!e`/);
    assert.match(here('!'), /`!` applies to `e`/);
  });

  test('Rust: ranges, casts and unary minus on a method call', async () => {
    const { here } = await parse('rust', 'rust', 'fn f() { let r = 0..n + 1; let y = x as i64 * 2; let z = -a.abs() + b; }');
    assert.match(here('..'), /`\.\.` combines `0` and `n \+ 1`[\s\S]*`0\.\.\(n \+ 1\)`/);
    assert.ok(here('as').endsWith(grouped('(x as i64) * 2')));
    assert.match(here('-'), /`-` applies to `a\.abs\(\)`[\s\S]*`\(-a\.abs\(\)\) \+ b`/);
  });

  test('C: *p++ and the conditional operator', async () => {
    const { here } = await parse('c', 'c', 'int f() { return *p++ + a > b ? x : y - 1; }');
    assert.match(here('*'), /`\*` applies to `p\+\+`/);
    assert.ok(here('?').startsWith('↳ **Here:** `?` works on `*p++ + a > b`, `x` and `y - 1`.'));
    assert.ok(here('?').endsWith(grouped('(((*(p++)) + a) > b) ? x : (y - 1)')));
  });

  test('C#: ?? has lower precedence than arithmetic', async () => {
    const { here } = await parse('csharp', 'csharp', 'class C { int F() { return a ?? b + c * -d; } }');
    assert.ok(here('??').endsWith(grouped('a ?? (b + (c * (-d)))')));
  });

  test('JavaScript: ** is right-associative, && binds tighter than ||', async () => {
    const { here } = await parse('javascript', 'javascript', 'const v = a || b && c === d ** 2 ** e;');
    assert.ok(here('||').endsWith(grouped('a || (b && (c === (d ** (2 ** e))))')));
    assert.match(here('**', 1), /`\*\*` combines `2` and `e`/);
  });

  test('a lone operator has nothing to group', async () => {
    const { here } = await parse('javascript', 'javascript', 'const v = a + b;\nf(a * b, c - d);');
    assert.equal(here('+'), undefined);
    assert.equal(here('*'), undefined);
  });

  test('explicit parentheses keep their grouping and end the expression', async () => {
    const { here } = await parse('javascript', 'javascript', 'const v = (a + b) * c - d;');
    // Inside the parentheses, `a + b` is a lone operator.
    assert.equal(here('+'), undefined);
    assert.ok(here('*').endsWith(grouped('((a + b) * c) - d')));
  });

  test("TypeScript: x! isn't grouped (the grammar parses a + b! as (a + b)!)", async () => {
    const { here } = await parse('typescript', 'typescript', 'const v = (x as number) * 2 + y!;');
    assert.ok(here('+').endsWith(grouped('((x as number) * 2) + y')));
    assert.equal(here('!'), undefined);
  });

  test('backticks inside the expression stay readable', async () => {
    const { here } = await parse('javascript', 'javascript', 'const v = `a` + b * c;');
    assert.ok(here('+').endsWith('**Grouped as:** `` `a` + (b * c) ``'));
  });

  test('a long expression still says what the operator combines, without spelling out the grouping', async () => {
    const long = 'const v = first_long_name + second_long_name * third_long_name - fourth_long_name / fifth_long_name % sixth;';
    const { here } = await parse('javascript', 'javascript', long);
    assert.equal(here('*'), '↳ **Here:** `*` combines `second_long_name` and `third_long_name`.');
  });

  test('Explain This Line shows the grouping for its operators', async () => {
    const { spec, tree } = await parse('go', 'go', 'package main\nfunc f() {\n\tx := a + b*c\n}');
    const items = explainLines(spec, tree, 2, 2).items;
    const star = items.find((i) => i.text === '*');
    assert.ok(star?.markdown.endsWith(grouped('a + (b*c)')), star?.markdown);
  });
});
