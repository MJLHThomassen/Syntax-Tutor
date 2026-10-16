// Bracket hovers come from the shared core (src/core/brackets.ts), so they are
// tested here across languages rather than per language.
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { load } from './helpers.mjs';

const L = {};
before(async () => {
  L.ts = await load('typescript', 'typescript', 'tour.ts');
  L.go = await load('go', 'go', 'tour.go');
  L.c = await load('c', 'c', 'tour.c');
  L.rust = await load('rust', 'rust', 'tour.rs');
  L.cs = await load('csharp', 'csharp', 'tour.cs');
});

describe('bracket hovers', () => {
  test('the parentheses of an if condition are explained (TypeScript)', () => {
    const open = L.ts.hover('if (isString', 0, 3);
    assert.equal(L.ts.text(open.span), '(');
    assert.match(open.markdown, /^\*\*`\( \)`\*\* · TypeScript brackets/);
    assert.match(open.markdown, /Opening parenthesis of the condition of the `if` statement\. Its partner is the `\)` on the same line\./);
    const close = L.ts.hover('opts?.verbose) {', 0, 13);
    assert.match(close.markdown, /Closing parenthesis of the condition of the `if` statement/);
  });

  test('a bracket with its own doc gets the context as a "Here" line', () => {
    const h = L.ts.hover('opts?.verbose) {', 0, 15);
    assert.match(h.markdown, /block/);
    assert.match(h.markdown, /↳ \*\*Here:\*\* Opening curly brace of the body of the `if` statement\. Its partner is the `\}` on line \d+\./);
  });

  test('parameters vs arguments, with the function name', () => {
    assert.match(L.go.hover('divide(a, b', 0, 6).markdown, /parameter list of the `func` declaration `divide`/);
    assert.match(L.go.hover('divide(1, 0)', 0, 6).markdown, /arguments of the call to `divide`/);
    assert.match(L.c.hover('add(int a', 0, 3).markdown, /parameter list of the function `add`/);
    assert.match(L.rust.hover('parse_all(&[', 0, 9).markdown, /arguments of the call to `parse_all`/);
  });

  test('bodies and headers', () => {
    assert.match(L.rust.hover('match self {', 0, 11).markdown, /body of the `match` expression\. Its partner is the `\}` on line 28/);
    assert.match(L.cs.hover('foreach (', 0, 8).markdown, /header of the `foreach` statement/);
  });

  test('no vague guesses', () => {
    const h = L.go.hover('[]int{1, 2}');
    assert.match(h.markdown, /slice/);
    assert.doesNotMatch(h.markdown, /Here:/);
  });
});
