import type { DocEntry, DocTable } from '../core/model';

/**
 * Docs for the everyday operators (`=`, `+`, `<=`, `&&`, `+=`, `<<`, ...) shared by
 * all languages, with the language-specific details folded in. Each language
 * spreads these *under* its own table (`{ ...operatorDocs('go'), ...docs }`), so
 * its own and context-specific entries ("pointer_type/*") still win.
 */

export type OperatorLang = 'go' | 'rust' | 'c' | 'cpp' | 'csharp' | 'js' | 'ts' | 'python';

type Category = 'arith' | 'compare' | 'logic' | 'bit' | 'assign' | 'incdec' | 'member' | 'punct' | 'cond';

const MDN = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/';
const CS = 'https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/';

const CPPREF: Record<Category, string> = {
  arith: 'operator_arithmetic',
  compare: 'operator_comparison',
  logic: 'operator_logical',
  bit: 'operator_arithmetic',
  assign: 'operator_assignment',
  incdec: 'operator_incdec',
  member: 'operator_member_access',
  punct: 'operator_other',
  cond: 'operator_other',
};

const GO: Record<Category, string> = {
  arith: 'Arithmetic_operators',
  compare: 'Comparison_operators',
  logic: 'Logical_operators',
  bit: 'Arithmetic_operators',
  assign: 'Assignment_statements',
  incdec: 'IncDec_statements',
  member: 'Selectors',
  punct: 'Semicolons',
  cond: 'Operators',
};

const CSHARP: Record<Category, string> = {
  arith: 'arithmetic-operators',
  compare: 'comparison-operators',
  logic: 'boolean-logical-operators',
  bit: 'bitwise-and-shift-operators',
  assign: 'assignment-operator',
  incdec: 'arithmetic-operators#increment-operator-',
  member: 'member-access-operators',
  punct: '',
  cond: 'conditional-operator',
};

/** MDN page name per operator (JavaScript and TypeScript). */
const MDN_PAGE: Record<string, string> = {
  '=': 'Assignment', '+': 'Addition', '-': 'Subtraction', '*': 'Multiplication', '/': 'Division', '%': 'Remainder',
  '**': 'Exponentiation', '+=': 'Addition_assignment', '-=': 'Subtraction_assignment', '*=': 'Multiplication_assignment',
  '/=': 'Division_assignment', '%=': 'Remainder_assignment', '**=': 'Exponentiation_assignment',
  '<<=': 'Left_shift_assignment', '>>=': 'Right_shift_assignment', '>>>=': 'Unsigned_right_shift_assignment',
  '&=': 'Bitwise_AND_assignment', '|=': 'Bitwise_OR_assignment', '^=': 'Bitwise_XOR_assignment',
  '&&=': 'Logical_AND_assignment', '||=': 'Logical_OR_assignment', '??=': 'Nullish_coalescing_assignment',
  '<': 'Less_than', '>': 'Greater_than', '<=': 'Less_than_or_equal', '>=': 'Greater_than_or_equal',
  '==': 'Equality', '!=': 'Inequality', '===': 'Strict_equality', '!==': 'Strict_inequality',
  '<<': 'Left_shift', '>>': 'Right_shift', '>>>': 'Unsigned_right_shift',
  '&': 'Bitwise_AND', '|': 'Bitwise_OR', '^': 'Bitwise_XOR', '~': 'Bitwise_NOT',
  '!': 'Logical_NOT', '&&': 'Logical_AND', '||': 'Logical_OR', '??': 'Nullish_coalescing',
  '++': 'Increment', '--': 'Decrement', ',': 'Comma_operator', '.': 'Property_accessors', '?': 'Conditional_operator',
};

const PY = 'https://docs.python.org/3/reference/';
const PYTHON: Record<Category, string> = {
  arith: 'expressions.html#binary-arithmetic-operations',
  compare: 'expressions.html#comparisons',
  logic: 'expressions.html#boolean-operations',
  bit: 'expressions.html#binary-bitwise-operations',
  assign: 'simple_stmts.html#assignment-statements',
  incdec: 'simple_stmts.html#augmented-assignment-statements',
  member: 'expressions.html#attribute-references',
  punct: 'lexical_analysis.html#delimiters',
  cond: 'expressions.html#conditional-expressions',
};

