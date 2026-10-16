import type { Node } from 'web-tree-sitter';
import type { DocEntry, DocKind, DocTable, JumpTarget, LanguageSpec, Role } from '../core/model';
import { ancestor, fieldOf } from '../core/nodes';
import { javascriptComments } from './comments';

const MDN = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference';
const st = (name: string) => `${MDN}/Statements/${name}`;
const op = (name: string) => `${MDN}/Operators/${name}`;
const fns = (name: string) => `${MDN}/Functions/${name}`;
const cls = (name: string) => `${MDN}/Classes/${name}`;
const glob = (name: string) => `${MDN}/Global_Objects/${name}`;
const API = 'https://developer.mozilla.org/en-US/docs/Web/API';
const REACT = 'https://react.dev';

const docs: DocTable = {
  // ------------------------------------------------------------ declarations
  var: {
    kind: 'keyword',
    summary: 'Declares a variable the old way: it is **function-scoped** (not block-scoped) and **hoisted** to the top of the function, where it starts as `undefined`.',
    details: 'Gotcha: a `var` inside an `if` or `for` block is visible in the whole function, and closures in a loop all share the same `var`. Prefer `let` or `const` in new code.',
    example: 'if (true) {\n  var x = 1;\n}\nconsole.log(x); // 1, the block does not contain it',
    link: st('var'),
  },
  let: {
    kind: 'keyword',
    summary: 'Declares a **block-scoped** variable that can be reassigned later.',
    details: 'Using it before its declaration line throws a `ReferenceError` (the *temporal dead zone*), unlike `var`. In a `for (let i ...)` loop, every iteration gets a fresh `i`.',
    example: 'let count = 0;\ncount += 1;',
    link: st('let'),
  },
  const: {
    kind: 'keyword',
    summary: 'Declares a **block-scoped** name that cannot be reassigned. It needs a value right away.',
    details: 'Gotcha: `const` freezes the *binding*, not the value. A `const` object or array can still be changed (`list.push(4)` works); only `list = []` is an error.',
    example: 'const MAX = 10;\nconst list = [1, 2];\nlist.push(3); // fine\n// list = [];  // TypeError',
    link: st('const'),
  },
  function: {
    kind: 'keyword',
    summary: 'Declares a named **function**. Function declarations are hoisted: you can call them before the line where they appear.',
    details: 'Parameters are not type-checked and the caller may pass more or fewer arguments; missing ones are `undefined`. Without `return`, a function returns `undefined`.',
    example: 'function add(a, b = 1) {\n  return a + b;\n}',
    link: st('function'),
  },
  'function_expression/function': {
    kind: 'keyword',
    title: 'function (expression)',
    summary: 'A **function expression**: creates a function as a value, e.g. to store in a variable or pass as an argument. Unlike a declaration it is not hoisted.',
    details: 'An optional name (`function fact(n) {...}`) is only visible inside the function itself, handy for recursion. Unlike arrow functions, it has its own `this`.',
    example: 'const square = function (x) {\n  return x * x;\n};',
    link: op('function'),
  },
  'generator_function_declaration/function': {
    kind: 'keyword',
    title: 'function* (generator)',
    summary: 'Declares a **generator function**. Calling it does not run the body; it returns an iterator, and each `next()` runs until the next `yield`.',
    example: 'function* count() {\n  yield 1;\n  yield 2;\n}\nfor (const n of count()) console.log(n);',
    link: st('function*'),
  },
  'generator_function/function': {
    kind: 'keyword',
    title: 'function* (generator expression)',
    summary: 'A **generator function** used as a value. Calling it returns an iterator that runs the body step by step, pausing at each `yield`.',
    link: op('function*'),
  },
  'generator_function_declaration/*': {
    kind: 'syntax',
    title: 'function* (generator)',
    summary: 'The `*` makes this a **generator function**: it can pause with `yield` and resume later. Calling it returns an iterator.',
    link: st('function*'),
  },
  'generator_function/*': {
    kind: 'syntax',
    title: 'function* (generator)',
    summary: 'The `*` makes this a **generator function**: it can pause with `yield` and resume later.',
    link: op('function*'),
  },
  'method_definition/*': {
    kind: 'syntax',
    title: '*method() (generator method)',
    summary: 'The `*` makes this method a **generator**: calling it returns an iterator, and the body pauses at each `yield`.',
    example: 'class Tree {\n  *[Symbol.iterator]() {\n    yield* this.children;\n  }\n}',
    link: fns('Method_definitions'),
  },
  'arrow_function/=>': {
    kind: 'operator',
    title: '=> (arrow function)',
    summary: 'An **arrow function**: a short function expression. With a single expression after `=>`, its value is returned automatically.',
    details: 'Arrow functions have no own `this`: they use the `this` of the surrounding code, which is why they are popular for callbacks. To return an object literal, wrap it in parentheses: `() => ({ a: 1 })`.',
    example: 'const double = (x) => x * 2;\nconst sum = (a, b) => {\n  return a + b;\n};',
    link: fns('Arrow_functions'),
  },
  async: {
    kind: 'keyword',
    summary: 'Makes a function **asynchronous**: it always returns a `Promise`, and inside it you can use `await` to wait for other promises without blocking.',
    details: 'A value you `return` resolves the promise; an exception you `throw` rejects it. Callers need `await` or `.then()` to get the result.',
    example: 'async function load(url) {\n  const res = await fetch(url);\n  return res.json();\n}',
    link: st('async_function'),
  },
  await: {
    kind: 'keyword',
    summary: 'Pauses the `async` function until the promise settles, then gives its value (or throws its error). Other code keeps running in the meantime.',
    details: 'Only allowed inside `async` functions (and at the top level of ES modules). Gotcha: `await` in a loop runs the steps one after the other; use `Promise.all` to run them in parallel.',
    example: 'const [a, b] = await Promise.all([loadA(), loadB()]);',
    link: op('await'),
  },
  yield: {
    kind: 'keyword',
    summary: 'Pauses a **generator** and hands a value to whoever called `next()`. The generator continues from here on the next `next()` call.',
    example: 'function* ids() {\n  let id = 0;\n  while (true) yield id++;\n}',
    link: op('yield'),
  },
  'yield_expression/*': {
    kind: 'operator',
    title: 'yield* (delegate)',
    summary: '`yield*` **delegates** to another iterable or generator: it yields each of its values in turn before continuing.',
    example: 'function* all() {\n  yield* [1, 2];\n  yield* other();\n}',
    link: op('yield*'),
  },
  return: {
    kind: 'keyword',
    summary: 'Ends the function and gives a value back to the caller. A bare `return` (or none at all) returns `undefined`.',
    details: 'Gotcha: a line break right after `return` ends the statement, so `return` followed by a value on the next line returns `undefined`.',
    example: 'function sign(n) {\n  if (n < 0) return -1;\n  return 1;\n}',
    link: st('return'),
  },

  // ------------------------------------------------------------------ classes
  class: {
    kind: 'keyword',
    summary: 'Declares a **class**: a template for objects with a `constructor`, methods and fields. Create instances with `new`.',
    details: 'Classes are syntax over JavaScript\'s prototypes. Unlike function declarations they are not usable before their definition line. Class bodies are always in strict mode.',
    example: 'class Point {\n  constructor(x, y) {\n    this.x = x;\n    this.y = y;\n  }\n  length() {\n    return Math.hypot(this.x, this.y);\n  }\n}',
    link: st('class'),
  },
  'class/class': {
    kind: 'keyword',
    title: 'class (expression)',
    summary: 'A **class expression**: defines a class as a value, e.g. to assign or return it. The optional name is only visible inside the class.',
    link: op('class'),
  },
  'class_heritage/extends': {
    kind: 'keyword',
    title: 'extends (inheritance)',
    summary: 'Makes this class a **subclass**: it inherits the methods of the parent class. In the subclass constructor, call `super(...)` before using `this`.',
    example: 'class Dog extends Animal {\n  speak() {\n    return `${super.speak()} woof`;\n  }\n}',
    link: cls('extends'),
  },
  super: {
    kind: 'keyword',
    summary: '`super(...)` calls the **parent class constructor**; `super.method()` calls the parent\'s version of a method you are overriding.',
    details: 'In a subclass constructor you must call `super(...)` before touching `this`.',
    example: 'constructor(name) {\n  super(name);\n  this.barks = true;\n}',
    link: op('super'),
  },
  this: {
    kind: 'keyword',
    summary: 'The object the current function was called **on**. In a method called as `obj.m()`, `this` is `obj`; in a constructor it is the new instance.',
    details: 'Gotcha: `this` depends on *how* a function is called, not where it is defined. Passing `obj.m` as a callback loses `this`. Arrow functions don\'t have their own `this` and use the surrounding one instead.',
    example: 'const counter = {\n  n: 0,\n  inc() { this.n++; },\n};',
    link: op('this'),
  },
  new: {
    kind: 'keyword',
    summary: 'Creates a new object from a class or constructor function: it makes the object, runs the constructor with `this` set to it, and returns it.',
    example: 'const now = new Date();\nconst seen = new Set();',
    link: op('new'),
  },
  'meta_property/new': {
    kind: 'keyword',
    title: 'new.target',
    summary: 'Inside a function or constructor: the class that `new` was called on, or `undefined` if the function was called without `new`.',
    link: op('new.target'),
  },
  'meta_property/target': {
    kind: 'keyword',
    title: 'new.target',
    summary: 'Inside a function or constructor: the class that `new` was called on, or `undefined` if the function was called without `new`.',
    link: op('new.target'),
  },
  static: {
    kind: 'keyword',
    summary: 'Makes a member belong to the **class itself** instead of to each instance. Call it as `ClassName.member`, not on an instance.',
    example: 'class Temp {\n  static fromF(f) {\n    return new Temp((f - 32) / 1.8);\n  }\n}\nTemp.fromF(100);',
    link: cls('static'),
  },
  'class_static_block/static': {
    kind: 'keyword',
    title: 'static { } (static block)',
    summary: 'A **static initialization block**: code that runs once when the class is defined, for setting up static fields.',
    link: cls('Static_initialization_blocks'),
  },
  get: {
    kind: 'keyword',
    summary: 'Defines a **getter**: a method that runs when the property is read. It looks like a plain property to callers (`obj.label`, no parentheses).',
    example: 'class Circle {\n  get area() {\n    return Math.PI * this.r ** 2;\n  }\n}\ncircle.area; // no ()',
    link: fns('get'),
  },
  set: {
    kind: 'keyword',
    summary: 'Defines a **setter**: a method that runs when the property is assigned (`obj.label = "x"`). Takes exactly one parameter, the new value.',
    example: 'set name(value) {\n  this._name = value.trim();\n}',
    link: fns('set'),
  },

  // ------------------------------------------------------------ control flow
  if: {
    kind: 'keyword',
    summary: 'Runs a statement only when the condition is **truthy**.',
    details: 'Falsy values are `false`, `0`, `""`, `null`, `undefined` and `NaN`; everything else is truthy, including `[]` and `{}`.',
    example: 'if (items.length === 0) {\n  return;\n} else if (items.length > 9) {\n  warn();\n}',
    link: st('if...else'),
  },
  else: {
    kind: 'keyword',
    summary: 'The branch of an `if` that runs when the condition is falsy. Chain more checks with `else if`.',
    link: st('if...else'),
  },
  switch: {
    kind: 'keyword',
    summary: 'Compares a value against several `case`s using **strict equality** (`===`) and jumps to the first match.',
    details: 'Gotcha: execution **falls through** into the next case unless you `break` (or `return`). `let`/`const` in cases share one block; wrap a case in `{ }` to give it its own.',
    example: 'switch (cmd) {\n  case "start":\n    run();\n    break;\n  default:\n    help();\n}',
    link: st('switch'),
  },
  case: {
    kind: 'keyword',
    summary: 'One branch of a `switch`: runs when the switch value is `===` to this value. Without `break`, it falls through into the next case.',
    link: st('switch'),
  },
  'switch_default/default': {
    kind: 'keyword',
    title: 'default (switch)',
    summary: 'The branch of a `switch` that runs when no `case` matched.',
    link: st('switch'),
  },
  'for_statement/for': {
    kind: 'keyword',
    title: 'for (classic loop)',
    summary: 'The classic C-style loop: `for (init; condition; step)`. Runs the body while the condition is truthy, doing `step` after each pass.',
    details: 'With `let i`, every iteration gets its own copy of `i`, so closures created in the loop remember the right value (with `var` they would all see the last one).',
    example: 'for (let i = 0; i < 3; i++) {\n  console.log(i);\n}',
    link: st('for'),
  },
  'for_in_statement/of': {
    kind: 'keyword',
    title: 'for...of',
    summary: 'Loops over the **values** of an iterable: arrays, strings, `Map`, `Set`, generators... This is usually what you want for arrays.',
    example: 'for (const [key, value] of map) {\n  console.log(key, value);\n}',
    link: st('for...of'),
  },
  'for_in_statement/in': {
    kind: 'keyword',
    title: 'for...in',
    summary: 'Loops over the **property names** (keys) of an object, including inherited enumerable ones.',
    details: 'Gotcha: on arrays it yields indexes as strings ("0", "1", ...). Use `for...of` for array values, or `Object.keys`/`Object.entries` for an object\'s own keys.',
    example: 'for (const key in settings) {\n  console.log(key, settings[key]);\n}',
    link: st('for...in'),
  },
  'while_statement/while': {
    kind: 'keyword',
    title: 'while',
    summary: 'Repeats the body as long as the condition is truthy. The condition is checked **before** each pass.',
    example: 'while (queue.length > 0) {\n  handle(queue.shift());\n}',
    link: st('while'),
  },
  do: {
    kind: 'keyword',
    title: 'do...while',
    summary: 'A loop that runs the body **first** and checks the condition afterwards, so the body runs at least once.',
    example: 'do {\n  answer = ask();\n} while (!answer);',
    link: st('do...while'),
  },
  'do_statement/while': {
    kind: 'keyword',
    title: 'do...while',
    summary: 'The condition of a `do...while` loop, checked **after** each pass.',
    link: st('do...while'),
  },
  break: {
    kind: 'keyword',
    summary: 'Exits the innermost loop or `switch` immediately. `break label` exits the labelled statement instead, e.g. an outer loop.',
    example: 'outer: for (const row of grid) {\n  for (const cell of row) {\n    if (cell === 0) break outer;\n  }\n}',
    link: st('break'),
  },
  continue: {
    kind: 'keyword',
    summary: 'Skips the rest of this iteration and goes on with the next one of the innermost loop (or of the labelled loop with `continue label`).',
    link: st('continue'),
  },
  'labeled_statement/:': {
    kind: 'syntax',
    title: 'label:',
    summary: 'A **label** names the statement after it (usually a loop) so `break label` / `continue label` can target it from inside nested loops.',
    link: st('label'),
  },
  try: {
    kind: 'keyword',
    title: 'try...catch',
    summary: 'Runs the block and, if anything inside it **throws**, jumps to the `catch` block instead of crashing. A `finally` block always runs at the end.',
    details: 'Errors thrown inside a promise that you don\'t `await` are not caught here.',
    example: 'try {\n  data = JSON.parse(text);\n} catch (err) {\n  console.error("bad JSON", err);\n}',
    link: st('try...catch'),
  },
  catch: {
    kind: 'keyword',
    summary: 'Handles an error thrown in the `try` block. The parameter (optional) holds whatever was thrown, usually an `Error`.',
    details: 'JavaScript has one catch block per `try`, with no type filtering: check `err instanceof TypeError` yourself if needed.',
    link: st('try...catch'),
  },
  finally: {
    kind: 'keyword',
    summary: 'A block that **always** runs after `try`/`catch`, whether an error happened or not, even after a `return`. Used for cleanup.',
    link: st('try...catch'),
  },
  throw: {
    kind: 'keyword',
    summary: 'Raises an exception: execution stops and jumps to the nearest enclosing `catch`. Uncaught, it ends the script (or rejects the async function\'s promise).',
    details: 'You can throw any value, but throw an `Error` (or subclass) to get a message and a stack trace.',
    example: 'if (!user) {\n  throw new Error("user not found");\n}',
    link: st('throw'),
  },
  debugger: {
    kind: 'keyword',
    summary: 'Pauses execution here **if** developer tools / a debugger is attached, like a breakpoint in code. Otherwise it does nothing.',
    link: st('debugger'),
  },
  with: {
    kind: 'keyword',
    summary: 'Deprecated: makes the properties of an object usable as if they were variables inside the block. Forbidden in strict mode and modules; avoid it.',
    link: st('with'),
  },

  // ------------------------------------------------------------------ modules
  import: {
    kind: 'keyword',
    title: 'import',
    summary: 'Loads another **ES module** and brings some of its exports into this file. Imports are hoisted and read-only.',
    example: 'import fs from "node:fs";              // default export\nimport { readFile } from "node:fs/promises"; // named\nimport * as path from "node:path";     // everything',
    link: st('import'),
  },
  'meta_property/import': {
    kind: 'keyword',
    title: 'import.meta',
    summary: 'An object with information about the current module, e.g. `import.meta.url` (the URL of this file).',
    link: op('import.meta'),
  },
  'meta_property/meta': {
    kind: 'keyword',
    title: 'import.meta',
    summary: 'An object with information about the current module, e.g. `import.meta.url` (the URL of this file).',
    link: op('import.meta'),
  },
  export: {
    kind: 'keyword',
    summary: 'Makes a declaration available to other modules, which can then `import` it. Everything not exported stays private to the file.',
    example: 'export const PI = 3.14;\nexport function area(r) { return PI * r * r; }\nexport { area as circleArea };',
    link: st('export'),
  },
  'export_statement/default': {
    kind: 'keyword',
    title: 'export default',
    summary: 'The module\'s **default export**: importers can give it any name, without braces (`import Animal from "./animal.js"`). A module has at most one.',
    link: st('export'),
  },
  'export_statement/*': {
    kind: 'operator',
    title: 'export * from',
    summary: 'Re-exports **all** named exports of another module from this one.',
    link: st('export'),
  },
  from: {
    kind: 'keyword',
    summary: 'Names the module to import from (or re-export from): a relative path like `"./util.js"` or a package name.',
    link: st('import'),
  },
  as: {
    kind: 'keyword',
    title: 'as (rename)',
    summary: 'Renames an import or export: `{ a as b }` makes `a` available under the name `b`.',
    example: 'import { readFile as read } from "node:fs/promises";\nexport { loops as runLoops };',
    link: st('import'),
  },
  'namespace_import/*': {
    kind: 'operator',
    title: 'import * as',
    summary: 'Imports **all** exports of a module as one object (a *namespace*): use them as `name.export`.',
    example: 'import * as path from "node:path";\npath.join("a", "b");',
    link: st('import'),
  },
  'namespace_import/as': {
    kind: 'keyword',
    title: 'import * as',
    summary: 'Gives the namespace object (all exports of the module) a local name.',
    link: st('import'),
  },
  'namespace_export/as': {
    kind: 'keyword',
    title: 'export * as',
    summary: 'Names the namespace object that re-exports everything from the other module.',
    link: st('export'),
  },
  'namespace_export/*': {
    kind: 'operator',
    title: 'export * as',
    summary: 'Re-exports all exports of another module as a single named namespace object.',
    link: st('export'),
  },
  'named_imports/{': {
    kind: 'syntax',
    title: '{ } (named imports)',
    summary: 'Picks **named exports** out of the module. This is not destructuring: renaming uses `as`, not `:`.',
    link: st('import'),
  },
  'export_clause/{': {
    kind: 'syntax',
    title: '{ } (named exports)',
    summary: 'Lists names declared elsewhere in this file to export, optionally renamed with `as`.',
    link: st('export'),
  },

  // ---------------------------------------------------------- operator words
  'unary_expression/typeof': {
    kind: 'operator',
    title: 'typeof',
    summary: 'Gives a **string** naming the type of a value: `"number"`, `"string"`, `"boolean"`, `"undefined"`, `"object"`, `"function"`, `"symbol"` or `"bigint"`.',
    details: 'Gotchas: `typeof null` is `"object"` (a historic bug), and arrays are `"object"` too; use `Array.isArray(x)` for arrays.',
    example: 'typeof 42;        // "number"\ntypeof null;      // "object" (!)\ntypeof undefinedVar; // "undefined", no error',
    link: op('typeof'),
  },
  instanceof: {
    kind: 'operator',
    summary: 'Checks whether an object was created by a class (or one of its subclasses), by looking at its prototype chain.',
    example: 'err instanceof TypeError\n[] instanceof Array // true',
    link: op('instanceof'),
  },
  'binary_expression/in': {
    kind: 'operator',
    title: 'in (property check)',
    summary: '`"key" in obj` is `true` if the object has a property with that name (own or inherited), even if its value is `undefined`.',
    example: '"name" in user // true or false',
    link: op('in'),
  },
  delete: {
    kind: 'operator',
    summary: 'Removes a **property** from an object. It does not free memory or delete variables.',
    details: 'On arrays it leaves a hole (`[1, , 3]`) and does not change `length`; use `splice` instead.',
    example: 'delete user.password;',
    link: op('delete'),
  },
  'unary_expression/void': {
    kind: 'operator',
    title: 'void',
    summary: 'Evaluates the expression and returns `undefined`. Mostly seen as `void 0` (a safe way to write `undefined`) or to ignore a promise on purpose.',
    link: op('void'),
  },

  // ------------------------------------------------------------- operators
  '===': {
    kind: 'operator',
    title: '=== (strict equality)',
    summary: '`true` if both sides have the **same type and value**, with no conversion. This is the equality check to use by default.',
    details: 'Objects and arrays compare by **reference**: `[1] === [1]` is `false`. `NaN === NaN` is `false`; use `Number.isNaN`.',
    example: '1 === 1     // true\n1 === "1"   // false\n[] === []   // false (different objects)',
    link: op('Strict_equality'),
  },
  '!==': {
    kind: 'operator',
    title: '!== (strict inequality)',
    summary: '`true` if the two sides differ in type or value, with no conversion. The opposite of `===`.',
    link: op('Strict_inequality'),
  },
  '==': {
    kind: 'operator',
    title: '== (loose equality)',
    summary: 'Equality **with type conversion**: `1 == "1"` is `true`. The conversion rules are surprising, so most style guides use `===` instead.',
    details: 'The one common use: `x == null` is true for both `null` and `undefined`.',
    example: '0 == ""        // true (!)\nnull == undefined // true\n"1" == 1       // true',
    link: op('Equality'),
  },
  '!=': {
    kind: 'operator',
    title: '!= (loose inequality)',
    summary: 'The opposite of `==`: compares **with type conversion**. Prefer `!==`.',
    link: op('Inequality'),
  },
  '??': {
    kind: 'operator',
    title: '?? (nullish coalescing)',
    summary: 'Gives the right side only if the left side is `null` or `undefined`; otherwise the left side.',
    details: 'Unlike `||`, it keeps valid falsy values: `0 ?? 5` is `0`, while `0 || 5` is `5`.',
    example: 'const port = config.port ?? 8080;',
    link: op('Nullish_coalescing'),
  },
  '#optional_chain': {
    kind: 'operator',
    title: '?. (optional chaining)',
    summary: 'Accesses a property or calls a method **only if** the value on the left is not `null`/`undefined`; otherwise the whole chain gives `undefined` instead of throwing.',
    example: 'user?.address?.city\nlist?.[0]\ncallback?.()',
    link: op('Optional_chaining'),
  },
  'optional_chain/?.': {
    kind: 'operator',
    title: '?. (optional chaining)',
    summary: 'Accesses a property or calls a method **only if** the value on the left is not `null`/`undefined`; otherwise the whole chain gives `undefined` instead of throwing.',
    example: 'user?.address?.city\nlist?.[0]\ncallback?.()',
    link: op('Optional_chaining'),
  },
  '??=': {
    kind: 'operator',
    title: '??= (nullish assignment)',
    summary: 'Assigns only if the left side is currently `null` or `undefined`. `a ??= b` is short for `a ?? (a = b)`.',
    example: 'options.retries ??= 3;',
    link: op('Nullish_coalescing_assignment'),
  },
  '||=': {
    kind: 'operator',
    title: '||= (logical OR assignment)',
    summary: 'Assigns only if the left side is currently **falsy** (`0`, `""`, `false`, `null`, ...).',
    example: 'name ||= "anonymous";',
    link: op('Logical_OR_assignment'),
  },
  '&&=': {
    kind: 'operator',
    title: '&&= (logical AND assignment)',
    summary: 'Assigns only if the left side is currently **truthy**.',
    example: 'user.session &&= refresh(user.session);',
    link: op('Logical_AND_assignment'),
  },
  '||': {
    kind: 'operator',
    title: '|| (logical OR)',
    summary: 'Gives the left side if it is truthy, otherwise the right side. It does not have to produce a boolean.',
    details: 'Often used for defaults (`name || "guest"`), but it also replaces `0` and `""`; use `??` if those are valid values.',
    link: op('Logical_OR'),
  },
  '&&': {
    kind: 'operator',
    title: '&& (logical AND)',
    summary: 'Gives the left side if it is falsy, otherwise the right side. Stops early, so the right side only runs when the left is truthy.',
    example: 'isAdmin && showPanel(); // call only for admins',
    link: op('Logical_AND'),
  },
  'unary_expression/!': {
    kind: 'operator',
    title: '! (logical NOT)',
    summary: 'Turns a value into a boolean and flips it. `!!x` converts any value to `true`/`false`.',
    link: op('Logical_NOT'),
  },
  'binary_expression/+': {
    kind: 'operator',
    title: '+ (add / concatenate)',
    summary: 'Adds numbers, or **joins strings** if either side is a string.',
    details: 'Gotcha: `"1" + 2` is `"12"`, but `"3" - 1` is `2`. Convert input with `Number(x)` before adding.',
    link: op('Addition'),
  },
  '**': {
    kind: 'operator',
    title: '** (exponentiation)',
    summary: 'Raises the left side to the power of the right side: `2 ** 10` is `1024`. Same as `Math.pow`.',
    link: op('Exponentiation'),
  },
  '++': {
    kind: 'operator',
    title: '++ (increment)',
    summary: 'Adds 1 to a variable. `x++` gives the **old** value, `++x` the new one.',
    link: op('Increment'),
  },
  '--': {
    kind: 'operator',
    title: '-- (decrement)',
    summary: 'Subtracts 1 from a variable. `x--` gives the **old** value, `--x` the new one.',
    link: op('Decrement'),
  },
  'ternary_expression/?': {
    kind: 'operator',
    title: 'a ? b : c (conditional)',
    summary: 'The **conditional operator**: gives `b` if `a` is truthy, else `c`. An `if/else` that produces a value.',
    example: 'const label = n === 1 ? "item" : "items";',
    link: op('Conditional_operator'),
  },
  'ternary_expression/:': {
    kind: 'operator',
    title: 'a ? b : c (conditional)',
    summary: 'Separates the two results of the conditional operator: the part after `:` is used when the condition is falsy.',
    link: op('Conditional_operator'),
  },
  'sequence_expression/,': {
    kind: 'operator',
    title: ', (comma operator)',
    summary: 'Evaluates both expressions left to right and gives the value of the **last** one. Mostly seen in `for` loop headers.',
    example: 'for (let i = 0, j = 9; i < j; i++, j--) {}',
    link: op('Comma_operator'),
  },
  'spread_element/...': {
    kind: 'operator',
    title: '... (spread)',
    summary: '**Spreads** the items of an array/iterable (or the properties of an object) into the surrounding array, object or argument list. Makes a shallow copy.',
    example: 'const all = [...a, ...b];\nconst updated = { ...user, name: "Ann" };\nMath.max(...numbers);',
    link: op('Spread_syntax'),
  },
  'rest_pattern/...': {
    kind: 'operator',
    title: '... (rest)',
    summary: 'Collects the **remaining** items into one array (or the remaining properties into one object). In parameters: any number of extra arguments.',
    details: 'Same three dots as spread, opposite direction: rest *gathers* where a name is declared, spread *expands* where a value is used. It must come last.',
    example: 'function log(level, ...messages) {}\nconst [head, ...tail] = list;\nconst { id, ...others } = user;',
    link: fns('rest_parameters'),
  },
  'object_pattern/{': {
    kind: 'syntax',
    title: '{ } (object destructuring)',
    summary: '**Destructuring**: pulls properties out of an object into variables of the same name. `{ a: x }` renames, `{ a = 1 }` gives a default.',
    example: 'const { name, age = 0, address: { city } } = user;',
    link: op('Destructuring'),
  },
  'array_pattern/[': {
    kind: 'syntax',
    title: '[ ] (array destructuring)',
    summary: '**Destructuring**: assigns array items to variables by position. Leave a gap to skip an item.',
    example: 'const [first, , third] = list;\n[a, b] = [b, a]; // swap',
    link: op('Destructuring'),
  },
  'assignment_pattern/=': {
    kind: 'operator',
    title: '= (default value)',
    summary: 'A **default value**, used when the argument (or destructured item) is `undefined`. Not used for `null`.',
    example: 'function greet(name = "world") {}',
    link: fns('Default_parameters'),
  },
  'object_assignment_pattern/=': {
    kind: 'operator',
    title: '= (default value)',
    summary: 'A **default value** for a destructured property, used when the property is missing or `undefined`.',
    link: op('Destructuring'),
  },
  'object/{': {
    kind: 'syntax',
    title: '{ } (object literal)',
    summary: 'Creates a new object with the listed properties. `{ name }` is short for `{ name: name }`; `[expr]: value` computes the key.',
    example: 'const point = { x: 1, y: 2, [key]: 3, toString() { return "p"; } };',
    link: op('Object_initializer'),
  },
  'computed_property_name/[': {
    kind: 'syntax',
    title: '[expr] (computed key)',
    summary: 'A **computed property name**: the key is the value of the expression in brackets, not the literal text.',
    link: op('Object_initializer'),
  },
  'statement_block/{': {
    kind: 'syntax',
    title: '{ } (block)',
    summary: 'A **block** of statements. Variables declared inside with `let`/`const` exist only until the closing `}` (`var` ignores blocks).',
    link: st('block'),
  },
  '#template_string': {
    kind: 'literal',
    title: '`...` (template literal)',
    summary: 'A **template literal**: a string in backticks that can span lines and embed values with `${expression}`.',
    details: 'Written directly after a function (`tag`...``), it is a *tagged template*: the function receives the text parts and the values separately, e.g. `String.raw` keeps backslashes as-is.',
    example: 'const msg = `Hello ${user.name}, you have ${n} messages`;\nconst path = String.raw`C:\\temp`;',
    link: `${MDN}/Template_literals`,
  },
  'template_substitution/${': {
    kind: 'syntax',
    title: '${ } (interpolation)',
    summary: 'Inserts the value of the expression into the template literal, converted to a string.',
    example: '`Total: ${price * qty} EUR`',
    link: `${MDN}/Template_literals`,
  },
  '#regex': {
    kind: 'literal',
    title: '/.../flags (regular expression)',
    summary: 'A **regular expression** literal, a pattern for matching text. Flags after the closing `/`: `g` all matches, `i` ignore case, `u` Unicode, `m` multiline...',
    example: '/^\\d{4}$/.test("2024"); // true\n"a-b-c".replace(/-/g, "+");',
    link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions',
  },

  // ------------------------------------------------------------------- JSX
  'jsx_opening_element/<': {
    kind: 'syntax',
    title: '<Tag> (JSX element)',
    summary: '**JSX**: HTML-like markup inside JavaScript, compiled to function calls (e.g. `React.createElement`). Lowercase tags are HTML elements, Capitalized tags are your components.',
    details: 'Attributes use JavaScript names: `className` instead of `class`, `onClick` instead of `onclick`. Values in `{ }` are JavaScript expressions.',
    example: 'const el = <h1 className="title">Hi {user.name}</h1>;\nconst card = <Avatar user={user} />;',
    link: `${REACT}/learn/writing-markup-with-jsx`,
  },
  'jsx_closing_element/</': {
    kind: 'syntax',
    title: '</Tag> (JSX closing tag)',
    summary: 'Closes the JSX element opened by the matching tag.',
    link: `${REACT}/learn/writing-markup-with-jsx`,
  },
  'jsx_self_closing_element/<': {
    kind: 'syntax',
    title: '<Tag /> (self-closing JSX)',
    summary: 'A JSX element without children. In JSX every tag must be closed, so empty HTML tags are written `<br />`, `<img />`.',
    link: `${REACT}/learn/writing-markup-with-jsx`,
  },
  'jsx_expression/{': {
    kind: 'syntax',
    title: '{ } (JSX expression)',
    summary: 'Curly braces switch from markup back to **JavaScript**: the expression\'s value is inserted as text, an attribute value or child elements.',
    details: 'Only expressions are allowed, not statements: use `cond && <X />` or `a ? <X /> : <Y />` instead of `if`, and `list.map(...)` instead of `for`.',
    example: '<p>{user.name}</p>\n<img src={url} />\n{items.map((i) => <li key={i.id}>{i.text}</li>)}',
    link: `${REACT}/learn/javascript-in-jsx-with-curly-braces`,
  },

  // ----------------------------------------------------------------- values
  true: { kind: 'value', summary: 'The boolean value true.', link: glob('Boolean') },
  false: { kind: 'value', summary: 'The boolean value false. Note that `0`, `""`, `null`, `undefined` and `NaN` are also *falsy* in conditions.', link: glob('Boolean') },
  null: {
    kind: 'value',
    summary: '"Intentionally no value". You assign `null` yourself; JavaScript uses `undefined` for things that were never set.',
    details: 'Gotcha: `typeof null` is `"object"`. Check for both missing values with `x == null` or `x ?? fallback`.',
    link: op('null'),
  },
  undefined: {
    kind: 'value',
    summary: 'The value of anything not set: an uninitialized variable, a missing argument or property, or a function without `return`.',
    link: glob('undefined'),
  },

  // --------------------------------------------------------------- built-ins
  console: {
    kind: 'value',
    summary: 'The debugging console: `console.log(...)` prints values; also `console.error`, `console.warn`, `console.table`.',
    example: 'console.log("total:", total);',
    link: `${API}/console`,
  },
  Math: {
    kind: 'value',
    summary: 'Built-in object with math constants and functions: `Math.PI`, `Math.max`, `Math.round`, `Math.floor`, `Math.random()`...',
    details: 'Not a class: you never write `new Math()`.',
    link: glob('Math'),
  },
  JSON: {
    kind: 'value',
    summary: 'Converts between values and JSON text: `JSON.stringify(value)` and `JSON.parse(text)`.',
    details: '`JSON.parse` throws on invalid input; `JSON.stringify` drops functions and `undefined` values.',
    example: 'const copy = JSON.parse(JSON.stringify(data));',
    link: glob('JSON'),
  },
  Promise: {
    kind: 'type',
    summary: 'A **promise** stands for a value that will be available later (or an error). Get the result with `await` or `.then()`/`.catch()`.',
    example: 'const [a, b] = await Promise.all([p1, p2]);\nawait new Promise((r) => setTimeout(r, 100));',
    link: glob('Promise'),
  },
  Array: {
    kind: 'type',
    summary: 'The array class. Useful statics: `Array.isArray(x)`, `Array.from(iterable)`, `Array.of(...)`. Arrays have methods like `map`, `filter`, `reduce`, `find`.',
    link: glob('Array'),
  },
  Object: {
    kind: 'type',
    summary: 'The base of all objects. Handy statics: `Object.keys`, `Object.values`, `Object.entries`, `Object.assign`, `Object.freeze`.',
    link: glob('Object'),
  },
  Map: {
    kind: 'type',
    summary: 'A key-value collection where keys can be **any** value (not just strings) and insertion order is kept. Use `get`, `set`, `has`, `delete`, `size`.',
    example: 'const ages = new Map([["ann", 31]]);\nages.set("bob", 25);',
    link: glob('Map'),
  },
  Set: {
    kind: 'type',
    summary: 'A collection of **unique** values. Use `add`, `has`, `delete`, `size`. `[...new Set(list)]` removes duplicates.',
    link: glob('Set'),
  },
  Date: {
    kind: 'type',
    summary: 'A point in time. `new Date()` is now; `Date.now()` gives milliseconds since 1970.',
    details: 'Gotcha: months are 0-based: `new Date(2024, 0, 31)` is 31 January.',
    link: glob('Date'),
  },
  Error: {
    kind: 'type',
    summary: 'The standard error class: has a `message` and a `stack` trace. Throw it (or a subclass like `TypeError`) to signal a failure.',
    example: 'throw new Error("not found");\nclass HttpError extends Error {}',
    link: glob('Error'),
  },
  String: { kind: 'type', summary: 'The string class. `String(x)` converts to a string; `String.raw` is a tag for raw template literals.', link: glob('String') },
  Number: { kind: 'type', summary: 'The number class. `Number(x)` converts to a number (or `NaN`); statics like `Number.isInteger`, `Number.isNaN`.', link: glob('Number') },
  Boolean: { kind: 'type', summary: '`Boolean(x)` converts any value to `true`/`false` (same as `!!x`).', link: glob('Boolean') },
  RegExp: { kind: 'type', summary: 'The regular expression class; `new RegExp(text, flags)` builds a pattern from a string.', link: glob('RegExp') },
  parseInt: {
    kind: 'function',
    summary: 'Parses the start of a string as an integer. Always pass the radix: `parseInt(text, 10)`.',
    details: 'It stops at the first invalid character (`parseInt("12px")` is `12`) and gives `NaN` if nothing parses.',
    link: glob('parseInt'),
  },
  parseFloat: { kind: 'function', summary: 'Parses the start of a string as a decimal number, or `NaN`.', link: glob('parseFloat') },
  isNaN: { kind: 'function', summary: 'Checks for `NaN` after converting to a number; prefer the stricter `Number.isNaN`.', link: glob('isNaN') },
  setTimeout: {
    kind: 'function',
    summary: 'Runs a function once after a delay in milliseconds and returns an id for `clearTimeout`. The delay is a minimum, not exact.',
    example: 'const id = setTimeout(() => save(), 500);\nclearTimeout(id);',
    link: `${API}/Window/setTimeout`,
  },
  setInterval: { kind: 'function', summary: 'Runs a function repeatedly every N milliseconds until `clearInterval(id)`.', link: `${API}/Window/setInterval` },
  fetch: {
    kind: 'function',
    summary: 'Makes an HTTP request and returns a `Promise` of the response. Read the body with `await res.json()` or `res.text()`.',
    details: 'Gotcha: HTTP errors like 404 do **not** reject; check `res.ok`.',
    example: 'const res = await fetch("/api/users");\nif (!res.ok) throw new Error(res.statusText);\nconst users = await res.json();',
    link: `${API}/Window/fetch`,
  },
  require: {
    kind: 'function',
    summary: 'Node.js **CommonJS** import: loads a module and returns its exports. The older alternative to `import`.',
    example: 'const fs = require("node:fs");',
    link: 'https://nodejs.org/api/modules.html#requireid',
  },
  structuredClone: { kind: 'function', summary: 'Makes a deep copy of a value (objects, arrays, Maps, Dates...).', link: `${API}/Window/structuredClone` },
  document: {
    kind: 'value',
    summary: 'In browsers: the current web page (the DOM). Find elements with `document.querySelector(...)` or `getElementById(...)`.',
    link: `${API}/Document`,
  },
  window: {
    kind: 'value',
    summary: 'In browsers: the global object (the browser tab). Global variables and functions like `setTimeout` live on it. Not available in Node.js.',
    link: `${API}/Window`,
  },
  globalThis: {
    kind: 'value',
    summary: 'The global object in **every** environment: `window` in browsers, `global` in Node.js.',
    link: glob('globalThis'),
  },
  Symbol: {
    kind: 'function',
    summary: 'Creates a unique **symbol**, a value usable as a property key that never clashes with other keys. Well-known symbols like `Symbol.iterator` hook into the language.',
    details: 'Called without `new`: `Symbol("id")`.',
    link: glob('Symbol'),
  },
  BigInt: {
    kind: 'function',
    summary: 'Creates an arbitrarily large integer (`BigInt(10)` or the literal `10n`). Normal numbers lose precision above 2^53.',
    details: 'BigInts and numbers can\'t be mixed in arithmetic: convert explicitly.',
    link: glob('BigInt'),
  },
  NaN: { kind: 'value', summary: '"Not a Number": the result of invalid math like `0 / 0`. It is not equal to anything, even itself; test with `Number.isNaN(x)`.', link: glob('NaN') },
  Infinity: { kind: 'value', summary: 'A number bigger than any other, e.g. the result of `1 / 0`.', link: glob('Infinity') },
  arguments: { kind: 'value', summary: 'Inside a non-arrow function: an array-like object with all passed arguments. Prefer rest parameters (`...args`).', link: fns('arguments') },
};

