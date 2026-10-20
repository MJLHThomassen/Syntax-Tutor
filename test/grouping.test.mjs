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

  test('Python: not/and/or, -2 ** 2, two-word operators and chained comparisons', async () => {
    const src = 'x = not a and b or c\nz = -2 ** 2 * k\nv = x not in s and y is not None\ny = 0 < i < n + 1\nw = 0 < i < n\n';
    const { here } = await parse('python', 'python', src);
    assert.ok(here('and').endsWith(grouped('((not a) and b) or c')));
    // `**` binds tighter than unary minus: -2 ** 2 is -(2 ** 2).
    assert.equal(here('-'), `↳ **Here:** \`-\` applies to \`2 ** 2\`.\n\n${grouped('(-(2 ** 2)) * k')}`);
    assert.equal(here('not in'), `↳ **Here:** \`not in\` combines \`x\` and \`s\`.\n\n${grouped('(x not in s) and (y is not None)')}`);
    assert.match(here('is not'), /^↳ \*\*Here:\*\* `is not` combines `y` and `None`\./);
    assert.equal(
      here('<'),
      `↳ **Here:** \`<\` is part of a chained comparison, which checks \`0 < i and i < n + 1\`.\n\n${grouped('0 < i < (n + 1)')}`,
    );
    // A chain on its own still gets explained, without a "Grouped as" that would only repeat it.
    assert.equal(here('<', 2), '↳ **Here:** `<` is part of a chained comparison, which checks `0 < i and i < n`.');
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

  test('CSS: calc() with real precedence (the grammar groups left to right); `/` outside calc() is no division', async () => {
    const { here } = await parse('css', 'css', '.a { width: calc(100% - 2 * var(--gap) + 1px); margin: calc((1rem + 2px) / 3); grid-area: 1 / 2 / 3; }');
    assert.equal(here('*'), `↳ **Here:** \`*\` combines \`2\` and \`var(--gap)\`.\n\n${grouped('(100% - (2 * var(--gap))) + 1px')}`);
    assert.match(here('-'), /`-` combines `100%` and `2 \* var\(--gap\)`/);
    assert.match(here('+'), /`\+` combines `100% - 2 \* var\(--gap\)` and `1px`/);
    assert.equal(here('+', 1), undefined); // a lone `+` inside the parentheses
    assert.equal(here('/'), undefined); // a lone `/` (the parentheses are an operand)
    assert.equal(here('/', 1), undefined); // grid-area: start / end lines, not a division
  });

  test('Explain This Line shows the grouping for its operators', async () => {
    const { spec, tree } = await parse('go', 'go', 'package main\nfunc f() {\n\tx := a + b*c\n}');
    const items = explainLines(spec, tree, 2, 2).items;
    const star = items.find((i) => i.text === '*');
    assert.ok(star?.markdown.endsWith(grouped('a + (b*c)')), star?.markdown);
  });
});
