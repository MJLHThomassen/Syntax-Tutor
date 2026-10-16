import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { load } from './helpers.mjs';

let L;
before(async () => {
  L = await load('rust', 'rust', 'tour.rs');
});

const hoverRs = (...args) => L.hover(...args);
const scopeRs = (...args) => L.scope(...args);

describe('Rust hovers', () => {
  test('keywords link to std keyword docs', () => {
    const h = hoverRs('fn longest');
    assert.match(h.markdown, /^\*\*`fn`\*\* · Rust keyword/);
    assert.match(h.markdown, /keyword\.fn\.html/);
  });

  test('context picks the right meaning of a token', () => {
    assert.match(hoverRs('impl Area for', 0, 10).markdown, /impl Trait for Type/);
    assert.match(hoverRs('&mut total', 0, 1).markdown, /mutable borrow/);
    assert.match(hoverRs('&mut fmt', 0, 1).markdown, /mutable reference type/);
    assert.match(hoverRs('let mut out', 0, 4).markdown, /\*\*`mut`\*\*/);
    assert.match(hoverRs('&self', 0, 1).markdown, /method receiver/);
    assert.match(hoverRs('*w > 0', 0, 0).markdown, /dereference/);
    assert.match(hoverRs('if *w', 0, 0).markdown, /match guard/);
    assert.match(hoverRs('..p.clone').markdown, /struct update/);
    assert.match(hoverRs('0..=c', 0, 1).markdown, /inclusive range/);
    assert.match(hoverRs('::<i32>').markdown, /turbofish/);
    assert.match(hoverRs('#[derive').markdown, /attribute/);
    assert.match(hoverRs('|a: i32|').markdown, /closure/);
    assert.match(hoverRs('else {\n        return').markdown, /let \.\.\. else/);
  });

  test('? explains error propagation and where it returns to', () => {
    const h = hoverRs('?;');
    assert.match(h.markdown, /error propagation/);
    assert.match(h.markdown, /returns early from `fn parse_all/);
  });

  test('macros, types and traits', () => {
    assert.match(hoverRs('println!').markdown, /\*\*`println!`\*\* · Rust macro/);
    assert.match(hoverRs('write!').markdown, /writer/);
    assert.match(hoverRs('Vec<i32>').markdown, /growable/);
    assert.match(hoverRs('Some(first)').markdown, /Option/);
    assert.match(hoverRs('i32,\n    y').markdown, /32-bit/);
    assert.match(hoverRs('derive(').markdown, /derive/);
    assert.match(hoverRs('Debug,').markdown, /standard trait/);
  });

  test('declaration names describe their role', () => {
    assert.match(hoverRs('Point {\n').markdown, /Struct name/);
    assert.match(hoverRs('area(&self) -> f64;').markdown, /Trait method/);
    assert.match(hoverRs('Shape {\n    fn').markdown, /Implemented type.*implements the trait/);
    assert.match(hoverRs('Display for Point').markdown, /Implemented trait[\s\S]*standard trait/);
    assert.match(hoverRs("'a>", 0, 1).markdown, /Lifetime 'a/);
    assert.match(hoverRs('out = Vec').markdown, /Variable.*mutable/);
  });

  test('nothing for method names, strings and comments', () => {
    assert.equal(hoverRs('len() >'), undefined); // method call, not a built-in
    assert.equal(hoverRs('parse error'), undefined); // inside a string
    assert.match(hoverRs('A small tour').markdown, /line comment/); // comments get their own explanation
  });

  test('raw strings and chars', () => {
    const raw = hoverRs('no \\n escape');
    assert.match(raw.markdown, /raw string/);
    assert.match(hoverRs("'c' as").markdown, /char/);
  });

  test('columns after emoji (surrogate pairs) line up', () => {
    const h = hoverRs('];\n    for w', 0, 0);
    assert.equal(L.text(h.span), ']');
    assert.match(h.markdown, /Closing square bracket of the arguments of the macro call `vec!`/);
    assert.equal(L.text(hoverRs('let words').span), 'let');
    // The `for` after the line containing 👋 is found by its exact column.
    assert.equal(L.text(hoverRs('for w in').span), 'for');
  });
});

describe('Rust scopes', () => {
  test('fn keyword, pub and the name all highlight the function', () => {
    const t = L.text(scopeRs('fn parse_all').primary);
    assert.ok(t.startsWith('fn parse_all') && t.endsWith('Ok(out)\n}'), t);
    assert.equal(L.text(scopeRs('parse_all(items').primary), t);
    const pubStruct = L.text(scopeRs('pub struct').primary);
    assert.ok(pubStruct.startsWith('pub struct Point {') && pubStruct.endsWith('}'), pubStruct);
  });

  test('impl block, match and closures', () => {
    const imp = L.text(scopeRs('impl Area').primary);
    assert.ok(imp.startsWith('impl Area for Shape {') && imp.endsWith('}'), imp);
    const m = L.text(scopeRs('match self').primary);
    assert.ok(m.startsWith('match self {') && m.endsWith('}'), m);
    assert.equal(L.text(scopeRs('move |a').primary), 'move |a: i32| a + total');
  });

  test('else and if let highlight the whole if expression', () => {
    const t = L.text(scopeRs('if let Ok').primary);
    assert.ok(t.startsWith('if let Ok(nums)') && t.endsWith('}'), t);
    assert.equal(L.text(scopeRs('let Ok', 0, 0).primary), t);
    assert.equal(L.text(scopeRs('else {\n        eprintln').primary), t);
  });

  test('break with a label targets the labelled loop', () => {
    const s = scopeRs("break 'outer");
    assert.ok(L.text(s.related).startsWith("'outer: loop {"), L.text(s.related));
    const label = scopeRs("outer: loop", 0, 0);
    assert.ok(L.text(label.primary).startsWith("'outer: loop {"));
  });

  test('plain continue targets the innermost loop', () => {
    const s = scopeRs('continue;');
    assert.ok(L.text(s.related).startsWith('for i in 0..=c'));
  });

  test('? highlights the expression and the function it may return from', () => {
    const s = scopeRs('?;');
    assert.equal(L.text(s.primary), 'item.trim().parse::<i32>()?');
    assert.ok(L.text(s.related).startsWith('fn parse_all'));
  });

  test('types, values and macros get no scope', () => {
    assert.equal(scopeRs('Vec<i32>'), undefined);
    assert.equal(scopeRs('Some(first)'), undefined);
    assert.equal(scopeRs('println!'), undefined);
  });
});