function link(lang: OperatorLang, cat: Category, op: string): string {
  switch (lang) {
    case 'go':
      return `https://go.dev/ref/spec#${GO[cat]}`;
    case 'rust':
      return op === ';' ? 'https://doc.rust-lang.org/reference/statements.html' : 'https://doc.rust-lang.org/book/appendix-02-operators.html';
    case 'c':
      return `https://en.cppreference.com/w/c/language/${CPPREF[cat]}`;
    case 'cpp':
      return `https://en.cppreference.com/w/cpp/language/${CPPREF[cat]}`;
    case 'csharp':
      return cat === 'punct'
        ? 'https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/statements'
        : `${CS}${CSHARP[cat]}`;
    case 'js':
    case 'ts':
      return MDN_PAGE[op] ? `${MDN}${MDN_PAGE[op]}` : 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators';
    case 'python':
      if (op.length > 1 && op.endsWith('=') && !['==', '!=', '<=', '>='].includes(op)) return `${PY}simple_stmts.html#augmented-assignment-statements`;
      if (op === '<<' || op === '>>') return `${PY}expressions.html#shifting-operations`;
      if (op === '~') return `${PY}expressions.html#unary-arithmetic-and-bitwise-operations`;
      return `${PY}${PYTHON[cat]}`;
  }
}

