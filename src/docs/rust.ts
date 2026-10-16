import type { Node } from 'web-tree-sitter';
import type { DocEntry, DocTable, LanguageSpec, Role } from '../core/model';
import { ancestor } from '../core/nodes';
import { rustComments } from './comments';

const KW = 'https://doc.rust-lang.org/std/keyword.';
const BOOK = 'https://doc.rust-lang.org/book';
const REF = 'https://doc.rust-lang.org/reference';
const STD = 'https://doc.rust-lang.org/std';
const OPS = `${BOOK}/appendix-02-operators.html`;

const kw = (name: string) => `${KW}${name}.html`;

const docs: DocTable = {
  // ---------------------------------------------------------------- keywords
  fn: {
    kind: 'keyword',
    summary: 'Declares a function. Parameter types are required; `-> T` gives the return type (omitted means `()`).',
    details: 'The last expression in the body, **without a semicolon**, is the return value.',
    example: 'fn add(a: i32, b: i32) -> i32 {\n    a + b\n}',
    link: kw('fn'),
  },
  'function_signature_item/fn': {
    kind: 'keyword',
    title: 'fn (trait method signature)',
    summary: 'A method signature without a body inside a `trait`: every type implementing the trait must provide it.',
    example: 'trait Shape {\n    fn area(&self) -> f64;\n}',
    link: `${BOOK}/ch10-02-traits.html`,
  },
  let: {
    kind: 'keyword',
    summary: 'Binds a value to a name (a variable). Variables are **immutable by default**: add `mut` to allow changes.',
    details: 'A new `let` with the same name *shadows* the old variable, even with a different type. The left side is a pattern, so you can destructure: `let (a, b) = pair;`.',
    example: 'let x = 5;\nlet mut count = 0;\nlet (w, h) = (640, 480);',
    link: kw('let'),
  },
  'let_condition/let': {
    kind: 'keyword',
    title: 'if let / while let',
    summary: 'Tries to match a pattern; the block runs only if it matches, with the pattern\'s variables bound inside. A shortcut for a one-arm `match`.',
    example: 'if let Some(user) = find(id) {\n    println!("{}", user.name);\n}\nwhile let Some(x) = stack.pop() { }',
    link: `${BOOK}/ch06-03-if-let.html`,
  },
  mut: {
    kind: 'keyword',
    summary: 'Makes a binding **mutable**: its value may be changed after creation. Without `mut`, assigning again is a compile error.',
    example: 'let mut v = Vec::new();\nv.push(1);',
    link: kw('mut'),
  },
  'reference_expression/mut': {
    kind: 'keyword',
    title: '&mut (mutable borrow)',
    summary: 'Creates a **mutable reference**: temporary, exclusive access that allows changing the value. While it exists, no other reference to the value may be used.',
    example: 'fn bump(n: &mut i32) { *n += 1 }\nbump(&mut count);',
    link: `${BOOK}/ch04-02-references-and-borrowing.html#mutable-references`,
  },
  'reference_type/mut': {
    kind: 'keyword',
    title: '&mut T (mutable reference type)',
    summary: 'A **mutable reference** to a `T`: lets the holder modify the value it points to, with exclusive access.',
    link: `${BOOK}/ch04-02-references-and-borrowing.html#mutable-references`,
  },
  'self_parameter/mut': {
    kind: 'keyword',
    title: '&mut self',
    summary: 'The method borrows the value **mutably**: it may modify the fields of `self`.',
    example: 'fn push(&mut self, x: T) { self.items.push(x) }',
    link: `${BOOK}/ch05-03-method-syntax.html`,
  },
  const: {
    kind: 'keyword',
    summary: 'A compile-time **constant**. The type annotation is required, and the value is inlined wherever it is used. Naming convention: `SCREAMING_CASE`.',
    example: 'const MAX_USERS: usize = 100;',
    link: kw('const'),
  },
  'function_modifiers/const': {
    kind: 'keyword',
    title: 'const fn',
    summary: 'A function that may be evaluated at compile time (e.g. to initialize a `const` or `static`).',
    link: kw('const'),
  },
  'pointer_type/const': {
    kind: 'keyword',
    title: '*const T (raw pointer)',
    summary: 'A raw, immutable pointer. No borrow checking; dereferencing requires `unsafe`.',
    link: `${STD}/primitive.pointer.html`,
  },
  static: {
    kind: 'keyword',
    summary: 'A global variable with a single fixed address that lives for the whole program. `static mut` is possible but requires `unsafe` to access.',
    example: 'static GREETING: &str = "hello";',
    link: kw('static'),
  },
  struct: {
    kind: 'keyword',
    summary: 'Declares a **struct**: a custom type grouping named fields (or a tuple struct with unnamed fields). Behaviour is added separately with `impl`.',
    example: 'struct Point {\n    x: f64,\n    y: f64,\n}\nstruct Meters(f64);',
    link: kw('struct'),
  },
  enum: {
    kind: 'keyword',
    summary: 'Declares an **enum**: a type that is exactly one of several *variants*. Variants can carry data, so enums model "this OR that" (see `Option`, `Result`).',
    details: 'You inspect an enum with `match` or `if let`; the compiler makes sure every variant is handled.',
    example: 'enum Shape {\n    Circle { r: f64 },\n    Rect(f64, f64),\n    Empty,\n}',
    link: kw('enum'),
  },
  union: {
    kind: 'keyword',
    summary: 'Like a struct, but all fields share the same memory. Reading a field is `unsafe`. Mainly for C interop.',
    link: kw('union'),
  },
  trait: {
    kind: 'keyword',
    summary: 'Declares a **trait**: a set of methods a type can implement (like an interface). Traits are used for shared behaviour and as generic bounds.',
    details: 'Methods with a body are *default methods*; implementors may override them.',
    example: 'trait Summary {\n    fn summarize(&self) -> String;\n    fn preview(&self) -> String { self.summarize()[..10].into() }\n}',
    link: kw('trait'),
  },
  impl: {
    kind: 'keyword',
    summary: 'An **implementation block**: adds methods to a type (`impl Type { }`) or implements a trait for a type (`impl Trait for Type { }`).',
    example: 'impl Point {\n    fn new(x: f64, y: f64) -> Self { Self { x, y } }\n}\nimpl fmt::Display for Point { ... }',
    link: kw('impl'),
  },
  'abstract_type/impl': {
    kind: 'keyword',
    title: 'impl Trait',
    summary: 'In argument or return position: "some type that implements `Trait`" without naming it. In arguments it\'s shorthand for a generic; in returns the function picks one concrete hidden type.',
    example: 'fn evens() -> impl Iterator<Item = u32> {\n    (0..).step_by(2)\n}',
    link: `${BOOK}/ch10-02-traits.html#traits-as-parameters`,
  },
  'impl_item/for': {
    kind: 'keyword',
    title: 'impl Trait for Type',
    summary: 'Here `for` names the type that receives the trait implementation: "implement this trait **for** that type".',
    example: 'impl Display for Point { }',
    link: kw('impl'),
  },
  'higher_ranked_trait_bound/for': {
    kind: 'keyword',
    title: "for<'a> (higher-ranked bound)",
    summary: 'A bound that must hold for **every** lifetime `\'a`. Mostly seen with closures taking references. Advanced; you rarely write it yourself.',
    link: `${REF}/trait-bounds.html#higher-ranked-trait-bounds`,
  },
  dyn: {
    kind: 'keyword',
    summary: '`dyn Trait` is a **trait object**: a value of some type implementing `Trait`, chosen at runtime. Calls go through a vtable (dynamic dispatch). Used behind a pointer: `Box<dyn Trait>`, `&dyn Trait`.',
    example: 'let shapes: Vec<Box<dyn Shape>> = vec![Box::new(Circle(1.0))];',
    link: kw('dyn'),
  },
  type: {
    kind: 'keyword',
    summary: 'Declares a **type alias**: a new name for an existing type (not a new type).',
    example: 'type Result<T> = std::result::Result<T, MyError>;',
    link: kw('type'),
  },
  'associated_type/type': {
    kind: 'keyword',
    title: 'type (associated type)',
    summary: 'A placeholder type inside a trait that each implementation chooses, like `Iterator::Item`.',
    example: 'trait Iterator {\n    type Item;\n    fn next(&mut self) -> Option<Self::Item>;\n}',
    link: `${BOOK}/ch20-02-advanced-traits.html`,
  },
  where: {
    kind: 'keyword',
    summary: 'Lists constraints (trait bounds) on generic types, after the signature. Same meaning as inline bounds, easier to read when there are many.',
    example: 'fn print_all<T>(items: &[T])\nwhere\n    T: Display + Clone,\n{ }',
    link: kw('where'),
  },
  pub: {
    kind: 'keyword',
    summary: 'Makes an item **public**: visible outside its module. Everything is private by default.',
    details: '`pub(crate)` = visible in this crate only; `pub(super)` = visible to the parent module.',
    example: 'pub struct Config {\n    pub name: String, // fields need their own pub\n}',
    link: kw('pub'),
  },
  mod: {
    kind: 'keyword',
    summary: 'Declares a **module**: a namespace for items. `mod foo;` (with a semicolon) loads it from `foo.rs` or `foo/mod.rs`.',
    example: 'mod utils {\n    pub fn helper() {}\n}\nmod network; // network.rs',
    link: kw('mod'),
  },
  use: {
    kind: 'keyword',
    summary: 'Brings a path into scope so you can refer to it by a shorter name.',
    example: 'use std::collections::HashMap;\nuse std::io::{self, Read};',
    link: kw('use'),
  },
  as: {
    kind: 'keyword',
    summary: 'Converts between primitive types (a **cast**). Numeric casts can truncate or wrap silently; prefer `From`/`TryFrom` when possible.',
    example: 'let n = 3.9_f64 as i32; // 3\nlet b = 300_i32 as u8;  // 44 (wraps)',
    link: kw('as'),
  },
  'use_as_clause/as': {
    kind: 'keyword',
    title: 'as (rename import)',
    summary: 'Renames an imported item locally.',
    example: 'use std::io::Result as IoResult;',
    link: kw('as'),
  },
  crate: {
    kind: 'keyword',
    summary: 'In a path, `crate` is the **root of the current crate** (like an absolute path). In `pub(crate)`, it limits visibility to this crate.',
    example: 'use crate::config::Settings;',
    link: kw('crate'),
  },
  super: {
    kind: 'keyword',
    summary: 'The **parent module** in a path (like `..` in a file system).',
    example: 'use super::helper;',
    link: kw('super'),
  },
  self: {
    kind: 'keyword',
    summary: 'In a path, `self` is the **current module**. In a `use` list, `self` imports the module itself.',
    example: 'use std::io::{self, Write}; // io and io::Write',
    link: kw('self'),
  },
  'self_parameter/self': {
    kind: 'keyword',
    title: 'self (method receiver)',
    summary: 'The value the method is called on. `self` takes ownership, `&self` borrows it read-only, `&mut self` borrows it mutably.',
    example: 'impl Counter {\n    fn get(&self) -> u32 { self.n }\n    fn inc(&mut self) { self.n += 1 }\n    fn into_inner(self) -> u32 { self.n }\n}',
    link: kw('self'),
  },
  extern: {
    kind: 'keyword',
    summary: 'Links to foreign code: `extern "C"` declares or defines functions with the C calling convention. `extern crate` is an older way to import a crate.',
    link: kw('extern'),
  },
  unsafe: {
    kind: 'keyword',
    summary: 'Unlocks operations the compiler can\'t verify (dereferencing raw pointers, calling `unsafe fn`, FFI). **You** promise the code upholds Rust\'s safety rules.',
    example: 'let p = &x as *const i32;\nlet v = unsafe { *p };',
    link: kw('unsafe'),
  },
  async: {
    kind: 'keyword',
    summary: 'Makes a function or block **asynchronous**: calling it returns a `Future` that does nothing until it is `.await`ed (or run by an executor like tokio).',
    example: 'async fn fetch(url: &str) -> Result<String, Error> {\n    let body = client.get(url).send().await?.text().await?;\n    Ok(body)\n}',
    link: kw('async'),
  },
  await: {
    kind: 'keyword',
    title: '.await',
    summary: 'Waits for a `Future` to complete and gives its result. While waiting, the async runtime can run other tasks. Only allowed inside `async` code.',
    example: 'let data = load().await;',
    link: kw('await'),
  },
  move: {
    kind: 'keyword',
    summary: 'Makes a closure (or async block) take **ownership** of the variables it uses, instead of borrowing them. Needed when the closure outlives the current scope, e.g. for threads.',
    example: 'let name = String::from("ann");\nthread::spawn(move || println!("{name}"));',
    link: kw('move'),
  },
  ref: {
    kind: 'keyword',
    summary: 'In a pattern, binds by **reference** instead of moving the value out. `ref mut` binds a mutable reference.',
    example: 'if let Some(ref name) = maybe_name { } // maybe_name stays usable',
    link: kw('ref'),
  },
  if: {
    kind: 'keyword',
    summary: 'Runs a block when the condition is `true`. The condition must be a `bool` (no truthy numbers). `if` is an expression, so it can produce a value.',
    example: 'let kind = if n % 2 == 0 { "even" } else { "odd" };',
    link: kw('if'),
  },
  'match_pattern/if': {
    kind: 'keyword',
    title: 'if (match guard)',
    summary: 'A **match guard**: extra condition on a match arm. The arm only runs if the pattern matches *and* the condition is true.',
    example: 'match n {\n    x if x < 0 => "negative",\n    _ => "non-negative",\n}',
    link: `${BOOK}/ch19-03-pattern-syntax.html#extra-conditionals-with-match-guards`,
  },
  else: {
    kind: 'keyword',
    summary: 'The branch of an `if` that runs when the condition is `false`. Chains as `else if`.',
    link: kw('else'),
  },
  'let_declaration/else': {
    kind: 'keyword',
    title: 'let ... else',
    summary: 'If the pattern doesn\'t match, the `else` block runs; it must diverge (`return`, `break`, `panic!`...). Great for early exits.',
    example: 'let Some(user) = find(id) else {\n    return Err(NotFound);\n};',
    link: 'https://doc.rust-lang.org/rust-by-example/flow_control/let_else.html',
  },
  match: {
    kind: 'keyword',
    summary: 'Compares a value against **patterns** and runs the first arm that matches. Must be exhaustive: every possible value has to be covered (`_` matches anything).',
    details: '`match` is an expression: all arms produce a value of the same type.',
    example: 'match result {\n    Ok(v) => println!("got {v}"),\n    Err(e) => eprintln!("error: {e}"),\n}',
    link: kw('match'),
  },
  loop: {
    kind: 'keyword',
    summary: 'An **infinite loop**, exited with `break`. `break value` makes the loop produce that value.',
    example: 'let answer = loop {\n    if let Some(x) = try_get() { break x; }\n};',
    link: kw('loop'),
  },
  while: {
    kind: 'keyword',
    summary: 'Repeats its block as long as the condition is `true`.',
    example: 'while n > 0 {\n    n -= 1;\n}',
    link: kw('while'),
  },
  for: {
    kind: 'keyword',
    summary: 'Loops over anything that implements `IntoIterator` (ranges, vectors, maps, iterators).',
    details: '`for x in v` consumes `v`; `for x in &v` borrows each element; `for x in &mut v` lets you modify them.',
    example: 'for i in 0..10 { }\nfor (i, item) in items.iter().enumerate() { }',
    link: kw('for'),
  },
  in: {
    kind: 'keyword',
    summary: 'Separates the loop variable(s) from the thing being iterated in a `for` loop.',
    example: 'for name in &names { }',
    link: kw('in'),
  },
  break: {
    kind: 'keyword',
    summary: 'Exits the innermost loop immediately. `break \'label` exits a labelled outer loop; in a `loop`, `break value` returns a value.',
    example: "'outer: for row in grid {\n    for cell in row {\n        if cell == 0 { break 'outer; }\n    }\n}",
    link: kw('break'),
  },
  continue: {
    kind: 'keyword',
    summary: 'Skips to the next iteration of the innermost (or labelled) loop.',
    link: kw('continue'),
  },
  return: {
    kind: 'keyword',
    summary: 'Returns from the function early with a value. At the end of a function you usually don\'t need it: the final expression (without `;`) is returned.',
    example: 'if x < 0 {\n    return None;\n}\nSome(x.sqrt())',
    link: kw('return'),
  },
  'macro_rules!': {
    kind: 'keyword',
    title: 'macro_rules!',
    summary: 'Defines a **declarative macro**: code that writes code by matching on token patterns. Invoked with `name!(...)`.',
    example: 'macro_rules! square {\n    ($x:expr) => { $x * $x };\n}',
    link: `${BOOK}/ch20-05-macros.html`,
  },

  // --------------------------------------------------------------- operators
  'reference_expression/&': {
    kind: 'operator',
    title: '& (borrow)',
    summary: '`&x` **borrows** `x`: creates a reference that lets you read it without taking ownership. You can have many shared borrows at once, but they can\'t outlive `x`.',
    example: 'fn len(s: &String) -> usize { s.len() }\nlet n = len(&name); // name is still usable',
    link: `${BOOK}/ch04-02-references-and-borrowing.html`,
  },
  'reference_type/&': {
    kind: 'operator',
    title: '&T (reference type)',
    summary: 'A **shared reference** to a `T`: read-only access to a value owned by someone else. May carry a lifetime: `&\'a T`.',
    example: 'fn first(xs: &[i32]) -> &i32 { &xs[0] }',
    link: `${BOOK}/ch04-02-references-and-borrowing.html`,
  },
  'self_parameter/&': {
    kind: 'operator',
    title: '&self',
    summary: 'The method **borrows** the value it\'s called on, read-only. The caller keeps ownership.',
    link: `${BOOK}/ch05-03-method-syntax.html`,
  },
  'reference_pattern/&': {
    kind: 'operator',
    title: '& (in a pattern)',
    summary: 'Matches a reference and binds the value behind it.',
    example: 'for &x in &[1, 2, 3] { } // x: i32, not &i32',
    link: `${REF}/patterns.html#reference-patterns`,
  },
  'unary_expression/*': {
    kind: 'operator',
    title: '* (dereference)',
    summary: '`*r` accesses the value a reference or smart pointer points to. Often automatic for method calls and field access.',
    example: 'let mut n = 5;\nlet r = &mut n;\n*r += 1;',
    link: `${BOOK}/ch15-02-deref.html`,
  },
  'pointer_type/*': {
    kind: 'operator',
    title: '*const T / *mut T (raw pointer)',
    summary: 'A **raw pointer**: like a C pointer, no borrow checking. Creating one is safe; dereferencing it requires `unsafe`.',
    link: `${STD}/primitive.pointer.html`,
  },
  'unary_expression/!': {
    kind: 'operator',
    title: '! (not)',
    summary: 'Logical NOT on `bool`, bitwise NOT on integers.',
    link: OPS,
  },
  'never_type/!': {
    kind: 'type',
    title: '! (never type)',
    summary: 'The **never type**: the function never returns normally (it loops forever, exits, or panics).',
    example: 'fn fail(msg: &str) -> ! { panic!("{msg}") }',
    link: `${STD}/primitive.never.html`,
  },
  'macro_invocation/!': {
    kind: 'syntax',
    title: 'name!(...) (macro call)',
    summary: 'The `!` marks a **macro** call, not a function call. Macros expand into code at compile time, so they can take a variable number of arguments or check format strings.',
    link: `${BOOK}/ch20-05-macros.html`,
  },
  'try_expression/?': {
    kind: 'operator',
    title: '? (error propagation)',
    summary: 'Unwraps an `Ok`/`Some` value, or **returns early** with the `Err`/`None` from the current function. The error is converted with `From` if needed.',
    details: 'Only works in functions that themselves return `Result` (or `Option`).',
    example: 'fn read_config() -> Result<String, io::Error> {\n    let text = fs::read_to_string("config.toml")?;\n    Ok(text)\n}',
    link: `${BOOK}/ch09-02-recoverable-errors-with-result.html#a-shortcut-for-propagating-errors-the--operator`,
  },
  '::': {
    kind: 'operator',
    title: ':: (path separator)',
    summary: 'Separates the parts of a path: crate, module, type, associated item, or enum variant.',
    example: 'std::collections::HashMap::new()\nOption::Some(1)',
    link: `${REF}/paths.html`,
  },
  'generic_function/::': {
    kind: 'operator',
    title: '::<> (turbofish)',
    summary: 'Supplies generic type arguments explicitly when the compiler can\'t infer them.',
    example: 'let n = "42".parse::<i32>()?;\nlet v = iter.collect::<Vec<_>>();',
    link: `${BOOK}/appendix-02-operators.html`,
  },
  '->': {
    kind: 'operator',
    title: '-> (return type)',
    summary: 'Introduces the return type of a function or closure.',
    example: 'fn area(r: f64) -> f64 { }',
    link: kw('fn'),
  },
  '=>': {
    kind: 'operator',
    title: '=> (match arm)',
    summary: 'Separates a pattern from the code that runs when it matches.',
    example: 'Some(x) => x * 2,',
    link: kw('match'),
  },
  'range_expression/..': {
    kind: 'operator',
    title: '.. (range)',
    summary: 'An **exclusive range**: `a..b` covers `a` up to but **not** including `b`. Either end may be omitted (`..b`, `a..`, `..`).',
    example: 'for i in 0..3 { } // 0, 1, 2\nlet tail = &v[1..];',
    link: `${STD}/ops/struct.Range.html`,
  },
  'range_expression/..=': {
    kind: 'operator',
    title: '..= (inclusive range)',
    summary: 'An **inclusive range**: `a..=b` covers `a` up to **and including** `b`.',
    example: 'for i in 1..=3 { } // 1, 2, 3',
    link: `${STD}/ops/struct.RangeInclusive.html`,
  },
  'range_pattern/..=': {
    kind: 'operator',
    title: '..= (range pattern)',
    summary: 'In a pattern, matches any value in the inclusive range.',
    example: "match c {\n    'a'..='z' => \"lowercase\",\n    _ => \"other\",\n}",
    link: `${REF}/patterns.html#range-patterns`,
  },
  'remaining_field_pattern/..': {
    kind: 'operator',
    title: '.. (rest of fields)',
    summary: 'In a struct/tuple pattern: "ignore all remaining fields".',
    example: 'let Point { x, .. } = p;',
    link: `${BOOK}/ch19-03-pattern-syntax.html#ignoring-remaining-parts-of-a-value-with-`,
  },
  'base_field_initializer/..': {
    kind: 'operator',
    title: '..base (struct update)',
    summary: 'Fills in all fields not listed explicitly by copying/moving them from another value of the same struct.',
    example: 'let b = Config { verbose: true, ..Config::default() };',
    link: `${BOOK}/ch05-01-defining-structs.html#creating-instances-from-other-instances-with-struct-update-syntax`,
  },
  'closure_parameters/|': {
    kind: 'operator',
    title: '|args| (closure)',
    summary: 'The bars hold a **closure**\'s parameters. A closure is an anonymous function that can capture variables from its surroundings.',
    example: 'let add = |a, b| a + b;\nlet evens: Vec<_> = v.iter().filter(|x| *x % 2 == 0).collect();',
    link: `${BOOK}/ch13-01-closures.html`,
  },
  'closure_expression/||': {
    kind: 'operator',
    title: '|| (closure without parameters)',
    summary: 'A **closure** that takes no arguments.',
    example: 'let greet = || println!("hi");',
    link: `${BOOK}/ch13-01-closures.html`,
  },
  'closure_parameters/||': {
    kind: 'operator',
    title: '|| (closure without parameters)',
    summary: 'A **closure** that takes no arguments.',
    example: 'let greet = || println!("hi");',
    link: `${BOOK}/ch13-01-closures.html`,
  },
  'or_pattern/|': {
    kind: 'operator',
    title: '| (or pattern)',
    summary: 'Matches if **either** pattern matches.',
    example: "match c { 'a' | 'e' | 'i' => true, _ => false }",
    link: `${REF}/patterns.html#or-patterns`,
  },
  'match_pattern/_': {
    kind: 'syntax',
    title: '_ (wildcard)',
    summary: 'Matches anything and binds nothing: the "everything else" arm of a match.',
    example: '_ => println!("other"),',
    link: `${BOOK}/ch19-03-pattern-syntax.html#ignoring-values-in-a-pattern`,
  },
  _: {
    kind: 'syntax',
    title: '_ (placeholder)',
    summary: 'In a pattern, ignores a value. In a type, asks the compiler to infer it (`Vec<_>`).',
    link: `${BOOK}/ch19-03-pattern-syntax.html#ignoring-values-in-a-pattern`,
  },
  'captured_pattern/@': {
    kind: 'operator',
    title: '@ (binding)',
    summary: 'Binds the matched value to a name **while** also testing it against a pattern.',
    example: 'match age {\n    n @ 13..=19 => println!("teen: {n}"),\n    _ => {}\n}',
    link: `${BOOK}/ch19-03-pattern-syntax.html#-bindings`,
  },
  "lifetime/'": {
    kind: 'syntax',
    title: "'a (lifetime)",
    summary: 'A **lifetime** names how long a reference is valid. It lets the compiler check that references never outlive the data they point to.',
    details: 'Lifetimes only describe relationships, they don\'t change how long anything lives. Most are inferred ("elided").',
    example: "fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {\n    if a.len() > b.len() { a } else { b }\n}",
    link: `${BOOK}/ch10-03-lifetime-syntax.html`,
  },
  "label/'": {
    kind: 'syntax',
    title: "'label (loop label)",
    summary: 'Names a loop (or block) so `break` / `continue` can target it, e.g. to exit nested loops.',
    link: `${REF}/expressions/loop-expr.html#loop-labels`,
  },
  'attribute_item/#': {
    kind: 'syntax',
    title: '#[...] (attribute)',
    summary: 'An **attribute**: metadata for the item below it, e.g. `#[derive(Debug)]` (generate trait impls), `#[test]`, `#[cfg(...)]` (conditional compilation).',
    example: '#[derive(Debug, Clone, PartialEq)]\nstruct Point { x: i32, y: i32 }',
    link: `${REF}/attributes.html`,
  },
  'inner_attribute_item/#': {
    kind: 'syntax',
    title: '#![...] (inner attribute)',
    summary: 'An attribute applying to the **enclosing** item (often the whole crate or module), e.g. `#![allow(dead_code)]`.',
    link: `${REF}/attributes.html`,
  },
  'type_parameters/<': {
    kind: 'syntax',
    title: '<T> (generic parameters)',
    summary: 'Declares **generic** type parameters (and lifetimes) for a function, struct, enum, trait or impl. Bounds like `T: Display` restrict which types are allowed.',
    example: 'fn largest<T: PartialOrd>(xs: &[T]) -> &T { }',
    link: `${BOOK}/ch10-01-syntax.html`,
  },
  'block/{': {
    kind: 'syntax',
    title: '{ } (block)',
    summary: 'A block is an **expression**: its value is the last expression without a `;`. Variables created inside are dropped at the closing `}`.',
    link: `${REF}/expressions/block-expr.html`,
  },
  'block/}': {
    kind: 'syntax',
    title: '{ } (block)',
    summary: 'End of the block: values owned by variables declared inside are **dropped** (freed) here, in reverse order.',
    link: `${BOOK}/ch04-01-what-is-ownership.html#variable-scope`,
  },

  // ---------------------------------------------------------------- literals
  true: { kind: 'value', summary: 'The `bool` value true.', link: kw('true') },
  false: { kind: 'value', summary: 'The `bool` value false.', link: kw('false') },
  '#raw_string_literal': {
    kind: 'literal',
    title: 'r"..." (raw string)',
    summary: 'A **raw string**: backslashes are not escapes. Add `#`s (`r#"..."#`) to include double quotes inside.',
    example: 'let re = r"\\d+";\nlet json = r#"{"a": 1}"#;',
    link: `${REF}/tokens.html#raw-string-literals`,
  },
  '#char_literal': {
    kind: 'literal',
    title: "'c' (char)",
    summary: 'A `char`: one Unicode scalar value, always 4 bytes. Not the same as a one-character `&str`.',
    link: `${STD}/primitive.char.html`,
  },
  'string_literal/b"': {
    kind: 'literal',
    title: 'b"..." (byte string)',
    summary: 'A **byte string**: ASCII text as `&[u8; N]` instead of a `&str`.',
    example: 'let magic = b"PNG";',
    link: `${REF}/tokens.html#byte-string-literals`,
  },
  "'static": {
    kind: 'value',
    title: "'static",
    summary: 'The lifetime of the entire program. String literals are `&\'static str`. As a bound (`T: \'static`) it means "contains no short-lived references".',
    link: `${BOOK}/ch10-03-lifetime-syntax.html#the-static-lifetime`,
  },

  // ----------------------------------------------------- types and prelude
  Self: {
    kind: 'type',
    summary: 'Inside an `impl` or `trait`, `Self` is the type being implemented. Saves repeating the type name.',
    example: 'impl Point {\n    fn origin() -> Self { Self { x: 0, y: 0 } }\n}',
    link: kw('SelfTy'),
  },
  Option: {
    kind: 'type',
    summary: '`Option<T>` is either `Some(value)` or `None`. Rust has no `null`: a value that might be missing is an `Option`, and the compiler makes you handle `None`.',
    example: 'match map.get("key") {\n    Some(v) => println!("{v}"),\n    None => println!("missing"),\n}',
    link: `${STD}/option/enum.Option.html`,
  },
  Some: { kind: 'value', summary: 'The `Option` variant that holds a value.', example: 'let x: Option<i32> = Some(5);', link: `${STD}/option/enum.Option.html` },
  None: { kind: 'value', summary: 'The `Option` variant meaning "no value".', link: `${STD}/option/enum.Option.html` },
  Result: {
    kind: 'type',
    summary: '`Result<T, E>` is either `Ok(value)` or `Err(error)`. Rust\'s way to return errors: no exceptions. Use `?` to pass errors up, or `match` to handle them.',
    example: 'fn parse(s: &str) -> Result<i32, ParseIntError> {\n    s.trim().parse()\n}',
    link: `${STD}/result/enum.Result.html`,
  },
  Ok: { kind: 'value', summary: 'The `Result` variant for success, holding the value.', link: `${STD}/result/enum.Result.html` },
  Err: { kind: 'value', summary: 'The `Result` variant for failure, holding the error.', link: `${STD}/result/enum.Result.html` },
  String: {
    kind: 'type',
    summary: 'An owned, growable, heap-allocated UTF-8 string. Borrow it as `&str` to pass it around without copying.',
    example: 'let mut s = String::from("hello");\ns.push_str(" world");',
    link: `${STD}/string/struct.String.html`,
  },
  str: {
    kind: 'type',
    summary: 'A string slice: a view of UTF-8 text owned elsewhere. Almost always used as `&str`. String literals are `&\'static str`.',
    link: `${STD}/primitive.str.html`,
  },
  Vec: {
    kind: 'type',
    summary: '`Vec<T>`: a growable, heap-allocated list. Borrow it as `&[T]` (a slice) to pass it around.',
    example: 'let mut v = vec![1, 2, 3];\nv.push(4);',
    link: `${STD}/vec/struct.Vec.html`,
  },
  Box: {
    kind: 'type',
    summary: '`Box<T>` puts a value on the heap with a single owner. Used for recursive types, large values, and trait objects (`Box<dyn Trait>`).',
    link: `${STD}/boxed/struct.Box.html`,
  },
  Rc: { kind: 'type', summary: '`Rc<T>`: reference-counted shared ownership (single thread). `Rc::clone` adds an owner; the value is freed when the last one is dropped.', link: `${STD}/rc/struct.Rc.html` },
  Arc: { kind: 'type', summary: '`Arc<T>`: like `Rc`, but thread-safe (atomic reference count). Often combined with `Mutex`: `Arc<Mutex<T>>`.', link: `${STD}/sync/struct.Arc.html` },
  RefCell: { kind: 'type', summary: '`RefCell<T>`: interior mutability, borrow rules checked at **runtime** instead of compile time (panics on violation).', link: `${STD}/cell/struct.RefCell.html` },
  Mutex: { kind: 'type', summary: '`Mutex<T>`: protects data shared between threads. `lock()` gives exclusive access until the guard is dropped.', link: `${STD}/sync/struct.Mutex.html` },
  HashMap: { kind: 'type', summary: '`HashMap<K, V>`: a hash table from keys to values. Import with `use std::collections::HashMap;`.', link: `${STD}/collections/struct.HashMap.html` },
  bool: { kind: 'type', summary: 'Boolean: `true` or `false`.', link: `${STD}/primitive.bool.html` },
  char: { kind: 'type', summary: 'One Unicode scalar value (4 bytes).', link: `${STD}/primitive.char.html` },
  i8: { kind: 'type', summary: '8-bit signed integer.', link: `${STD}/primitive.i8.html` },
  i16: { kind: 'type', summary: '16-bit signed integer.', link: `${STD}/primitive.i16.html` },
  i32: { kind: 'type', summary: '32-bit signed integer. The default integer type.', link: `${STD}/primitive.i32.html` },
  i64: { kind: 'type', summary: '64-bit signed integer.', link: `${STD}/primitive.i64.html` },
  i128: { kind: 'type', summary: '128-bit signed integer.', link: `${STD}/primitive.i128.html` },
  isize: { kind: 'type', summary: 'Pointer-sized signed integer.', link: `${STD}/primitive.isize.html` },
  u8: { kind: 'type', summary: '8-bit unsigned integer (0..=255), also used for bytes.', link: `${STD}/primitive.u8.html` },
  u16: { kind: 'type', summary: '16-bit unsigned integer.', link: `${STD}/primitive.u16.html` },
  u32: { kind: 'type', summary: '32-bit unsigned integer.', link: `${STD}/primitive.u32.html` },
  u64: { kind: 'type', summary: '64-bit unsigned integer.', link: `${STD}/primitive.u64.html` },
  u128: { kind: 'type', summary: '128-bit unsigned integer.', link: `${STD}/primitive.u128.html` },
  usize: { kind: 'type', summary: 'Pointer-sized unsigned integer. Used for indexing and lengths (`v.len()` is a `usize`).', link: `${STD}/primitive.usize.html` },
  f32: { kind: 'type', summary: '32-bit floating point number.', link: `${STD}/primitive.f32.html` },
  f64: { kind: 'type', summary: '64-bit floating point number. The default float type.', link: `${STD}/primitive.f64.html` },

  // ------------------------------------------------------------------ traits
  Clone: { kind: 'trait', summary: 'Types that can make an explicit (possibly expensive) copy with `.clone()`.', link: `${STD}/clone/trait.Clone.html` },
  Copy: { kind: 'trait', summary: 'Types that are copied implicitly on assignment instead of moved (integers, `bool`, `char`, `&T`...). Requires `Clone`.', link: `${STD}/marker/trait.Copy.html` },
  Debug: { kind: 'trait', summary: 'Formatting for programmers, used by `{:?}` and `dbg!`. Usually derived: `#[derive(Debug)]`.', link: `${STD}/fmt/trait.Debug.html` },
  Display: { kind: 'trait', summary: 'User-facing formatting, used by `{}`. Implement it manually; gives you `.to_string()` for free.', link: `${STD}/fmt/trait.Display.html` },
  Default: { kind: 'trait', summary: 'Types with a default value: `T::default()`.', link: `${STD}/default/trait.Default.html` },
  PartialEq: { kind: 'trait', summary: 'Enables `==` and `!=`.', link: `${STD}/cmp/trait.PartialEq.html` },
  Eq: { kind: 'trait', summary: 'Marks that `==` is a full equivalence (unlike floats, where `NaN != NaN`). Needed for `HashMap` keys.', link: `${STD}/cmp/trait.Eq.html` },
  PartialOrd: { kind: 'trait', summary: 'Enables `<`, `>`, `<=`, `>=`.', link: `${STD}/cmp/trait.PartialOrd.html` },
  Ord: { kind: 'trait', summary: 'Total ordering; needed for sorting and `BTreeMap` keys.', link: `${STD}/cmp/trait.Ord.html` },
  Hash: { kind: 'trait', summary: 'Types that can be hashed; needed for `HashMap`/`HashSet` keys.', link: `${STD}/hash/trait.Hash.html` },
  Drop: { kind: 'trait', summary: 'Custom cleanup code that runs automatically when a value goes out of scope (like a destructor).', link: `${STD}/ops/trait.Drop.html` },
  Iterator: { kind: 'trait', summary: 'Anything with a `next()` method producing `Option<Item>`. Gives you `map`, `filter`, `collect` and dozens more adapters.', link: `${STD}/iter/trait.Iterator.html` },
  IntoIterator: { kind: 'trait', summary: 'Types that can be turned into an iterator; this is what `for x in value` uses.', link: `${STD}/iter/trait.IntoIterator.html` },
  From: { kind: 'trait', summary: 'Infallible conversion: `T::from(x)`. Implementing `From` gives you `Into` for free, and is how `?` converts errors.', link: `${STD}/convert/trait.From.html` },
  Into: { kind: 'trait', summary: 'Conversion into another type: `x.into()`. The target type is usually inferred.', link: `${STD}/convert/trait.Into.html` },
  Fn: { kind: 'trait', summary: 'Closures that only read their captured variables; can be called many times.', link: `${STD}/ops/trait.Fn.html` },
  FnMut: { kind: 'trait', summary: 'Closures that may modify their captured variables.', link: `${STD}/ops/trait.FnMut.html` },
  FnOnce: { kind: 'trait', summary: 'Closures that may consume their captured variables, so can be called only once.', link: `${STD}/ops/trait.FnOnce.html` },
  Send: { kind: 'trait', summary: 'Marker: safe to move to another thread.', link: `${STD}/marker/trait.Send.html` },
  Sync: { kind: 'trait', summary: 'Marker: safe to share (`&T`) between threads.', link: `${STD}/marker/trait.Sync.html` },
  Sized: { kind: 'trait', summary: 'Marker: size known at compile time. Implicit on generics; `?Sized` relaxes it.', link: `${STD}/marker/trait.Sized.html` },
  derive: {
    kind: 'macro',
    title: '#[derive(...)]',
    summary: 'Asks the compiler to generate standard trait implementations (`Debug`, `Clone`, `PartialEq`, ...) for this type.',
    link: `${REF}/attributes/derive.html`,
  },

  // ------------------------------------------------------------------ macros
  'println!': { kind: 'macro', summary: 'Prints formatted text plus a newline to stdout. `{}` uses `Display`, `{:?}` uses `Debug`, `{name}` inlines a variable.', example: 'println!("{name} is {} years old", age);', link: `${STD}/macro.println.html` },
  'print!': { kind: 'macro', summary: 'Like `println!` without the trailing newline.', link: `${STD}/macro.print.html` },
  'eprintln!': { kind: 'macro', summary: 'Like `println!`, but writes to stderr.', link: `${STD}/macro.eprintln.html` },
  'format!': { kind: 'macro', summary: 'Like `println!`, but returns the formatted `String` instead of printing it.', example: 'let s = format!("{x}-{y}");', link: `${STD}/macro.format.html` },
  'vec!': { kind: 'macro', summary: 'Creates a `Vec` with the given elements, or `vec![value; n]` for `n` copies.', example: 'let v = vec![1, 2, 3];\nlet zeros = vec![0; 10];', link: `${STD}/macro.vec.html` },
  'panic!': { kind: 'macro', summary: 'Crashes the current thread with a message. For bugs and unrecoverable states; use `Result` for expected errors.', link: `${STD}/macro.panic.html` },
  'assert!': { kind: 'macro', summary: 'Panics if the condition is false. Used in tests and to check invariants.', link: `${STD}/macro.assert.html` },
  'assert_eq!': { kind: 'macro', summary: 'Panics if the two values are not equal, printing both. The workhorse of Rust tests.', link: `${STD}/macro.assert_eq.html` },
  'assert_ne!': { kind: 'macro', summary: 'Panics if the two values are equal.', link: `${STD}/macro.assert_ne.html` },
  'todo!': { kind: 'macro', summary: 'Placeholder for unfinished code: compiles (any type) but panics when reached.', link: `${STD}/macro.todo.html` },
  'unimplemented!': { kind: 'macro', summary: 'Panics with "not implemented". Similar to `todo!`.', link: `${STD}/macro.unimplemented.html` },
  'unreachable!': { kind: 'macro', summary: 'Marks code that should never run; panics if it does.', link: `${STD}/macro.unreachable.html` },
  'dbg!': { kind: 'macro', summary: 'Prints the expression, its value and the file/line to stderr, then returns the value. Quick debugging.', example: 'let y = dbg!(x * 2);', link: `${STD}/macro.dbg.html` },
  'write!': { kind: 'macro', summary: 'Writes formatted text into a writer (a file, a `String`, or a `Formatter` in a `Display` impl).', link: `${STD}/macro.write.html` },
  'writeln!': { kind: 'macro', summary: 'Like `write!` plus a newline.', link: `${STD}/macro.writeln.html` },
  'matches!': { kind: 'macro', summary: 'Returns `true` if a value matches a pattern.', example: "matches!(c, 'a'..='z')", link: `${STD}/macro.matches.html` },
};

