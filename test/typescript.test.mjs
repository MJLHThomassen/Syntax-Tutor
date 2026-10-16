import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { load } from './helpers.mjs';

let L;
let X;
before(async () => {
  L = await load('typescript', 'typescript', 'tour.ts');
  X = await load('typescript', 'tsx', 'tour.tsx');
});

const hover = (...args) => L.hover(...args);
const scope = (...args) => L.scope(...args);
const md = (...args) => hover(...args)?.markdown;

describe('TypeScript hovers', () => {
  test('TS keywords get a doc with heading, example and handbook link', () => {
    const h = md('interface Shape');
    assert.match(h, /^\*\*`interface`\*\* · TypeScript keyword/);
    assert.match(h, /```ts\n/);
    assert.match(h, /typescriptlang\.org\/docs\/handbook\/2\/objects\.html/);
  });

  test('JavaScript docs are reused', () => {
    assert.match(md('async function load'), /\*\*`async`\*\* · TypeScript keyword/);
    assert.match(md('?? \'\''), /nullish coalescing/);
    assert.match(md('?.textContent'), /optional chaining/);
    assert.match(md('return items[0]'), /returns from `function first<T>\(items: T\[\]\): T \| undefined \{`/);
  });

  test('extends means four different things', () => {
    assert.match(md('extends Base'), /inheritance/);
    assert.match(md('extends Shape {'), /extends \(interface\)/);
    assert.match(md('extends { length'), /generic constraint/);
    assert.match(md('extends (infer'), /conditional type/);
  });

  test('context picks the right meaning of ! ? : typeof void', () => {
    assert.match(md("!;"), /non-null assertion/);
    assert.match(md('label?: string', 0, 5), /\(optional property\)/);
    assert.match(md('?: { verbose'), /\(optional parameter\)/);
    assert.match(md('? a : b'), /conditional\)/);
    assert.match(md('? E : never'), /A extends B \? X : Y/);
    assert.match(md('?: T[K]'), /optional, in mapped type/);
    assert.match(md(': number; y'), /type annotation/);
    assert.match(md('typeof Geometry'), /typeof \(in a type\)/);
    assert.match(md("typeof value ==="), /\*\*`typeof`\*\*.*TypeScript operator/);
    assert.match(md('void {'), /doesn't return a value/);
  });

  test('type operators and TS-only keywords', () => {
    assert.match(md('keyof Point'), /union of the property names/);
    assert.match(md('infer E'), /captures/);
    assert.match(md('in keyof T'), /mapped type/);
    assert.match(md('is string'), /type guard/);
    assert.match(md('as const'), /\*\*`as \(type assertion\)`\*\*/);
    assert.match(md('const;'), /\*\*`as const`\*\*/);
    assert.match(md('satisfies'), /keeping the more precise type/);
    assert.match(md('| number;'), /union type/);
    assert.match(md('& { label'), /intersection type/);
    assert.match(md('<T>(items'), /type parameters/);
    assert.match(md('<Point>;'), /type arguments/);
    assert.match(md('<number>loose'), /type assertion/);
    assert.doesNotMatch(md('<number>loose'), /type arguments/);
    assert.match(md('[key: string]: unknown;\n}'), /\(index signature\)/);
    assert.match(md('[K in keyof'), /\(mapped type\)/);
    assert.doesNotMatch(md('[K in keyof'), /index signature/);
    assert.match(md('declare const'), /exists at runtime/);
    assert.match(md('namespace Geometry'), /ES modules/);
    assert.match(md('enum Color'), /named constants/);
    assert.match(md('abstract class'), /can't be instantiated/);
    assert.match(md('implements Shape'), /doesn't inherit/);
    assert.match(md('private secret'), /#private/);
    assert.match(md('private radius'), /\*\*`private \(parameter property\)`\*\*.*saving the `this\.x = x` line/s);
    assert.match(md('public tag'), /parameter property/);
    assert.match(md('public readonly'), /^\*\*`public`\*\* · TypeScript keyword/); // a plain field modifier
    assert.match(md('protected kind'), /subclasses/);
    assert.match(md('readonly name'), /not reassigned/);
    assert.match(md('@sealed'), /decorator/);
  });

  test('predefined and utility types', () => {
    assert.match(md('unknown;\n}'), /narrow it/);
    assert.match(md('any = 4'), /Turns off type checking/);
    assert.match(md('never {'), /no values/);
    const partial = md('Partial<Point>');
    assert.match(partial, /^\*\*`Partial`\*\* · TypeScript built-in type/);
    assert.match(partial, /all properties optional/);
    assert.match(partial, /utility-types\.html/);
    assert.equal(hover('Point>;'), undefined); // the user's own type inside <>: no built-in doc
    assert.match(md('Record<string, ID>'), /Record<K, V>/);
    assert.match(md('Promise<string>'), /promise/);
    assert.match(md('Function)'), /built-in type/);
    assert.match(md('Math.PI'), /built-in value/);
  });

  test('declaration names describe their role', () => {
    assert.match(md('ID ='), /\*\*Type alias\*\*/);
    assert.match(md('Shape {\n'), /\*\*Interface\*\*/);
    assert.match(md('Color {'), /\*\*Enum\*\*/);
    assert.match(md("Red = 'RED'"), /\*\*Enum member\*\*/);
    assert.match(md('Base implements'), /\*\*Abstract class\*\*/);
    assert.match(md('T>(items'), /\*\*Type parameter\*\*/);
    assert.match(md('radius: number)'), /\*\*Parameter property\*\*.*`this\.radius`/);
    assert.match(md('secret = 1'), /\*\*Class field\*\*.*\(private\)/);
    assert.match(md('#hidden'), /\*\*Private field \(#\)\*\*/);
    assert.match(md('area(): number;'), /\*\*Method signature\*\*/);
    assert.match(md('area(): number {'), /\*\*Method\*\*/);
    assert.match(md('E)[]'), /\*\*Inferred type\*\*/);
    assert.match(md('K in keyof'), /\*\*Mapped type key\*\*/);
    assert.match(md('Geometry {'), /\*\*Namespace\*\*/);
  });

  test('throw inside try is caught by it; outside, it leaves the function', () => {
    assert.match(md('throw new Error(res'), /is caught by `try \{`/);
    assert.match(md('throw new Error(message'), /throws out of `function fail\(message: string\): never \{`/);
  });

  test('nothing for strings, comments, plain identifiers', () => {
    assert.equal(hover('base\''), undefined);
    assert.match(hover('Hover anything').markdown, /line comment/); // comments get their own explanation
    assert.equal(hover('loose as', 0, 0), undefined);
  });

  test('columns after non-ASCII text (UTF-16) line up', () => {
    const h = hover('const;');
    assert.equal(L.text(h.span), 'const');
    const s = scope('as const');
    assert.equal(L.text(s.primary), '{ mode: \'dark\', greeting: "héllo 👋" } as const');
  });
});

describe('TypeScript scopes', () => {
  test('a type alias name and keyword highlight the whole (exported) alias', () => {
    assert.equal(L.text(scope('ID =').primary), 'export type ID = string | number;');
    assert.equal(L.text(scope('type ID').primary), 'export type ID = string | number;');
  });

  test('interface and declare highlight their declaration', () => {
    const t = L.text(scope('interface Square').primary);
    assert.ok(t.startsWith('interface Square extends Shape {') && t.endsWith('}'), t);
    assert.equal(L.text(scope('VERSION').primary), 'declare const VERSION: string;');
  });

  test('access modifiers and parameter properties highlight their member', () => {
    assert.equal(L.text(scope('protected kind').primary), "protected kind: string = 'base'");
    assert.ok(L.text(scope('radius: number)').primary).startsWith('constructor(private radius: number) {'));
  });

  test('type parameter highlights its generic declaration; extends its parameter', () => {
    assert.ok(L.text(scope('T extends {').primary).startsWith('function longest<T extends'));
    assert.equal(L.text(scope('extends { length').primary), 'T extends { length: number }');
  });

  test('types and punctuation get no scope', () => {
    assert.equal(scope('string | number'), undefined);
    assert.equal(scope(': number; y'), undefined);
  });
});

describe('TSX', () => {
  test('JSX tags, attributes and expressions', () => {
    assert.match(X.hover('<section').markdown, /JSX element/);
    assert.match(X.hover('section className').markdown, /\*\*JSX element\*\* · An HTML `<section>` element/);
    assert.match(X.hover('className').markdown, /`class` is a JavaScript keyword/);
    assert.match(X.hover('onClick').markdown, /event handler/);
    assert.match(X.hover('key=').markdown, /stable id/);
    assert.match(X.hover('{title}').markdown, /JSX expression/);
    assert.match(X.hover('<>').markdown, /^\*\*`<> <\/> \(JSX fragment\)`\*\*/);
    assert.match(X.hover('</>').markdown, /JSX fragment/);
    assert.doesNotMatch(X.hover('<section').markdown, /fragment/);
    assert.match(X.hover('</section').markdown, /JSX closing tag/);
    assert.match(X.hover('<br').markdown, /self-closing/);
  });

  test('TS still works inside .tsx', () => {
    assert.match(X.hover('items?').markdown, /\*\*Property\*\*.*\(optional\)/);
    assert.match(X.hover('<boolean>').markdown, /type arguments/);
  });

  test('a JSX tag highlights the whole element', () => {
    const t = X.text(X.scope('li key').primary);
    assert.equal(t, '<li key={item}>{item}</li>');
    const frag = X.text(X.scope('<>').primary);
    assert.ok(frag.startsWith('<>') && frag.endsWith('</>'), frag);
  });

  test('text after non-ASCII JSX text lines up', () => {
    const close = X.hover('</h2>');
    assert.equal(X.text(close.span), '</');
    assert.equal(X.hover('héllo'), undefined);
  });
});