// --------------------------------------------------------------- structure

export const FUNCTIONS = new Set([
  'function_declaration',
  'function_expression',
  'arrow_function',
  'method_definition',
  'generator_function',
  'generator_function_declaration',
  'class_static_block',
]);
const LOOPS = new Set(['for_statement', 'for_in_statement', 'while_statement', 'do_statement']);
const BREAKABLE = new Set([...LOOPS, 'switch_statement']);
const PATTERNS = new Set(['object_pattern', 'array_pattern', 'rest_pattern']);

const code = (s: string) => `\`${s}\``;
const isUpper = (s: string) => /^\p{Lu}/u.test(s);

/** The `labeled_statement` around `from` named `name`, within the current function. */
function labelled(name: string, from: Node): Node | undefined {
  return ancestor(
    from,
    (n) => n.type === 'labeled_statement' && n.childForFieldName('label')?.text === name,
    (n) => FUNCTIONS.has(n.type),
  );
}

type Binding =
  | { kind: 'variable'; decl: Node; declarator: Node }
  | { kind: 'parameter'; fn: Node }
  | { kind: 'catch'; clause: Node }
  | { kind: 'loop'; loop: Node };

/** If `node` is a name being declared (directly or inside a destructuring pattern), what declares it. */
function binding(node: Node): Binding | undefined {
  let n = node;
  for (let p = n.parent; p; n = p, p = p.parent) {
    const f = fieldOf(n);
    switch (p.type) {
      case 'object_pattern':
      case 'array_pattern':
      case 'rest_pattern':
        continue;
      case 'assignment_pattern':
      case 'object_assignment_pattern':
        if (f === 'left') continue;
        return undefined;
      case 'pair_pattern':
        if (f === 'value') continue;
        return undefined;
      case 'required_parameter':
      case 'optional_parameter':
        if (f === 'pattern') continue;
        return undefined;
      case 'formal_parameters':
        return p.parent ? { kind: 'parameter', fn: p.parent } : undefined;
      case 'arrow_function':
        return f === 'parameter' ? { kind: 'parameter', fn: p } : undefined;
      case 'variable_declarator':
        return f === 'name' && p.parent ? { kind: 'variable', decl: p.parent, declarator: p } : undefined;
      case 'catch_clause':
        return f === 'parameter' ? { kind: 'catch', clause: p } : undefined;
      case 'for_in_statement':
        return f === 'left' && p.childForFieldName('kind') ? { kind: 'loop', loop: p } : undefined;
      default:
        return undefined;
    }
  }
  return undefined;
}

