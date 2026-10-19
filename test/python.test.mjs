import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { load } from './helpers.mjs';

let L;
before(async () => {
  L = await load('python', 'python', 'tour.py');
});

const hover = (...args) => L.hover(...args);
const scope = (...args) => L.scope(...args);
const md = (...args) => hover(...args)?.markdown;

describe('Python hovers', () => {
  test('keywords get a doc with heading, example and link', () => {
    const h = md('def divide');
    assert.match(h, /^\*\*`def`\*\* · Python keyword/);
    assert.match(h, /```python\n/);
    assert.match(h, /docs\.python\.org\/3\/reference\/compound_stmts\.html#function-definitions/);
  });

  test('context picks the right meaning of a keyword', () => {
    assert.match(md('def __add__'), /def \(method\)/);
    assert.match(md('async def'), /async def/);
    assert.match(md('async with'), /async with/);
    assert.match(md('async for'), /async for/);
    assert.match(md('else:\n        print("summed'), /else \(loop\)[\s\S]*without `break`/);
    assert.match(md('else:\n        return a / b'), /^\*\*`else`\*\*[\s\S]*`elif` conditions/);
    assert.match(md('else:\n        print(value)'), /else \(try\)/);
    assert.match(md('in nums'), /in \(for loop\)/);
    assert.match(md('in range(10)'), /in \(comprehension\)/);
    assert.match(md('for n in range(10)'), /for \(comprehension\)/);
    assert.match(md('if n % 2'), /comprehension filter/);
    assert.match(md('if yy > 0'), /guard/);
    assert.match(md('if big > 100'), /conditional expression/);
    assert.match(md('else "small"'), /conditional expression/);
    assert.match(md('as system'), /import alias/);
    assert.match(md('as session'), /as \(with\)/);
    assert.match(md('as error'), /as \(except\)/);
    assert.match(md('as text'), /as \(pattern\)/);
    assert.match(md('from None'), /exception chaining/);
    assert.match(md('from range'), /yield from/);
    assert.match(md('from collections'), /from \.\.\. import/);
    assert.match(md('from __future__'), /from __future__ import/);
    assert.match(md('type Pair'), /type alias/);
    assert.match(md('match value'), /pattern matching/);
    assert.match(md('case 0'), /One branch of a `match`/);
    assert.match(md('_:\n'), /wildcard/);
    assert.match(md('global counter'), /module-level/);
    assert.match(md('nonlocal count'), /enclosing function/);
  });

  test('operator words and Python-only operators', () => {
    assert.match(md('in squares'), /in \(membership\)/);
    assert.match(md('not in unique'), /not in/);
    assert.match(md('in unique'), /not in/);
    assert.equal(L.text(scope('in squares').primary), '4 in squares');
    assert.equal(L.text(scope('not in unique').primary), '5 not in unique');
    assert.match(md('is None or'), /is \(identity\)/);
    assert.match(md('is not n'), /is not/);
    assert.match(md('not n:'), /is not/);
    assert.match(md('not unique'), /^\*\*`not`\*\*/);
    assert.match(md('and not'), /short-circuits/);
    assert.match(md('or n is'), /^\*\*`or`\*\*/);
    assert.match(md('** 2 +'), /\*\* \(power\)/);
    assert.match(md('// b'), /floor division/);
    assert.match(md('/ b\n'), /True division/);
    assert.match(md('@ inputs'), /matrix multiplication/);
    assert.match(md('@dataclass'), /decorator/);
    assert.match(md(':= len'), /walrus/);
    assert.match(md('-> Point:\n        return Point'), /return annotation/);
    assert.match(md('== 0:\n        if strict'), /True[\s\S]*chain/);
    assert.match(md('% 2'), /sign of the \*\*right\*\* side/);
    assert.match(md('+= 1'), /add and assign/);
  });

  test('* and ** in their different roles', () => {
    assert.match(md('*nums'), /\*args \(variadic positional parameter\)/);
    assert.match(md('**options)'), /\*\*kwargs/);
    assert.match(md('*, strict'), /keyword-only marker/);
    assert.match(md('/, *'), /positional-only marker/);
    assert.match(md('*others'), /starred assignment/);
    assert.match(md('*numbers, **'), /argument unpacking/);
    assert.match(md('**options)\n'), /keyword argument unpacking/);
    assert.match(md('**{"sep"'), /dict unpacking/);
    assert.match(md('*rest'), /star pattern/);
    assert.match(md('**extra'), /mapping rest/);
    assert.match(md('*\n\nPI'), /wildcard import/);
    assert.match(md('* n for', 0, 0), /\* \(multiplication\)[\s\S]*repeats/);
  });

  test('the colon in its different roles', () => {
    assert.match(md(':\n    """A point', 0, 0), /start of block[\s\S]*indent/);
    assert.match(md(':-1'), /slice/);
    assert.match(md(': n ** 2'), /key: value/);
    assert.match(md(': float\n    y'), /annotation/);
    assert.match(md(': Point)'), /type hint/);
    assert.match(md(': x * x'), /lambda body/);
    assert.match(md(':>10'), /format spec/);
    assert.match(md(': name,'), /mapping pattern/);
  });

  test('literals', () => {
    assert.match(md('f"héllo'), /f-string/);
    assert.equal(L.text(hover('f"héllo').span), 'f"héllo 👋 {first + 1} and {squares!s}"');
    assert.match(md('{first + 1}'), /replacement field/);
    assert.match(md('!s}'), /repr\(\)/);
    assert.match(md('r"C:'), /raw string/);
    assert.match(md('b"bytes"'), /bytes literal/);
    assert.match(md('"""multi'), /triple-quoted/);
    assert.match(md('"divide by zero"'), /\(string\)/);
    assert.match(md('\\n"}'), /escape sequence/);
    assert.match(md('0b1010'), /binary integer literal[\s\S]*`10` in decimal/);
    assert.match(md('0xFF'), /hexadecimal/);
    assert.match(md('3j'), /imaginary/);
    assert.match(md('2.5e3'), /float literal/);
    assert.match(md('1_000_000'), /Underscores/);
    assert.match(md('None\n'), /No value/);
    assert.match(md('True)'), /\*\*`True`\*\*/);
  });

  test('comprehensions and collections', () => {
    assert.match(md('[n * n'), /list comprehension/);
    assert.match(md('{n: n'), /dict comprehension/);
    assert.match(md('{abs'), /set comprehension/);
    assert.match(md('(n for'), /generator expression/);
    assert.match(md('[1:-1'), /subscript/);
    assert.match(md('[first, *rest]'), /sequence pattern/);
    assert.match(md('{"name"'), /mapping pattern/);
    assert.match(md('(x=0'), /class pattern/);
  });

  test('built-ins only match where they are really the built-in', () => {
    assert.match(md('print("summed'), /\*\*`print`\*\* · Python built-in function/);
    assert.match(md('len(nums)'), /number of items/);
    assert.match(md('range(10)'), /never included/);
    assert.match(md('isinstance'), /instance of a class/);
    assert.match(md('list), "'), /\*\*`list`\*\* · Python built-in type/);
    assert.match(md('NotImplementedError'), /subclasses must override/);
    assert.match(md('__name__'), /__main__/);
    assert.match(md('self.x +'), /\*\*`self`\*\* · Python naming convention[\s\S]*instance/);
    assert.match(md('property\n'), /Decorator[\s\S]*computed when read/);
    assert.match(md('str() as'), /Class pattern[\s\S]*\*\*`str`\*\* · Python built-in type/);
    // Attributes and the user's own names are not the built-in.
    assert.equal(hover('sort(key'), undefined);
    assert.equal(hover('x + other.x', 0, 0), undefined);
    assert.equal(hover('result += n', 0, 0), undefined);
  });

  test('declaration names describe their role', () => {
    assert.match(md('Point:\n'), /\*\*Class name\*\*/);
    assert.match(md('Shape(object)'), /subclass of `object`/);
    assert.match(md('__add__'), /\*\*Special method\*\*[\s\S]*`\+`/);
    assert.match(md('origin(cls)'), /\*\*Class method\*\*/);
    assert.match(md('cls) ->'), /\*\*Class parameter\*\*/);
    assert.match(md('self, other'), /\*\*Self parameter\*\*[\s\S]*\*\*`self`\*\*/);
    assert.match(md('length(self)'), /\*\*Property\*\*/);
    assert.match(md('area(self)'), /\*\*Method\*\*/);
    assert.match(md('divide(a'), /\*\*Function name\*\*/);
    assert.match(md('add(step'), /\*\*Nested function\*\*/);
    assert.match(md('a, b, /'), /positional-only/);
    assert.match(md('strict=False'), /keyword-only[\s\S]*default value/);
    assert.match(md('nums, **'), /Parameter \(\*args\)/);
    assert.match(md('PI:'), /\*\*Constant\*\*/);
    assert.match(md('counter = 0'), /\*\*Global variable\*\*/);
    assert.match(md('counter\n    counter'), /\*\*Global name\*\*/);
    assert.match(md('count\n        count'), /\*\*Nonlocal name\*\*/);
    assert.match(md('x: float'), /\*\*Class attribute \(annotated\)\*\*[\s\S]*dataclass/);
    assert.match(md('y: float = 0.0'), /\*\*Class attribute\*\*/);
    assert.match(md('result = 0'), /\*\*Variable\*\*/);
    assert.match(md('first, *others'), /unpacked/);
    assert.match(md('n in nums'), /\*\*Loop variable\*\*/);
    assert.match(md('n in range(10)'), /\*\*Comprehension variable\*\*/);
    assert.match(md('size :='), /walrus/);
    assert.match(md('error:\n        print', 0, 0), /\*\*Caught exception\*\*/);
    assert.match(md('out, open'), /\*\*Context variable\*\*/);
    assert.match(md('system\n'), /\*\*Import alias\*\*/);
    assert.match(md('os\n'), /\*\*Imported module\*\*/);
    assert.match(md('defaultdict'), /\*\*Imported name\*\*/);
    assert.match(md('namedtuple'), /\*\*Imported name\*\*.*available here as `nt`/);
    assert.match(md('annotations'), /\*\*Future feature\*\*/);
    assert.match(md('Pair['), /\*\*Type alias\*\*/);
    assert.match(md('T] ='), /\*\*Type parameter\*\*/);
    assert.match(md('first, *rest'), /\*\*Capture pattern\*\*/);
    assert.match(md('Point(x=0'), /\*\*Class pattern\*\*/);
    assert.match(md('x=0'), /\*\*Attribute pattern\*\*/);
    assert.match(md('file='), /\*\*Keyword argument\*\*/);
    assert.match(md('dataclass\nclass'), /\*\*Decorator\*\*/);
  });

  test('jump keywords say where they go', () => {
    assert.match(md('return Point('), /returns from `def __add__\(self, other: Point\) -> Point:`/);
    assert.match(md('break\n'), /breaks out of `while n > 0:`/);
    assert.match(md('continue\n'), /continues `for n in nums:`/);
    assert.match(md('yield n'), /pauses `def countdown\(n\):`/);
    assert.match(md('await session'), /pauses `async def fetch\(url\):`/);
    assert.match(md('raise ZeroDivisionError'), /raises out of `def divide/);
    assert.match(md('raise ValueError("no result")'), /may be caught by `try:`/);
  });

  test('docstrings are explained as documentation', () => {
    const h = hover('A point in the plane');
    assert.match(h.markdown, /^\*\*Docstring\*\* · Python doc comment/);
    assert.match(h.markdown, /Documents:\*\* `class Point:`/);
  });

  test('columns after non-ASCII text (UTF-16) line up', () => {
    // The f-string line has an emoji (a surrogate pair) before these tokens.
    assert.equal(L.text(hover('{squares').span), '{');
    assert.equal(L.text(hover('+ 1}').span), '+');
    assert.equal(L.text(hover('!s}').span), '!s');
  });
});