export function operatorDocs(lang: OperatorLang): DocTable {
  const js = lang === 'js' || lang === 'ts';
  const py = lang === 'python';
  const intDivision = !js && !py;
  const docs: DocTable = {};
  const add = (op: string, cat: Category, title: string, summary: string, extra: Partial<DocEntry> = {}) => {
    docs[op] = { kind: cat === 'punct' ? 'syntax' : 'operator', title: `${op} (${title})`, summary, link: link(lang, cat, op), ...extra };
  };

  // ---------------------------------------------------------------- assignment
  add('=', 'assign', 'assignment', {
    go: 'Assigns the value on the right to an **existing** variable (or field, or element). To declare a new variable, use `:=` or `var`.',
    rust: 'Assigns a value. In `let x = …` it gives a new binding its value; on its own (`x = …`) it changes an existing binding, which must be declared `let mut`.',
    c: 'Assigns the value on the right to the variable on the left. In a declaration (`int x = 5;`) it gives the initial value. Don\'t confuse with `==`, which compares: `if (x = 5)` assigns and is always true.',
    cpp: 'Assigns the value on the right to the variable on the left; for class types this calls the copy or move assignment operator. In a declaration (`int x = 5;`) it initializes. Don\'t confuse with `==`.',
    csharp: 'Assigns the value on the right to the variable, field or property on the left. In a declaration (`var x = new Foo();`) it gives the initial value. Don\'t confuse with `==`, which compares.',
    js: 'Assigns the value on the right to the variable or property on the left. In a declaration (`const x = 5`) it gives the initial value. Don\'t confuse with `===`, which compares.',
    ts: 'Assigns the value on the right to the variable or property on the left. In a declaration (`const x = 5`) it gives the initial value. Don\'t confuse with `===`, which compares.',
    python: 'Binds the name on the left to the value on the right. There is no separate declaration: the first assignment inside a function creates a **local** variable. Assignment never copies: after `b = a`, both names refer to the same object.',
  }[lang], { example: { go: 'count = count + 1', rust: 'let mut total = 0;\ntotal = 10;', c: 'int x = 5;\nx = x * 2;', cpp: 'int x = 5;\nx = x * 2;', csharp: 'var name = "ann";\nname = "bob";', js: 'let x = 5;\nx = x * 2;', ts: 'let x = 5;\nx = x * 2;', python: 'x = 5\na, b = b, a   # swap: unpacks a tuple\nfirst = second = 0' }[lang] });

  const compound: [string, string, string][] = [
    ['+=', 'add and assign', '+'],
    ['-=', 'subtract and assign', '-'],
    ['*=', 'multiply and assign', '*'],
    ['/=', 'divide and assign', '/'],
    ['%=', 'remainder and assign', '%'],
    ['&=', 'bitwise AND and assign', '&'],
    ['|=', 'bitwise OR and assign', '|'],
    ['^=', 'bitwise XOR and assign', '^'],
    ['<<=', 'shift left and assign', '<<'],
    ['>>=', 'shift right and assign', '>>'],
  ];
  if (lang === 'go') compound.push(['&^=', 'bit clear and assign', '&^']);
  if (js || lang === 'csharp') compound.push(['>>>=', 'unsigned shift right and assign', '>>>']);
  if (js) compound.push(['**=', 'power and assign', '**'], ['&&=', 'assign if truthy', '&&'], ['||=', 'assign if falsy', '||']);
  if (py) compound.push(['**=', 'power and assign', '**'], ['//=', 'floor divide and assign', '//'], ['@=', 'matrix multiply and assign', '@']);
  for (const [op, title, base] of compound) {
    const special = {
      '&&=': '`a &&= b` assigns `b` to `a` only if `a` is truthy.',
      '||=': '`a ||= b` assigns `b` to `a` only if `a` is falsy: handy for defaults.',
    }[op];
    const pyNote = py && op === '+=' ? ' On a **mutable** object such as a list it changes the object in place (`xs += [4]` extends `xs`, and every other name for that list sees it); on numbers, strings and tuples it makes a new object.' : '';
    add(op, 'assign', title, special ?? `Shorthand: \`a ${op} b\` means \`a = a ${base} b\`.${lang === 'rust' ? ' The left side must be mutable (`let mut`).' : ''}${op === '+=' && (js || lang === 'csharp') ? ' With strings it appends.' : ''}${pyNote}`);
  }

  // ---------------------------------------------------------------- arithmetic
  add('+', 'arith', 'addition', `Adds two numbers.${js ? ' If either side is a string, it concatenates instead: `"1" + 2` is `"12"`.' : lang === 'go' || lang === 'csharp' ? ' Also joins two strings.' : lang === 'rust' ? ' Also appends a `&str` to a `String`: `s + "!"`.' : lang === 'cpp' ? ' Also joins `std::string`s.' : py ? ' Also joins two strings, lists or tuples: `[1] + [2]` is `[1, 2]`. Mixing types is an error: `"n=" + 5` raises `TypeError` (use an f-string).' : ''} As a prefix (\`+x\`) it leaves a number unchanged.`);
  add('-', 'arith', 'subtraction / negation', `Subtracts the right side from the left. As a prefix (\`-x\`) it negates.${py ? ' On sets it is the difference: `{1, 2} - {2}` is `{1}`.' : ''}`);
  add('*', 'arith', 'multiplication', py ? 'Multiplies two numbers. With a sequence and an integer it **repeats**: `"ab" * 3` is `"ababab"`, `[0] * 4` is `[0, 0, 0, 0]`.' : 'Multiplies two numbers.');
  add('/', 'arith', 'division', intDivision
    ? 'Divides. With two **integers** the result is an integer, rounded toward zero: `7 / 2` is `3`. Make one side a floating-point number for `3.5`. Dividing an integer by zero is an error.'
    : py
      ? '**True division**: always gives a `float`, even for two integers: `7 / 2` is `3.5` and `6 / 3` is `2.0`. Use `//` for integer (floor) division. Dividing by zero raises `ZeroDivisionError`.'
      : 'Divides. Always gives a floating-point result: `7 / 2` is `3.5`; use `Math.trunc(7 / 2)` for `3`. Dividing by zero gives `Infinity`, not an error.');
  add('%', 'arith', 'remainder', py
    ? 'The remainder (modulo): `7 % 3` is `1`. The result has the sign of the **right** side, so `-7 % 3` is `2` (a true modulo, matching `//`). On strings it is old-style formatting: `"%d items" % n`.'
    : `The remainder after division: \`7 % 3\` is \`1\`. The result has the sign of the left side, so \`-7 % 3\` is \`-1\` (it is not a true modulo).`);
  if (js) add('**', 'arith', 'exponentiation', '`a ** b` is `a` to the power `b`: `2 ** 10` is `1024`.');

  // ---------------------------------------------------------------- increment
  if (lang !== 'rust' && !py) {
    const goNote = 'In Go `x++` is a **statement**, not an expression: you can\'t write `y = x++`, and there is no prefix `++x`.';
    const cNote = '`x++` gives the old value and then increments; `++x` increments first and gives the new value.';
    add('++', 'incdec', 'increment', `Adds 1 to a variable. ${lang === 'go' ? goNote : cNote}`);
    add('--', 'incdec', 'decrement', `Subtracts 1 from a variable. ${lang === 'go' ? goNote.replace(/\+\+/g, '--') : cNote.replace(/\+\+/g, '--').replace('increments', 'decrements')}`);
  }

  // ---------------------------------------------------------------- comparison
  const eqNote = {
    go: 'Works on numbers, strings, booleans, pointers, channels, arrays and structs whose fields are comparable; not on slices, maps or functions (except against `nil`).',
    rust: 'Calls `PartialEq::eq`: works for any type that implements (or derives) `PartialEq`.',
    c: 'For pointers it compares addresses; to compare strings use `strcmp`.',
    cpp: 'For class types this calls `operator==`. For C strings (`char*`) it compares addresses; use `std::string` or `strcmp`.',
    csharp: 'For classes it compares references unless the type overloads `==` (string does, records compare values).',
    js: 'Loose equality: converts types first (`0 == ""` is `true`). Prefer `===`.',
    ts: 'Loose equality: converts types first (`0 == ""` is `true`). Prefer `===`.',
    python: 'Compares **values** (it calls `__eq__`): `[1, 2] == [1, 2]` is `True`. To check whether two names refer to the very same object, or to test for `None`, use `is`. Numbers of different types compare by value: `1 == 1.0` is `True`.',
  }[lang];
  add('==', 'compare', 'equal to', `\`true\` if both sides are equal. ${eqNote}`);
  add('!=', 'compare', 'not equal to', `\`true\` if the sides are different: the opposite of \`==\`.${js ? ' Loose, like `==`; prefer `!==`.' : ''}`);
  add('<', 'compare', 'less than', '`true` if the left side is smaller than the right side.');
  add('>', 'compare', 'greater than', '`true` if the left side is larger than the right side.');
  add('<=', 'compare', 'less than or equal', '`true` if the left side is smaller than or equal to the right side.');
  add('>=', 'compare', 'greater than or equal', '`true` if the left side is larger than or equal to the right side.');
  if (py) {
    // Python comparisons give True/False, and they chain.
    for (const op of ['==', '!=', '<', '>', '<=', '>=']) {
      docs[op] = {
        ...docs[op],
        summary: docs[op].summary.replace('`true`', '`True`'),
        details: 'Comparisons **chain**: `0 <= x < 10` means `0 <= x and x < 10`, with `x` evaluated once. Strings compare alphabetically (by code point), lists and tuples item by item.',
        example: 'if 0 <= index < len(items):\n    print(items[index])',
      };
    }
  }

  // ---------------------------------------------------------------- logical
  if (!py) {
    // Python spells these `and`, `or` and `not`.
    add('&&', 'logic', 'logical AND', `\`true\` only if both sides are true. Short-circuits: if the left side is false, the right side is not evaluated, so \`p != ${lang === 'go' ? 'nil' : lang === 'rust' ? 'None' : lang === 'csharp' || js ? 'null' : 'NULL'} && p.ok\` is safe.`);
    add('||', 'logic', 'logical OR', '`true` if at least one side is true. Short-circuits: if the left side is true, the right side is not evaluated.');
    add('!', 'logic', 'logical NOT', `Flips a boolean: \`!true\` is \`false\`.${lang === 'rust' ? ' On integers it flips every bit.' : ''}`);
  }

  // ---------------------------------------------------------------- bitwise
  add('&', 'bit', 'bitwise AND', `Bitwise AND: each result bit is 1 only if both input bits are 1. Used with masks: \`flags & MASK\`.${py ? ' On sets it is the intersection: `{1, 2} & {2, 3}` is `{2}`.' : ''}`);
  add('|', 'bit', 'bitwise OR', `Bitwise OR: each result bit is 1 if either input bit is 1. Used to combine flags: \`READ | WRITE\`.${py ? ' On sets it is the union, on dicts a merge (`defaults | overrides`, the right side wins), and in type hints it means "either type": `int | None`.' : ''}`);
  add('^', 'bit', 'bitwise XOR', `Bitwise XOR: each result bit is 1 if the input bits differ.${lang === 'go' ? ' As a prefix, `^x` flips every bit.' : py ? ' On sets it is the symmetric difference. It is **not** "to the power of": that is `**`.' : ''}`);
  if (lang !== 'go' && lang !== 'rust') add('~', 'bit', 'bitwise NOT', py ? 'Flips every bit. Python integers have no fixed size, so `~x` equals `-x - 1`: `~0` is `-1`.' : 'Flips every bit: `~0` has all bits set.');
  add('<<', 'bit', 'shift left', 'Shifts the bits left: `1 << 3` is `8` (multiplying by 2 per step).');
  add('>>', 'bit', 'shift right', `Shifts the bits right: \`16 >> 2\` is \`4\` (dividing by 2 per step).${js ? ' Keeps the sign; `>>>` fills with zeros.' : ''}`);
  if (js || lang === 'csharp') add('>>>', 'bit', 'unsigned shift right', 'Shifts right and fills the top bits with zeros, ignoring the sign.');

  // ---------------------------------------------------------------- conditional
  if (lang === 'c' || lang === 'cpp' || lang === 'csharp' || js) {
    add('?', 'cond', 'conditional operator', '`cond ? a : b` gives `a` if `cond` is true, otherwise `b`: an `if`/`else` that produces a value.', { example: 'max = a > b ? a : b' });
  }

  // ---------------------------------------------------------------- member access and punctuation
  add('.', 'member', 'member access', {
    go: '`x.f` selects field or method `f` of `x`, or a name exported by package `x` (`fmt.Println`). Pointers are followed automatically.',
    rust: '`x.f` accesses field `f` or calls method `f` of `x`. References and smart pointers are dereferenced automatically.',
    c: '`s.f` accesses field `f` of struct `s`. Through a pointer use `p->f`.',
    cpp: '`obj.f` accesses member `f` of `obj`. Through a pointer use `p->f`.',
    csharp: '`x.F` accesses member `F` of `x`, or a type or namespace member (`Console.WriteLine`).',
    js: '`obj.prop` reads property `prop` of `obj`. Use `obj?.prop` when `obj` may be `null`/`undefined`.',
    ts: '`obj.prop` reads property `prop` of `obj`. Use `obj?.prop` when `obj` may be `null`/`undefined`.',
    python: '`obj.name` reads the attribute `name` of `obj`: a field, a method, or a name inside a module (`os.path`). A missing attribute raises `AttributeError`; `getattr(obj, "name", default)` avoids that.',
  }[lang]);
  add(',', 'punct', 'comma', `Separates items: arguments, parameters, list elements, fields.${lang === 'c' || lang === 'cpp' ? ' Between expressions it is the comma operator: evaluates both, gives the right one (seen in `for` headers).' : py ? ' In Python the comma, not the parentheses, makes a **tuple**: `point = 1, 2` and `(1,)` are tuples, but `(1)` is just `1`. A trailing comma is allowed.' : ''}`);
  add(';', 'punct', 'semicolon', {
    go: 'Ends a statement. Go inserts semicolons at line ends automatically, so you only write them to put several statements on one line or in `for` headers.',
    rust: 'Ends a statement, and turns an expression into a statement whose value is discarded. That is why the last expression of a block has **no** `;`: it is the block\'s value. Adding one makes the block return `()`.',
    c: 'Ends a statement or declaration. Required after every statement and after a `struct` definition.',
    cpp: 'Ends a statement or declaration. Required after every statement and after a `class`/`struct` definition.',
    csharp: 'Ends a statement. Required after every statement and field declaration.',
    js: 'Ends a statement. Mostly optional thanks to automatic semicolon insertion, but a line starting with `(` or `[` can join the previous one: many style guides always write them.',
    ts: 'Ends a statement. Mostly optional thanks to automatic semicolon insertion, but a line starting with `(` or `[` can join the previous one: many style guides always write them.',
    python: 'Separates several simple statements on **one line**: `import os; print(os.name)`. A line break already ends a statement, so it is rarely needed (and style guides discourage it).',
  }[lang]);
  add(':', 'punct', 'colon', {
    go: 'Separates parts: `key: value` in map and struct literals, `low:high` in slices, `case x:` and labels.',
    rust: 'Gives a **type**: `let x: i32`, `fn f(a: u8)`, `T: Trait` bounds. Also `field: value` in struct literals.',
    c: 'Ends a `case`/`default` label or a jump label, and is the `else` part of `?:`. In a struct, `int x : 3` is a bit-field.',
    cpp: 'Ends a `case`/`default` label or a jump label, is the `else` part of `?:`, starts a base-class list or member initializer list, and separates `for (x : range)`.',
    csharp: 'Separates parts: base types (`class A : B`), `case x:` labels, named arguments (`f(name: x)`), and the `else` part of `?:`.',
    js: 'Separates parts: `key: value` in object literals, `case x:` labels, and the `else` part of `?:`.',
    ts: 'Gives a **type**: `let x: number`, `(a: string) => …`. Also `key: value` in object literals, `case x:` labels and the `else` part of `?:`.',
    python: 'Ends the header of a compound statement (`if`, `for`, `def`, `class`, ...): the indented block follows. Also separates `key: value` in dicts, `start:stop` in slices, a type hint (`x: int`) and the body of a `lambda`.',
  }[lang]);

  // ---------------------------------------------------------------- language-specific extras
  if (lang === 'cpp') {
    add('.*', 'member', 'pointer to member', '`obj.*pm` uses a pointer-to-member `pm` on object `obj`. Rare; mostly seen in generic library code.');
    add('->*', 'member', 'pointer to member', '`ptr->*pm` uses a pointer-to-member `pm` through pointer `ptr`. Rare; mostly seen in generic library code.');
    add('::', 'member', 'scope resolution', '`A::b` names `b` inside namespace or class `A`; `::b` names the global `b`.');
  }
  if (lang === 'c') add('::', 'member', 'attribute scope', 'Inside `[[ ]]` attributes (C23) it separates a vendor prefix from the attribute name: `[[gnu::unused]]`.');
  if (js) {
    add('@', 'member', 'decorator', '`@name` before a class or member applies a **decorator**: a function that wraps or annotates it.', { link: 'https://www.typescriptlang.org/docs/handbook/decorators.html' });
    add('/>', 'member', 'self-closing JSX tag', '`<Tag />` is a JSX element with no children, like `<Tag></Tag>`.', { link: 'https://react.dev/learn/writing-markup-with-jsx' });
  }
  if (lang === 'ts') {
    add('+?:', 'member', 'add optional modifier', 'In a mapped type, `[K in Keys]+?:` makes every property optional (same as `?:`).', { link: 'https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#mapping-modifiers' });
  }
  if (lang === 'rust') {
    add('$', 'member', 'macro variable', 'In `macro_rules!`, `$name` is a macro variable (`$x:expr`) and `$( … )*` repeats a pattern.', { link: 'https://doc.rust-lang.org/book/ch20-05-macros.html' });
    add('...', 'member', 'variadic / old range', '`...` appears in C-variadic `extern` functions (`fn printf(fmt: *const c_char, ...)`); in patterns it is the old spelling of `..=`.');
  }
  // ---------------------------------------------------------------- `<` and `=` that aren't comparison or assignment
  const ctx = (key: string, title: string, summary: string, url: string) => {
    docs[key] = { kind: 'syntax', title, summary, link: url };
  };
  if (lang === 'rust') {
    ctx('type_arguments/<', '<T> (type arguments)', 'Fills in a generic type\'s or function\'s type parameters: `Vec<i32>`, `HashMap<String, u32>`, or with the turbofish `parse::<i32>()`.', 'https://doc.rust-lang.org/book/ch10-01-syntax.html');
  }
  if (lang === 'ts') {
    ctx('type_alias_declaration/=', 'type X = … (type alias)', 'Gives a name to a type: everything after `=` is a type, not a value.', 'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-aliases');
  }
  if (js) {
    ctx('jsx_attribute/=', 'attr={…} (JSX attribute)', 'Sets a prop on the element: a string in quotes, or any expression in `{ }`.', 'https://react.dev/learn/passing-props-to-a-component');
  }
  if (lang === 'cpp') {
    ctx('default_method_clause/=', '= default', 'Asks the compiler to generate this special member function (constructor, copy, destructor, …) with its default behaviour.', 'https://en.cppreference.com/w/cpp/language/function#Defaulted_functions');
    ctx('delete_method_clause/=', '= delete', 'Forbids this function: calling it is a compile error. Often used to make a type non-copyable.', 'https://en.cppreference.com/w/cpp/language/function#Deleted_functions');
  }
  if (lang === 'c' || lang === 'cpp') {
    ctx('initializer_pair/=', '.field = value (designated initializer)', 'In a brace initializer, sets one named field (or array index `[i] =`); the others become zero.', `https://en.cppreference.com/w/${lang === 'c' ? 'c' : 'cpp'}/language/${lang === 'c' ? 'struct_initialization' : 'aggregate_initialization'}`);
  }
  return docs;
}