function variableRole(node: Node, b: Extract<Binding, { kind: 'variable' }>): Role {
  const name = code(node.text);
  const keyword = b.decl.type === 'variable_declaration' ? 'var' : (b.decl.childForFieldName('kind')?.text ?? 'let');
  // `for (let i = 0; ...)`: the variable lives for the whole loop.
  const scope = b.decl.parent?.type === 'for_statement' ? b.decl.parent : b.decl;
  const destructured = node.parent?.type !== 'variable_declarator';
  const value = b.declarator.childForFieldName('value');
  if (!destructured && value && /^(arrow_function|function_expression|generator_function)$/.test(value.type)) {
    return { title: 'Function', summary: `Declares ${name} as a function stored in a \`${keyword}\` variable.`, scope };
  }
  const from = destructured ? ' (unpacked by destructuring)' : '';
  switch (keyword) {
    case 'const':
      return { title: 'Constant', summary: `Declares ${name}${from} with \`const\`: it can't be reassigned (but an object it holds can still be changed).`, scope };
    case 'var':
      return { title: 'Variable (var)', summary: `Declares ${name}${from} with \`var\`: visible in the whole enclosing function and hoisted.`, scope };
    default:
      return { title: 'Variable', summary: `Declares ${name}${from} with \`let\`: block-scoped and reassignable.`, scope };
  }
}