const MACRO_DOC: DocEntry = {
  kind: 'macro',
  summary: 'A **macro** call (note the `!`). Macros expand into code at compile time.',
  link: `${BOOK}/ch20-05-macros.html`,
};

const FUNCTION_SCOPES = new Set(['function_item', 'closure_expression', 'async_block']);
const LOOPS = new Set(['loop_expression', 'while_expression', 'for_expression']);

function labelText(n: Node | null | undefined): string | undefined {
  return n?.namedChildren.find((c) => c?.type === 'label')?.text;
}

/** The loop a `break`/`continue` expression exits: the labelled one, or the innermost. */
function loopTarget(jump: Node): Node | undefined {
  const label = labelText(jump);
  return ancestor(
    jump,
    (n) => (label ? labelText(n) === label : LOOPS.has(n.type)),
    (n) => FUNCTION_SCOPES.has(n.type),
  );
}

function role(node: Node, field: string | null): Role | undefined {
  const parent = node.parent;
  if (!parent) return undefined;
  const name = `\`${node.text}\``;
  const decl = (title: string, what: string): Role => ({ title, summary: `Declares ${what} ${name}.`, scope: parent });
  switch (`${parent.type}.${field ?? ''}`) {
    case 'function_item.name':
      return decl(parent.parent?.type === 'declaration_list' ? 'Method / associated function' : 'Function name', 'the function');
    case 'function_signature_item.name':
      return decl('Trait method', 'the required trait method');
    case 'struct_item.name':
      return decl('Struct name', 'the struct');
    case 'enum_item.name':
      return decl('Enum name', 'the enum');
    case 'union_item.name':
      return decl('Union name', 'the union');
    case 'enum_variant.name':
      return decl('Enum variant', 'the variant');
    case 'trait_item.name':
      return decl('Trait name', 'the trait');
    case 'type_item.name':
      return decl('Type alias', 'the type alias');
    case 'mod_item.name':
      return decl('Module name', 'the module');
    case 'const_item.name':
      return decl('Constant', 'the constant');
    case 'static_item.name':
      return decl('Static', 'the static');
    case 'macro_definition.name':
      return decl('Macro name', 'the macro');
    case 'field_declaration.name':
      return decl('Field', 'the field');
    case 'associated_type.name':
      return decl('Associated type', 'the associated type');
    case 'impl_item.type':
      return {
        title: 'Implemented type',
        summary: parent.childForFieldName('trait')
          ? `This block implements the trait for ${name}.`
          : `This block adds methods to ${name}.`,
        scope: parent,
      };
    case 'impl_item.trait':
      return { title: 'Implemented trait', summary: `This block implements the trait ${name}.`, scope: parent };
    case 'parameter.pattern':
      return { title: 'Parameter', summary: `${name} is a parameter: a local variable set by the caller.`, scope: parent };
    case 'let_declaration.pattern':
      return { title: 'Variable', summary: `\`let\` binds the name ${name} here.${parent.children.some((c) => c?.type === 'mutable_specifier') ? ' It is mutable.' : ' It is immutable.'}`, scope: parent };
    case 'type_parameters.':
    case 'constrained_type_parameter.left':
      return { title: 'Type parameter', summary: `${name} is a generic type placeholder, filled in by the caller.` };
    case 'lifetime.': {
      const d = docs[`'${node.text}`];
      if (d) return { title: d.title ?? `'${node.text}`, summary: d.summary };
      return { title: `Lifetime '${node.text}`, summary: (docs["lifetime/'"] as DocEntry).summary };
    }
    case 'label.': {
      const owner = parent.parent;
      const loop = owner && LOOPS.has(owner.type) ? owner : owner ? loopTarget(owner) : undefined;
      return { title: `Loop label '${node.text}`, summary: (docs["label/'"] as DocEntry).summary, scope: loop };
    }
  }
  return undefined;
}

