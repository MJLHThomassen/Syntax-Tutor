import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { load } from './helpers.mjs';

let L;
before(async () => {
  L = await load('javascript', 'javascript', 'tour.js');
});

const hover = (...args) => L.hover(...args);
const scope = (...args) => L.scope(...args);
const md = (...args) => hover(...args)?.markdown;

describe('JavaScript hovers', () => {
  test('keywords get a doc with heading, example and link', () => {
    const h = md('function add');
    assert.match(h, /^\*\*`function`\*\* · JavaScript keyword/);
    assert.match(h, /```js\n/);
    assert.match(h, /developer\.mozilla\.org\/en-US\/docs\/Web\/JavaScript\/Reference\/Statements\/function/);
  });

  test('var / let / const explain their differences', () => {
    assert.match(md('var legacy'), /function-scoped/);
    assert.match(md('let counter'), /temporal dead zone/);
    assert.match(md('const shout'), /not the value/);
  });

  test('context picks the right meaning of a token', () => {
    assert.match(md('for (let i'), /classic loop/);
    assert.match(md('for (const item'), /^\*\*`for\.\.\.of`\*\*/);
    assert.match(md('for (const key'), /^\*\*`for\.\.\.in`\*\*/);
    assert.doesNotMatch(md('for (const key'), /for\.\.\.of`\*\*/);
    assert.match(md('of items)'), /\*\*`for\.\.\.of`\*\*/);
    assert.match(md('in obj)'), /\*\*`for\.\.\.in`\*\*/);
    assert.match(md("in user"), /property check/);
    assert.match(md('...tags'), /\(rest\)/);
    assert.match(md('...list'), /\(spread\)/);
    assert.match(md('{ name, age'), /object destructuring/);
    assert.match(md('{ ...rest'), /object literal/);
    assert.match(md('[first'), /array destructuring/);
    assert.match(md('function* idGenerator'), /generator/);
    assert.match(md('* idGenerator'), /generator/);
    assert.match(md('yield* idGenerator', 0, 5), /yield\* \(delegate\)/);
    assert.match(md('while (n > 0)'), /do\.\.\.while/);
    assert.match(md('default class'), /export default/);
    assert.match(md('default:'), /default \(switch\)/);
    assert.match(md('typeof user'), /typeof null/);
  });

  test('confusing operators', () => {
    assert.match(md('=== 2'), /strict equality/);
    assert.match(md("== '3'"), /loose equality/);
    assert.match(md('?? \'unknown\''), /nullish coalescing/);
    assert.match(md('?.address'), /optional chaining/);
    assert.match(md('??= name'), /nullish assignment/);
    assert.match(md('** 10'), /exponentiation/);
    assert.match(md("? 'obj'"), /conditional/);
    assert.match(md('${this.name}'), /interpolation/);
    assert.match(md('C:'), /tagged template/);
    const re = hover('giu');
    assert.match(re.markdown, /regular expression/);
    assert.equal(L.text(re.span), '/h(é|e)llo/giu');
  });

  test('built-ins only match where they are really the global', () => {
    assert.match(md('console.error'), /\*\*`console`\*\* · JavaScript built-in value/);
    assert.match(md('Map(['), /built-in type/);
    assert.match(md('parseInt('), /radix/);
    assert.match(md('JSON.parse'), /JSON/);
    assert.match(md('undefined;'), /not set/);
    assert.match(md('window.document'), /\*\*`window`\*\*/);
    // A property access is not the global, and neither is a parameter that shadows it.
    assert.equal(hover('document.title;'), undefined); // `window.document`: a property
    assert.equal(hover('document.title +'), undefined); // the `document` parameter
    assert.match(md('document) {'), /\*\*Parameter\*\*/);
    assert.doesNotMatch(md('document) {'), /built-in/);
  });

  test('declaration names describe their role', () => {
    assert.match(md('add(a'), /\*\*Function name\*\*/);
    assert.match(md('Animal {'), /\*\*Class name\*\*/);
    assert.match(md('constructor(name'), /\*\*Constructor\*\*/);
    assert.match(md('label() {'), /\*\*Getter\*\*/);
    assert.match(md('create(name'), /\*\*Static method\*\*/);
    assert.match(md('#secret = 42'), /\*\*Private field\*\*/);
    assert.match(md('count = 0'), /\*\*Static field\*\*/);
    assert.match(md('GREETING'), /\*\*Constant\*\*/);
    assert.match(md('counter = 0'), /\*\*Variable\*\*.*let/);
    assert.match(md('shout ='), /\*\*Function\*\*/);
    assert.match(md('age = 0'), /destructuring/);
    assert.match(md('err)'), /\*\*Caught error\*\*/);
    assert.match(md('read,'), /\*\*Import alias\*\*/);
    assert.match(md('path from'), /\*\*Namespace import\*\*/);
    assert.match(md('runLoops'), /\*\*Export alias\*\*/);
  });

  test('jump keywords say where they go', () => {
    assert.match(md('return a + b'), /returns from `function add\(a, b = 1\) \{`/);
    assert.match(md('break outer'), /breaks out of `outer: for \(const row of items\) \{`/);
    assert.match(md("throw new Error('bad"), /throws out of `async function loadConfig/);
    assert.match(md('await read'), /pauses `async function loadConfig/);
    assert.match(md('yield id'), /pauses `function\* idGenerator/);
  });

  test('nothing for strings, comments, plain identifiers and punctuation', () => {
    assert.equal(hover('function-scoped'), undefined); // "function" inside a string
    assert.match(hover('Hover anything').markdown, /line comment/); // comments get their own explanation
    assert.equal(hover('counter += 1'), undefined); // plain use of a variable
    assert.equal(hover('(a, b = 1)', 0, 2), undefined); // comma
  });

  test('columns after non-ASCII text (UTF-16) line up', () => {
    // Same line as "héllo 👋": the arrow and `shout` come after the emoji.
    const arrow = hover('=> s.toUpperCase');
    assert.match(arrow.markdown, /arrow function/);
    assert.equal(L.text(arrow.span), '=>');
    assert.equal(L.text(scope('shout', 0, 1).primary), 'const shout = (s) => s.toUpperCase();');
  });
});

describe('JavaScript scopes', () => {
  test('function keyword and name highlight the whole (exported) function', () => {
    for (const s of [scope('function add'), scope('add(a', 0, 1), scope('export function')]) {
      assert.equal(L.text(s.primary), 'export function add(a, b = 1) {\n  return a + b;\n}');
    }
    assert.deepEqual(scope('function add').boundaries.map((b) => L.text(b)), ['function', '}']);
  });

  test('a const name highlights its whole declaration', () => {
    assert.equal(L.text(scope('text = await').primary), "const text = await read(file, 'utf8');");
    assert.equal(L.text(scope('GREETING').primary), 'export const GREETING = "héllo 👋";');
  });

  test('a method name highlights the method; a parameter its function', () => {
    const m = L.text(scope('create(name').primary);
    assert.ok(m.startsWith('static create(name) {') && m.endsWith('}'), m);
    const p = L.text(scope('items, obj').primary);
    assert.ok(p.startsWith('function loops(items, obj) {'), p);
  });

  test('else highlights the whole if; async the function; catch its clause', () => {
    const iff = L.text(scope('if (n === 0)').primary);
    assert.ok(iff.startsWith('if (n === 0) {') && iff.endsWith("console.log('left:', n);\n  }"), iff);
    assert.equal(L.text(scope('else {').primary), iff);
    const t = L.text(scope('async function').primary);
    assert.ok(t.startsWith('async function loadConfig(file) {') && t.endsWith('}'), t);
    const c = L.text(scope('catch (err)').primary);
    assert.ok(c.startsWith('catch (err) {') && c.endsWith('}'), c);
  });

  test('cursor just after a keyword still counts', () => {
    const s = scope('class Dog', 0, 5, true);
    assert.ok(L.text(s.primary).startsWith('class Dog extends Animal {'));
  });

  test('jumps also yield the construct they leave', () => {
    const r = scope('return a + b');
    assert.equal(L.text(r.primary), 'return a + b;');
    assert.ok(L.text(r.related).startsWith('function add(a, b = 1) {'));
    assert.ok(L.text(scope('continue;').related).startsWith('for (let i = 0;'));
    assert.ok(L.text(scope('break;\n    default').related).startsWith('switch (value) {'));
    assert.ok(L.text(scope('continue outer').related).startsWith('outer: for (const row'));
  });

  test('labels highlight the labelled statement', () => {
    assert.ok(L.text(scope('outer: for').primary).startsWith('outer: for (const row of items) {'));
    assert.ok(L.text(scope('outer;').primary).startsWith('outer: for (const row of items) {'));
  });

  test('values, plain identifiers and punctuation get no scope', () => {
    assert.equal(scope('null)'), undefined);
    assert.equal(scope('counter += 1'), undefined);
    assert.equal(scope('this.name = name'), undefined);
    assert.equal(scope('console.log(item', 0, 7), undefined);
  });
});