function methodRole(node: Node, parent: Node): Role {
  const name = code(node.text);
  const has = (t: string) => parent.children.some((c) => c?.type === t);
  const inObject = parent.parent?.type === 'object';
  if (node.text === 'constructor' && !inObject) {
    return { title: 'Constructor', summary: 'Runs when an instance is created with `new`; sets up the new object.', scope: parent };
  }
  const kind = has('get') ? 'Getter' : has('set') ? 'Setter' : has('static') ? 'Static method' : 'Method';
  const priv = node.type === 'private_property_identifier' ? ' It is **private** (`#`): only usable inside the class.' : '';
  const where = inObject ? 'of this object' : 'of the class';
  return { title: kind, summary: `Declares the ${kind.toLowerCase()} ${name} ${where}.${priv}`, scope: parent };
}

function jsxTagRole(node: Node, parent: Node): Role {
  const element = parent.type === 'jsx_self_closing_element' ? parent : (parent.parent ?? parent);
  return isUpper(node.text)
    ? { title: 'JSX component', summary: `Renders the component ${code(node.text)} (a function or class you defined or imported).`, scope: element }
    : { title: 'JSX element', summary: `An HTML ${code(`<${node.text}>`)} element.`, scope: element };
}

function jsxAttributeRole(node: Node, parent: Node): Role {
  const name = node.text;
  let summary = `Passes the prop ${code(name)} to the element.`;
  if (name === 'className') summary = '`className` sets the CSS class: JSX uses the DOM property name because `class` is a JavaScript keyword.';
  else if (name === 'htmlFor') summary = '`htmlFor` is JSX for the HTML `for` attribute (`for` is a JavaScript keyword).';
  else if (name === 'key') summary = '`key` identifies an item in a list so React can track it between renders. Use a stable id, not the array index.';
  else if (name === 'style') summary = '`style` takes an object in JSX: `style={{ color: "red" }}`.';
  else if (/^on\p{Lu}/u.test(name)) summary = `${code(name)} is an event handler: pass a function (not a string), e.g. \`${name}={() => ...}\`.`;
  return { title: 'JSX attribute', summary, scope: parent };
}

