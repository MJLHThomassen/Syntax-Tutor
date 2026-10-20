// Explain This Function (src/core/outline.ts): the outline of the function around
// the cursor, one row per step, nested like the code, for every language's sample.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';
import { at, readWasm } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Parsers, outlineFunction } = require('../dist/test/core.js');

/** Outlines the function around the first `needle` in `samples/<sample>` (or in `src`). */
async function outliner(file, exportName, sample, src = readFileSync(new URL(`../samples/${sample}`, import.meta.url), 'utf8')) {
  const spec = require(`../dist/test/lang-${file}.js`)[exportName];
  const parsers = await Parsers.load(readWasm, [spec]);
  const tree = parsers.parse(spec.id, src);
  return (needle) => {
    const outline = outlineFunction(spec, tree, at(src, needle));
    assert.ok(outline, `no function around "${needle}"`);
    // "  - If `b == 0`:" with two spaces per level, as compact text to compare against.
    return { ...outline, text: outline.rows.map((r) => `${'  '.repeat(r.depth)}${r.text}`) };
  };
}

describe('Explain This Function', () => {
  test('Go: a guard clause, a range loop and labelled loops', async () => {
    const outline = await outliner('go', 'go', 'tour.go');
    const divide = outline('if b == 0');
    assert.equal(divide.label, 'the function `divide`');
    assert.equal(divide.signature, 'func divide(a, b int) (int, error) {');
    assert.equal(
      divide.summary,
      'The function `divide` (lines 29–34) takes `a, b int` and returns `(int, error)`. It has 1 decision, and can return early in 1 place.',
    );
    assert.deepEqual(divide.text, ['If `b == 0`:', '  Returns early with `0, errors.New("divide by zero")`', 'Returns `a / b, nil`']);
    assert.deepEqual(divide.rows.map((r) => r.keyword), ['if', 'return', 'return']);

    assert.deepEqual(outline('total += n').text, ['Declares `total := 0`', 'For each `_, n` in `nums`:', '  Updates `total`: `total += n`', 'Returns `total`']);
    assert.equal(outline('r.Width * r.Height').label, 'the method `Area`');

    const main = outline('outer:').text;
    assert.ok(main.includes('Repeats while `i < 3`, starting with `i := 0`, doing `i++` after each round (labelled `outer`):'), main.join('\n'));
    assert.ok(main.includes('  Repeats `3` times, with `j` counting up from 0:'));
    assert.ok(main.includes('      Skips to the next round of the loop `outer` (`continue`)'));
    assert.ok(main.includes('Waits for a value from `done`'));
    assert.ok(main.includes('    Continues into the next case (`fallthrough`)'));
    assert.ok(main.includes('If `err != nil` (after `q, err := divide(1, 0)`):'));
    assert.ok(main.includes('Otherwise:'));
  });

  test('Rust: `?`, implicit results, match arms, methods in an impl', async () => {
    const outline = await outliner('rust', 'rust', 'tour.rs');
    const parseAll = outline('let mut out = Vec::new()');
    assert.deepEqual(parseAll.text, [
      'Declares `let mut out = Vec::new()`',
      'For each `item` in `items`:',
      '  Declares `let n = item.trim().parse::<i32>()?` (on error, returns early: `?`)',
      '  Calls `out.push(n)`',
      'Returns `Ok(out)` (the last expression, without `;`, is the result)',
    ]);
    assert.match(parseAll.summary, /It has 1 loop, and can return early in 1 place\.$/);

    const area = outline('match self');
    assert.equal(area.label, 'the method `area`');
    assert.deepEqual(area.text, ['Chooses on `self`:', '  `Shape::Circle { r }` → `3.14 * r * r`', '  `Shape::Rect(w, h) if *w > 0.0` → `w * h`', '  `_` → `0.0`']);

    const main = outline("'outer: loop").text;
    assert.ok(main.includes('Repeats forever (until a `break` or `return`) (labelled `\'outer`):'), main.join('\n'));
    assert.ok(main.includes('If `let Ok(nums) = parse_all(&["1", "2"])` matches:'));
  });

  test('JavaScript: C-style, for...of, for...in and do...while loops; break in a switch', async () => {
    const outline = await outliner('javascript', 'javascript', 'tour.js');
    const loops = outline('function loops').text;
    assert.equal(loops[0], 'Repeats while `i < items.length`, starting with `let i = 0`, doing `i++` after each round:');
    assert.ok(loops.includes('For each `item` in `items`:'));
    assert.ok(loops.includes('For each key `key` of `obj`:'));
    assert.ok(loops.includes('Runs this, then repeats while `n > 0`:'));
    assert.ok(loops.includes('For each `row` in `items` (labelled `outer`):'));

    const choose = outline('function choose').text;
    assert.deepEqual(choose.slice(0, 7), [
      'Chooses on `value`:',
      '  `case 1`:',
      "    Returns early with `'one'`",
      '  `case 2`:',
      '    Leaves the `switch` (`break`)',
      '  `default`:',
      "    Returns early with `'many'`",
    ]);
    assert.equal(outline('yield id++').text.at(-1), '  Produces the next value, `id++` (`yield`)');
  });

  test('C: parameters in the declarator, else-if chains, goto labels', async () => {
    const outline = await outliner('c', 'c', 'tour.c');
    assert.match(outline('va_start').summary, /^The function `sum` \(lines 53–60\) takes `int count`, `\.\.\.` and returns `int`\./);
    assert.match(outline('return ++id').summary, /takes no parameters and returns `int`/);
    const main = outline('struct Point pt').text;
    assert.ok(main.includes('If `big < 0`:'), main.join('\n'));
    assert.ok(main.includes('Otherwise, if `big == 0`:'));
    assert.ok(main.includes('    Leaves the `switch` (`break`)'));
    assert.ok(main.includes('Returns early with `0`'));
    assert.equal(main.at(-1), 'Returns `EXIT_FAILURE`');
  });

  test('C#: params, try/catch/finally, a for loop without a condition', async () => {
    const outline = await outliner('csharp', 'csharp', 'tour.cs');
    assert.match(outline('half = n / 2').summary, /takes `int n`, `out int half`, `ref int calls`, `in int bonus`, `params int\[\] rest` and returns `bool`/);
    assert.equal(outline('this.radius = radius').summary, 'The constructor `Circle` (line 40) takes `double radius`.');
    assert.equal(outline('yield return i').text[0], 'Repeats until a `break` or `return`, starting with `int i = 0`, doing `i += 2` after each round:');
    const main = outline('var words').text;
    assert.ok(main.includes('Tries this:'), main.join('\n'));
    assert.ok(main.some((r) => r.startsWith('If that fails with `(InvalidOperationException ex)')));
    assert.ok(main.includes('Finally, always:'));
  });

  test('C++: a reference-returning operator', async () => {
    const outline = await outliner('cpp', 'cpp', 'tour.cpp');
    const op = outline('return os <<');
    assert.match(op.summary, /^The function `operator<<` \(lines 43–45\) takes `std::ostream &os`, `const Rect &r`/);
  });

  test('TypeScript: a function that only throws', async () => {
    const outline = await outliner('typescript', 'typescript', 'tour.ts');
    const fail = outline('throw new Error(message)');
    assert.equal(fail.summary, 'The function `fail` (lines 73–75) takes `message: string` and returns `never`. It can throw an error in 1 place.');
    assert.deepEqual(fail.text, ['Throws `new Error(message)`']);
  });

  test('Python: indented blocks, elif, try/except/else/finally, match, docstrings, parameter markers', async () => {
    const outline = await outliner('python', 'python', 'tour.py');
    const divide = outline('def divide');
    // The bare `/` and `*` markers aren't parameters.
    assert.match(divide.summary, /^The function `divide` \(lines 40–48\) takes `a`, `b`, `strict=False`\./);
    assert.deepEqual(divide.text, [
      'If `b == 0`:',
      '  If `strict`:',
      '    Raises `ZeroDivisionError("divide by zero")`',
      '  Returns `None`',
      'Otherwise, if `a < 0`:',
      '  Returns `-(a // b)`',
      'Otherwise:',
      '  Returns `a / b`',
    ]);
    assert.equal(outline('def countdown').text.at(-1), 'Produces every value from `range(3)` (`yield from`)');
    assert.equal(outline('async def fetch').text[0], '`async with open_session() as session`:');
    assert.equal(outline('def __add__').label, 'the method `__add__`');

    const main = outline('def main').text;
    assert.ok(main.includes('Tries this:'), main.join('\n'));
    assert.ok(main.includes('If that fails with `(ZeroDivisionError, ValueError) as error`:'));
    assert.ok(main.includes('  Raises the current error again'));
    assert.ok(main.includes('If nothing went wrong:'));
    assert.ok(main.includes('Finally, always:'));
    assert.equal(main.at(-1), 'Does nothing (`pass`): a placeholder where a statement is required');

    const describe = outline('def describe').text;
    assert.deepEqual(describe.slice(0, 3), ['Chooses on `value`:', '  `case 0 | 1`:', '    Returns `"small"`']);

    // A docstring isn't a step: the summary quotes its first line.
    const area = (await outliner('python', 'python', 'comments/comments.py'))('def area');
    assert.match(area.summary, /Its docstring says: “Return the area of a w×h rectangle\.”$/);
    assert.deepEqual(area.text, ['If `w < 0 or h < 0`:', '  Raises `ValueError("negative size")`', 'Returns `w * h`']);
  });

  test('a one-line lambda gives way to the function around it; outside any function there is no outline', async () => {
    const src = 'function f(xs) {\n  const ys = xs.map((x) => x * 2);\n  return ys;\n}\nconst top = 1;\n';
    const outline = await outliner('javascript', 'javascript', undefined, src);
    assert.equal(outline('x * 2').label, 'the function `f`');
    const spec = require('../dist/test/lang-javascript.js').javascript;
    const parsers = await Parsers.load(readWasm, [spec]);
    assert.equal(outlineFunction(spec, parsers.parse(spec.id, src), at(src, 'const top')), undefined);
  });

  test('CSS has no functions: calc() and friends are not outlined', async () => {
    const spec = require('../dist/test/lang-css.js').css;
    const parsers = await Parsers.load(readWasm, [spec]);
    const src = readFileSync(new URL('../samples/tour.css', import.meta.url), 'utf8');
    const tree = parsers.parse(spec.id, src);
    for (const needle of ['calc(100%', 'display: flex', '@media screen', 'from {']) assert.equal(outlineFunction(spec, tree, at(src, needle)), undefined, needle);
  });
});
