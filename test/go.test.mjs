import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { load } from './helpers.mjs';

let L;
before(async () => {
  L = await load('go', 'go', 'tour.go');
});

const hoverGo = (...args) => L.hover(...args);
const scopeGo = (...args) => L.scope(...args);

describe('Go hovers', () => {
  test('keywords get a doc with heading, example and link', () => {
    const h = hoverGo('func divide');
    assert.match(h.markdown, /^\*\*`func`\*\* · Go keyword/);
    assert.match(h.markdown, /```go\n/);
    assert.match(h.markdown, /go\.dev\/ref\/spec#Function_declarations/);
  });

  test('context picks the right meaning of a token', () => {
    assert.match(hoverGo('func (r *Rect)').markdown, /method/);
    assert.match(hoverGo('go func()', 0, 3).markdown, /function literal/);
    assert.match(hoverGo('ch <- 42', 0, 3).markdown, /\(send\)/);
    assert.match(hoverGo('v := <-ch', 0, 5).markdown, /\(receive\)/);
    assert.match(hoverGo('*Rect)').markdown, /pointer type/);
    assert.match(hoverGo('&Rect{').markdown, /address-of/);
    assert.match(hoverGo('nums ...int', 0, 5).markdown, /variadic/);
    assert.match(hoverGo('2}...', 0, 2).markdown, /spread/);
    assert.match(hoverGo('s.(type)', 0, 3).markdown, /type switch/);
    assert.match(hoverGo('~int').markdown, /underlying type/);
  });

  test('built-ins only match where they are really the built-in', () => {
    assert.match(hoverGo('make(chan').markdown, /built-in function/);
    assert.match(hoverGo('len(`').markdown, /\*\*`len`\*\*/);
    assert.match(hoverGo('nil\n').markdown, /zero value/);
    assert.match(hoverGo('error)').markdown, /built-in type/);
    assert.match(hoverGo('iota').markdown, /const/);
  });

  test('declaration names describe their role', () => {
    assert.match(hoverGo('divide(a').markdown, /\*\*Function name\*\*.*unexported/);
    assert.match(hoverGo('Area() float64 {').markdown, /\*\*Method name\*\*.*`\(r \*Rect\)`.*exported/);
    assert.match(hoverGo('r *Rect)').markdown, /Receiver/);
    assert.match(hoverGo('str "strings"').markdown, /Import alias/);
  });

  test('jump keywords say where they go', () => {
    assert.match(hoverGo('return r.Width').markdown, /returns from `func \(r \*Rect\) Area\(\) float64 \{`/);
    assert.match(hoverGo('break outer').markdown, /breaks out of `outer:`/);
    assert.match(hoverGo('defer close').markdown, /runs when this returns: `func\(\) \{`/);
  });

  test('literals', () => {
    assert.match(hoverGo('raw\\n').markdown, /raw string literal/);
    const rune = hoverGo("'x'");
    assert.match(rune.markdown, /rune/);
  });

  test('nothing for strings, comments, plain identifiers and punctuation', () => {
    assert.equal(hoverGo('divide by zero', 0, 0), undefined); // "divide" inside a string
    assert.match(hoverGo('Hover anything').markdown, /Doc comment[\s\S]*Documents:\*\* `package main`/); // the comment above `package` is the package doc
    assert.equal(hoverGo('total += n', 0, 0), undefined);
    assert.match(hoverGo('(a, b int)', 0, 2).markdown, /comma/); // separators have hovers too
  });

  test('columns after non-ASCII text (UTF-16) line up', () => {
    const h = hoverGo('sum([]int', 0, 0);
    assert.equal(h, undefined); // a call of a user function: no doc
    const spread = hoverGo('...))');
    assert.match(spread.markdown, /spread/);
    assert.equal(L.text(spread.span), '...');
  });
});

describe('Go scopes', () => {
  const fnDivide = 'func divide(a, b int) (int, error) {';

  test('func keyword and function name highlight the whole function', () => {
    for (const s of [scopeGo('func divide'), scopeGo('divide(a', 0, 2)]) {
      const t = L.text(s.primary);
      assert.ok(t.startsWith(fnDivide), t);
      assert.ok(t.endsWith('return a / b, nil\n}'), t);
    }
  });

  test('boundaries outline the keyword and the closing brace', () => {
    const s = scopeGo('func divide');
    assert.deepEqual(s.boundaries.map((b) => L.text(b)), ['func', '}']);
  });

  test('the cursor just after a keyword still counts', () => {
    const s = scopeGo('func divide', 0, 4, true);
    assert.ok(L.text(s.primary).startsWith(fnDivide));
    assert.equal(scopeGo('func divide', 0, 4, false), undefined); // that's the space, for hovers
  });

  test('a lone type spec includes its `type` keyword', () => {
    const t = L.text(scopeGo('Rect struct').primary);
    assert.ok(t.startsWith('type Rect struct {') && t.endsWith('}'), t);
  });

  test('if / else highlight the whole if statement', () => {
    const iff = L.text(scopeGo('if q, err').primary);
    assert.ok(iff.startsWith('if q, err') && iff.endsWith('}'), iff);
    assert.equal(L.text(scopeGo('} else {', 0, 2).primary), iff);
  });

  test('range highlights its for loop', () => {
    const t = L.text(scopeGo('range nums').primary);
    assert.ok(t.startsWith('for _, n := range nums {') && t.endsWith('}'), t);
  });

  test('return also yields the function it returns from', () => {
    const s = scopeGo('return 0, errors');
    assert.equal(L.text(s.primary), 'return 0, errors.New("divide by zero")');
    assert.ok(L.text(s.related).startsWith(fnDivide));
  });

  test('labelled break/continue target the labelled loop', () => {
    const s = scopeGo('continue outer');
    assert.ok(L.text(s.related).startsWith('outer:\n\tfor i := 0'));
    const label = scopeGo('outer\n', 0, 1);
    assert.ok(L.text(label.primary).startsWith('outer:'));
  });

  test('fallthrough points at the next case', () => {
    const s = scopeGo('fallthrough');
    assert.ok(L.text(s.related).startsWith('case v > 10:'));
  });

  test('values, plain identifiers and punctuation get no scope', () => {
    assert.equal(scopeGo('nil\n'), undefined);
    assert.equal(scopeGo('total += n'), undefined);
    assert.equal(scopeGo('(a, b int)', 0, 2), undefined);
  });

  test('braces highlight their block', () => {
    const s = scopeGo('{\n\t\treturn 0');
    assert.ok(L.text(s.primary).startsWith('{\n\t\treturn 0'));
    assert.deepEqual(s.boundaries.map((b) => L.text(b)), ['{', '}']);
  });
});