export function role(node: Node, field: string | null): Role | undefined {
  const parent = node.parent;
  if (!parent) return undefined;
  const name = code(node.text);
  const decl = (title: string, summary: string, scope: Node | undefined = parent): Role => ({ title, summary, scope });
  switch (`${parent.type}.${field ?? ''}`) {
    case 'function_declaration.name':
      return decl('Function name', `Declares the function ${name}.`);
    case 'generator_function_declaration.name':
      return decl('Generator function', `Declares the generator function ${name}.`);
    case 'function_expression.name':
    case 'generator_function.name':
      return decl('Function expression name', `Names this function ${name}; the name is only visible inside the function itself.`);
    case 'class_declaration.name':
    case 'class.name':
      return decl('Class name', `Declares the class ${name}.`);
    case 'method_definition.name':
      return methodRole(node, parent);
    case 'field_definition.property': {
      const isStatic = parent.children.some((c) => c?.type === 'static');
      const priv = node.type === 'private_property_identifier';
      return decl(
        priv ? 'Private field' : isStatic ? 'Static field' : 'Class field',
        priv
          ? `Declares the private field ${name}: only code inside this class can read or write it.`
          : `Declares the ${isStatic ? 'static field (shared by the class)' : 'field (one per instance)'} ${name}.`,
      );
    }
    case 'pair.key':
      return decl('Property', `The property ${name} of this object literal.`);
    case 'import_specifier.name': {
      const alias = parent.childForFieldName('alias');
      const stmt = ancestor(node, (n) => n.type === 'import_statement');
      return decl('Imported name', alias ? `Imports the export ${name}, renamed to ${code(alias.text)} here.` : `Imports the named export ${name} from the module.`, stmt);
    }
    case 'import_specifier.alias':
      return decl('Import alias', `The imported value is called ${name} in this file.`, ancestor(node, (n) => n.type === 'import_statement'));
    case 'import_clause.':
      return decl('Default import', `${name} is this file's name for the module's **default export**.`, parent.parent ?? undefined);
    case 'namespace_import.':
      return decl('Namespace import', `${name} is an object holding all exports of the module.`, ancestor(node, (n) => n.type === 'import_statement'));
    case 'export_specifier.name': {
      const alias = parent.childForFieldName('alias');
      return decl('Exported name', alias ? `Exports ${name} under the name ${code(alias.text)}.` : `Exports ${name} from this module.`, ancestor(node, (n) => n.type === 'export_statement'));
    }
    case 'export_specifier.alias':
      return decl('Export alias', `Other modules import this as ${name}.`, ancestor(node, (n) => n.type === 'export_statement'));
    case 'namespace_export.':
      return decl('Namespace export', `Re-exports the whole module as ${name}.`, parent.parent ?? undefined);
    case 'labeled_statement.label':
      return decl('Label', `${name} names this statement, so \`break ${node.text}\` / \`continue ${node.text}\` can target it.`);
    case 'break_statement.label':
    case 'continue_statement.label':
      return decl('Label reference', `Refers to the statement labelled ${name}.`, labelled(node.text, node));
    case 'jsx_opening_element.name':
    case 'jsx_closing_element.name':
    case 'jsx_self_closing_element.name':
      return jsxTagRole(node, parent);
    case 'jsx_attribute.':
      return node.type === 'property_identifier' ? jsxAttributeRole(node, parent) : undefined;
  }
  if (node.type === 'private_property_identifier' && parent.type === 'member_expression') {
    return { title: 'Private member', summary: `${name} is a private (\`#\`) member: accessible only inside its class body.` };
  }
  const b = binding(node);
  switch (b?.kind) {
    case 'variable':
      return variableRole(node, b);
    case 'parameter':
      return { title: 'Parameter', summary: `${name} is a parameter: a local variable set by the caller's argument.`, scope: b.fn };
    case 'catch':
      return { title: 'Caught error', summary: `${name} holds the value that was thrown in the \`try\` block.`, scope: b.clause };
    case 'loop':
      return { title: 'Loop variable', summary: `${name} takes the next value on each pass of the loop.`, scope: b.loop };
  }
  return undefined;
}

