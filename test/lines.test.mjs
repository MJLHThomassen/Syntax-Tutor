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
  L.c = await load('c', 'c', 'tour.c');
  L.py = await load('python', 'python', 'tour.py');
  L.html = await load('html', 'html', 'tour.html');
  L.css = await load('css', 'css', 'tour.css');
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
    assert.match(r.items[1].markdown, /\+= \(add and assign\)/); // operators are listed too
    assert.match(r.items[2].markdown, /declared on line 38 \(loop variable\)/);
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
      ['let', 'n', '=', 'item', 'trim', 'parse', '::', '<', 'i32', '?'],
    );
    assert.match(r.items.find((i) => i.text === 'item').markdown, /declared on line 44 \(loop variable\)/);
  });

  test('several lines at once', () => {
    const r = lines(L.cs, 'foreach (var item in items)', 3);
    assert.match(r.structure, /^These lines are the `foreach` statement/);
    assert.ok(r.items.some((i) => i.text === 'foreach'));
    assert.ok(r.items.length > 6);
  });

  test('multi-line selections nest parts inside the scopes they open', () => {
    const r = lines(L.go, 'outer:\n', 11);
    const at = (text, nth = 0) => r.items.filter((i) => i.text === text)[nth];
    assert.equal(at('for').depth, 0);
    assert.equal(at('{').depth, 0); // the braces belong to the outer level
    assert.equal(at('for', 1).depth, 1);
    assert.equal(at('for', 1).scope.label, 'the body of the `for` statement');
    assert.equal(at('if').depth, 2);
    assert.equal(at('continue').depth, 3);
    assert.equal(at('continue').scope.label, 'the body of the `if` statement');
    assert.equal(r.items.filter((i) => i.text === '}').length, 0); // closers of blocks opened here are skipped
  });

  test('match and switch branches are scopes too, labelled by their header', () => {
    const r = lines(L.rs, 'match self {', 4);
    const wildcardBody = r.items.find((i) => i.scope?.label === 'the `_ =>` branch');
    assert.ok(wildcardBody, 'no `_ =>` branch scope');
    assert.equal(wildcardBody.depth, 2);
    assert.equal(r.items.find((i) => i.text === '_').depth, 1); // the pattern itself is in the match body, not the branch
  });

  test('a template literal ${ } closer is not listed when its opener is', () => {
    const r = lines(L.ts, 'if (isString(shape.name)', 2);
    assert.equal(r.items.filter((i) => i.text === '}' && /brackets/.test(i.markdown)).length, 0);
  });

  test('a string literal is one entry, not its quotes and text separately', () => {
    const c = lines(L.c, 'const char *greeting');
    const strings = c.items.filter((i) => i.text.includes('"'));
    assert.deepEqual(strings.map((i) => i.text), ['"héllo 👋"']);
    assert.equal(strings[0].markdown.split('\n')[0], '**`"héllo 👋"`** · C string literal'); // the literal itself, not "..."
    assert.match(strings[0].markdown, /string literal/);
    assert.ok(!strings[0].plain); // the literal's own doc, not the generic fallback
  });

  test('Python: indented blocks are scopes too, opened by their `:`', () => {
    const r = lines(L.py, '    for n in nums:', 5);
    assert.equal(r.structure, 'These lines are the `for` statement (lines 55–60).');
    const at = (text, nth = 0) => r.items.filter((i) => i.text === text)[nth];
    assert.equal(at('for').depth, 0);
    assert.equal(at('if').depth, 1);
    assert.equal(at('if').scope.label, 'the body of the `for` statement');
    assert.equal(at('continue').depth, 2);
    assert.equal(at('continue').scope.label, 'the body of the `if` statement');
    assert.equal(at('else').depth, 0);
    assert.equal(at('print').scope.label, 'the body of the `else` clause');
    // A block whose header is above the selection doesn't count.
    const inner = lines(L.py, '        result += n');
    assert.equal(inner.structure, 'This line is the augmented assignment (line 58).');
    assert.deepEqual(inner.items.map((i) => [i.text, i.depth]), [['result', 0], ['+=', 0], ['n', 0]]);
    assert.match(inner.items[0].markdown, /declared on line 54 \(variable\)/);
    assert.match(inner.items[2].markdown, /declared on line 55 \(loop variable\)/);
  });

  test('Python: a docstring line and an f-string line', () => {
    const doc = lines(L.py, '"""A point');
    assert.equal(doc.structure, 'This line is the docstring (line 18).');
    assert.match(doc.items[0].markdown, /^\*\*Docstring\*\*/);
    const f = lines(L.py, '    greeting = f"');
    assert.equal(f.structure, 'This line is the assignment (line 122).');
    const fstrings = f.items.filter((i) => i.text.startsWith('f"'));
    assert.equal(fstrings.length, 1);
    assert.match(fstrings[0].markdown, /^\*\*`f"héllo 👋 \{first \+ 1\} and \{squares!s\}"`\*\* · Python f-string/);
    assert.ok(f.items.some((i) => i.text === 'squares'), 'code inside { } is explained');
  });

  test('CSS: declarations, rules and at-rules, with values as one entry each', () => {
    const decl = lines(L.css, '  border: 1px solid #ddd;');
    assert.equal(decl.structure, 'This line is the `border` declaration (line 34).');
    assert.deepEqual(heads(decl), [
      'border | **`border`** · CSS property',
      ': | **`property: value`** · CSS syntax',
      '1px | **`1px`** · CSS length',
      'solid | **`solid`** · CSS keyword',
      '#ddd | **`#ddd`** · CSS color',
    ]);
    const rule = lines(L.css, '.card {', 11);
    assert.equal(rule.structure, 'These lines are the rule `.card` (lines 27–38).');
    assert.equal(rule.items.find((i) => i.text === 'display').scope.label, 'the block of the rule `.card`');
    const ref = lines(L.css, '  gap: var(--gap);').items.find((i) => i.text === '--gap');
    assert.match(ref.markdown, /\*\*Custom property reference\*\* · Reads the custom property `--gap`, declared on line 9/);
    assert.equal(lines(L.css, '@keyframes spin').structure, 'This line starts the `@keyframes` rule (lines 89–99).');
  });

  test('code inside an interpolation is still explained', () => {
    const r = lines(L.cs, 'public virtual string Describe');
    const texts = r.items.map((i) => i.text);
    assert.equal(r.items.filter((i) => i.text.startsWith('$"')).length, 1);
    assert.match(r.items.find((i) => i.text.startsWith('$"')).markdown, /^\*\*`\$"\{GetType\(\)\.Name\} with area/);
    assert.ok(texts.includes('GetType') && texts.includes('Name') && texts.includes('Area'), texts.join(' '));
    assert.equal(texts.filter((t) => t === '}').length, 0); // hole closers are covered by their opener
  });

  test('HTML: a tag line names its element; end tags and the doctype are one entry each', () => {
    const r = lines(L.html, '<section id="menu">');
    assert.equal(r.structure, 'This line starts the `<section>` element (lines 33–40).');
    assert.deepEqual(heads(r), [
      '< | **`<section>`** · HTML start tag',
      'section | **`<section>`** · HTML element',
      'id | **`id`** · HTML attribute',
      '= | **`= (attribute value)`** · HTML syntax',
      '"menu" | **`"menu"`** · HTML attribute value',
    ]);
    assert.deepEqual(lines(L.html, '      </ul>').items.map((i) => i.text), ['</ul>']);
    assert.equal(lines(L.html, '<!DOCTYPE').structure, 'This line is the `<!DOCTYPE>` declaration (line 1).');
  });

  test('HTML: the content of elements opened in the selection is nested', () => {
    const r = lines(L.html, '    <nav>', 6);
    assert.equal(r.structure, 'These lines are the `<nav>` element (lines 18–24).');
    const a = r.items.find((i) => i.text === 'a');
    assert.equal(a.depth, 3); // nav > ul > li
    assert.equal(a.scope.label, 'the `<li>` element');
    assert.equal(r.items.find((i) => i.text === '</nav>').depth, 0);
  });
});
