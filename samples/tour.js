// A tour of JavaScript. Hover anything to learn what it means.
import fs from 'node:fs';
import { readFile as read, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

export const GREETING = "héllo 👋"; const shout = (s) => s.toUpperCase();
let counter = 0;
var legacy = 'function-scoped';

/** Adds two numbers. */
export function add(a, b = 1) {
  return a + b;
}

export default class Animal {
  #secret = 42;
  static count = 0;

  constructor(name, ...tags) {
    this.name = name;
    this.tags = tags;
    Animal.count++;
  }

  get label() {
    return `${this.name} (${this.tags.length})`;
  }

  set label(value) {
    this.name = value;
  }

  speak() {
    return this.#secret;
  }

  static create(name) {
    return new Animal(name);
  }
}

class Dog extends Animal {
  speak() {
    return super.speak() * 2;
  }
}

function* idGenerator() {
  let id = 0;
  while (true) {
    yield id++;
  }
}

function* delegate() {
  yield* idGenerator();
}

async function loadConfig(file) {
  try {
    const text = await read(file, 'utf8');
    return JSON.parse(text);
  } catch (err) {
    console.error(err.message);
    throw new Error('bad config');
  } finally {
    counter += 1;
  }
}

function loops(items, obj) {
  for (let i = 0; i < items.length; i++) {
    if (i === 2) continue;
    if (i == '3') break;
  }
  for (const item of items) {
    console.log(item);
  }
  for (const key in obj) {
    delete obj[key];
  }
  let n = 3;
  do {
    n--;
  } while (n > 0);
  if (n === 0) {
    console.log('done');
  } else {
    console.log('left:', n);
  }
  outer: for (const row of items) {
    for (const cell of row) {
      if (cell !== 0) continue outer;
      if (cell === null) break outer;
    }
  }
}

function operators(user, list) {
  const { name, age = 0, ...rest } = user;
  const [first, , third] = list;
  const copy = [...list, 4];
  const merged = { ...rest, name };
  const city = user?.address?.city ?? 'unknown';
  user.nickname ??= name;
  user.score ||= 0;
  user.active &&= age > 18;
  const big = 2 ** 10;
  const kind = typeof user === 'object' ? 'obj' : 'other';
  const isDog = user instanceof Dog;
  const hasName = 'name' in user;
  const pattern = /h(é|e)llo/giu;
  const nothing = void 0;
  const flag = !isDog;
  const empty = undefined;
  const tagged = String.raw`C:\path\${name}`;
  return [first, third, copy, merged, city, big, kind, hasName, pattern, nothing, flag, empty, tagged];
}

function choose(value) {
  switch (value) {
    case 1:
      return 'one';
    case 2:
      break;
    default:
      return 'many';
  }
  const timer = setTimeout(() => console.log(Math.max(1, 2)), 10);
  const parsed = parseInt('42', 10);
  const items = new Map([[1, 'a']]);
  const unique = new Set([1, 1, 2]);
  const now = new Date();
  const list = Array.from(unique).map((x) => x * 2);
  const keys = Object.keys({ a: 1 });
  const done = Promise.resolve(true);
  return [timer, parsed, items, now, list, keys, done, globalThis, Symbol('id'), BigInt(10)];
}

// A parameter can shadow a global: inside, `document` is just the argument.
function render(document) {
  return document.title + window.document.title;
}

debugger;
export { loops as runLoops, operators, render };