export function jumpTarget(token: Node): JumpTarget | undefined {
  switch (token.type) {
    case 'return': {
      const fn = ancestor(token, (n) => FUNCTIONS.has(n.type));
      return fn && { node: fn, verb: 'returns from' };
    }
    case 'await':
    case 'yield': {
      const fn = ancestor(token, (n) => FUNCTIONS.has(n.type));
      return fn && { node: fn, verb: 'pauses' };
    }
    case 'break':
    case 'continue': {
      const label = token.parent?.childForFieldName('label');
      const verb = token.type === 'break' ? 'breaks out of' : 'continues';
      if (label) {
        const target = labelled(label.text, token);
        return target && { node: target, verb };
      }
      const kinds = token.type === 'break' ? BREAKABLE : LOOPS;
      const target = ancestor(token, (n) => kinds.has(n.type), (n) => FUNCTIONS.has(n.type));
      return target && { node: target, verb };
    }
    case 'throw': {
      // Only a throw inside the `try { }` body is caught by that try (not one in catch/finally).
      let n: Node = token;
      for (let p = n.parent; p; n = p, p = p.parent) {
        if (FUNCTIONS.has(p.type)) return { node: p, verb: 'throws out of' };
        if (p.type === 'try_statement' && fieldOf(n) === 'body' && p.childForFieldName('handler')) {
          return { node: p, verb: 'is caught by' };
        }
      }
      return undefined;
    }
  }
  return undefined;
}