export const rust: LanguageSpec = {
  comments: rustComments,
  id: 'rust',
  languageIds: ['rust'],
  displayName: 'Rust',
  wasm: 'tree-sitter-rust.wasm',
  fence: 'rust',
  docs,
  identifierTypes: new Set(['identifier', 'type_identifier', 'field_identifier', 'primitive_type', 'shorthand_field_identifier']),
  wrapperTypes: new Set(['visibility_modifier', 'function_modifiers', 'else_clause', 'let_condition', 'let_chain', 'match_pattern', 'extern_modifier']),
  noScopeTokens: new Set([',', ';', '.', '"', ':', '=', '#', '\'', 'b"']),
  keywordNodeTypes: new Set(['mutable_specifier']),
  macroDoc: (name) => docs[`${name}!`] ?? { ...MACRO_DOC, title: `${name}!` },
  role,
  jumpTarget(token) {
    switch (token.type) {
      case 'return':
      case '?': {
        const fn = ancestor(token, (n) => FUNCTION_SCOPES.has(n.type));
        return fn && { node: fn, verb: token.type === 'return' ? 'returns from' : 'on error, returns early from' };
      }
      case 'break':
      case 'continue': {
        const target = token.parent ? loopTarget(token.parent) : undefined;
        return target && { node: target, verb: token.type === 'break' ? 'breaks out of' : 'continues' };
      }
    }
    return undefined;
  },
  acceptIdentifierDoc(node, field, entry) {
    if (node.type === 'field_identifier') return false; // method/field names: user-defined
    if (entry.kind === 'macro') return entry.title === '#[derive(...)]' && node.parent?.type === 'attribute';
    if (entry.kind === 'keyword') return node.text === 'Self';
    return true;
  },
};