describe('Python scopes', () => {
  const divide = 'def divide(a, b, /, *, strict=False):';

  test('def and the function name highlight the whole function; no closing bracket outlined', () => {
    for (const s of [scope('def divide'), scope('divide(a', 0, 2)]) {
      const t = L.text(s.primary);
      assert.ok(t.startsWith(divide) && t.endsWith('return a / b'), t);
    }
    // The body ends with `)`, but that is not the function's closing bracket.
    const add = scope('def __add__');
    assert.ok(L.text(add.primary).endsWith('self.y + other.y)'));
    assert.deepEqual(add.boundaries.map((b) => L.text(b)), ['def']);
  });

  test('decorators belong to their definition', () => {
    for (const s of [scope('class Point'), scope('@dataclass'), scope('Point:\n')]) {
      const t = L.text(s.primary);
      assert.ok(t.startsWith('@dataclass\nclass Point:') && t.endsWith('** 0.5'), t);
    }
    assert.ok(L.text(scope('def origin').primary).startsWith('@classmethod\n    def origin'));
  });

  test('if / elif / else highlight the whole chain', () => {
    const t = L.text(scope('if b == 0').primary);
    assert.ok(t.startsWith('if b == 0:') && t.endsWith('return a / b'), t);
    assert.equal(L.text(scope('elif').primary), t);
    assert.equal(L.text(scope('else:\n        return a / b').primary), t);
  });

  test('else of a loop or try highlights the loop or try', () => {
    const loop = L.text(scope('else:\n        print("summed').primary);
    assert.ok(loop.startsWith('for n in nums:') && loop.endsWith('"numbers")'), loop);
    assert.equal(L.text(scope('in nums').primary), loop);
    const t = L.text(scope('else:\n        print(value)').primary);
    assert.ok(t.startsWith('try:') && t.endsWith('print("done")'), t);
    assert.equal(L.text(scope('except (Zero').primary), 'except (ZeroDivisionError, ValueError) as error:\n        print("error:", error)');
  });

  test('match, case, with, lambda and comprehensions', () => {
    const m = L.text(scope('match value').primary);
    assert.ok(m.startsWith('match value:') && m.endsWith('return "something else"'), m);
    assert.equal(L.text(scope('case 0').primary), 'case 0 | 1:\n            return "small"');
    assert.equal(L.text(scope('_:\n').primary), 'case _:\n            return "something else"');
    assert.ok(L.text(scope('with open(os').primary).endsWith('out.write(raw)'));
    assert.equal(L.text(scope('lambda x').primary), 'lambda x: x * x');
    assert.equal(L.text(scope('for n in range(10)').primary), '[n * n for n in range(10) if n % 2 == 0]');
  });

  test('jumps also highlight where they go', () => {
    const r = scope('return a / b');
    assert.equal(L.text(r.primary), 'return a / b');
    assert.ok(L.text(r.related).startsWith(divide));
    assert.ok(L.text(scope('break\n').related).startsWith('while n > 0:'));
    assert.ok(L.text(scope('raise ValueError("no result")').related).startsWith('try:'));
  });

  test('names highlight what they declare', () => {
    assert.equal(L.text(scope('result = 0').primary), 'result = 0');
    assert.ok(L.text(scope('n in nums').primary).startsWith('for n in nums:'));
    assert.ok(L.text(scope('error:\n        print', 0, 0).primary).startsWith('except (ZeroDivisionError'));
    assert.equal(L.text(scope('first, *rest').primary), 'case [first, *rest]:\n            return f"list starting with {first!r}"');
  });

  test('a docstring highlights itself and the definition it documents', () => {
    const s = scope('A point in the plane');
    assert.equal(L.text(s.primary), '"""A point in the plane."""');
    assert.ok(L.text(s.related).startsWith('@dataclass\nclass Point:'));
  });

  test('values, plain names and punctuation get no scope', () => {
    assert.equal(scope('None\n'), undefined);
    assert.equal(scope('print("summed'), undefined);
    assert.equal(scope('result += n', 0, 0), undefined);
    assert.equal(scope(':\n    """A point', 0, 0), undefined);
    assert.equal(scope('(a, b, /', 0, 2), undefined);
  });

  test('brackets highlight their contents', () => {
    const s = scope('(a, b, /');
    assert.equal(L.text(s.primary), '(a, b, /, *, strict=False)');
    assert.deepEqual(s.boundaries.map((b) => L.text(b)), ['(', ')']);
  });
});