/** Widen a scope to include `export` / `declare` in front of it. */
export function promote(scope: Node): Node {
  let s = scope;
  for (let p = s.parent; p; s = p, p = p.parent) {
    if (p.type === 'export_statement' && fieldOf(s) === 'declaration') continue;
    if (p.type === 'ambient_declaration') continue;
    if (p.type === 'expression_statement' && s.type === 'internal_module') continue;
    break;
  }
  return s;
}

const NAME_KINDS = new Set<DocKind>(['value', 'type', 'function']);
const BINDING_LIKE = ['identifier', 'type_identifier', 'shorthand_property_identifier_pattern'];

const FRAGMENT: DocEntry = {
  kind: 'syntax',
  title: '<> </> (JSX fragment)',
  summary: 'A **fragment**: groups several JSX children without adding an extra element to the page. A component must return one root, and a fragment lets that root be "nothing".',
  details: 'Short for `<React.Fragment>`. Use the long form when you need a `key`, e.g. in a list.',
  example: 'return (\n  <>\n    <h1>Title</h1>\n    <p>Text</p>\n  </>\n);',
  link: `${REACT}/reference/react/Fragment`,
};

/** Meanings the parent type alone can't tell apart. */
export function docFor(token: Node): DocEntry | undefined {
  const parent = token.parent;
  if (!parent) return undefined;
  switch (`${parent.type}/${token.type}`) {
    case 'for_in_statement/for': {
      const operator = parent.childForFieldName('operator')?.text;
      return operator ? docs[`for_in_statement/${operator}`] : undefined;
    }
    case 'jsx_opening_element/<':
    case 'jsx_closing_element/</':
      return parent.childForFieldName('name') ? undefined : FRAGMENT;
  }
  return undefined;
}

/** Field `name` that is a reference, not a declaration (built-in docs still apply). */
const NAME_REFERENCE_PARENTS = new Set(['generic_type', 'export_specifier', 'jsx_opening_element', 'jsx_closing_element', 'jsx_self_closing_element']);

export function isDeclarationName(node: Node, field: string | null): boolean {
  return field === 'name' && !NAME_REFERENCE_PARENTS.has(node.parent?.type ?? '');
}

/** Whether `n` introduces a new local name (not a JSX tag, export list entry, label use...). */
function declaresName(n: Node): boolean {
  const p = n.parent;
  if (!p) return false;
  if (p.type === 'import_specifier') return fieldOf(n) === 'alias' || !p.childForFieldName('alias');
  if (p.type === 'import_clause' || p.type === 'namespace_import' || p.type === 'import_require_clause') return true;
  return isDeclarationName(n, fieldOf(n)) || binding(n) !== undefined;
}

/** Whether the file declares its own name `node.text` somewhere (shadowing a global). */
export function declaredInFile(node: Node): boolean {
  let root: Node = node;
  while (root.parent) root = root.parent;
  for (const d of root.descendantsOfType(BINDING_LIKE)) {
    if (d && d.text === node.text && !d.equals(node) && declaresName(d)) return true;
  }
  return false;
}

/**
 * Built-in docs only apply to a plain reference to the global: not to
 * declaration names, JSX tags, property names (`x.map`), and not when the file
 * declares its own variable with that name.
 */
export function acceptGlobal(roleFn: (node: Node, field: string | null) => Role | undefined) {
  return (node: Node, field: string | null, entry: DocEntry): boolean => {
    if (!NAME_KINDS.has(entry.kind)) return false; // `get`, `from`, `module`... used as plain names
    if (node.type !== 'identifier' && !(node.type === 'type_identifier' && entry.kind === 'type')) return false;
    return !roleFn(node, field) && !declaredInFile(node);
  };
}

export const IDENTIFIER_TYPES = [
  'identifier',
  'property_identifier',
  'private_property_identifier',
  'shorthand_property_identifier',
  'shorthand_property_identifier_pattern',
  'statement_identifier',
];
export const WRAPPER_TYPES = [
  'else_clause',
  'class_heritage',
  'optional_chain',
  'jsx_opening_element',
  'jsx_closing_element',
];
export const NO_SCOPE_TOKENS = [',', ';', '.', '"', "'", '`', ':', '=', 'this', 'super'];

export const javascript: LanguageSpec = {
  comments: javascriptComments,
  id: 'javascript',
  languageIds: ['javascript', 'javascriptreact'],
  displayName: 'JavaScript',
  wasm: 'tree-sitter-javascript.wasm',
  fence: 'js',
  docs,
  identifierTypes: new Set(IDENTIFIER_TYPES),
  wrapperTypes: new Set(WRAPPER_TYPES),
  noScopeTokens: new Set(NO_SCOPE_TOKENS),
  role,
  jumpTarget,
  promote,
  docFor,
  isDeclarationName,
  acceptIdentifierDoc: acceptGlobal(role),
};
