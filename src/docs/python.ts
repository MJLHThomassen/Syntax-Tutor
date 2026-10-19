import type { Node } from 'web-tree-sitter';
import type { DocEntry, DocKind, DocTable, JumpTarget, LanguageSpec, Role } from '../core/model';
import { ancestor, fieldOf } from '../core/nodes';
import { pythonComments } from './comments';
import { operatorDocs } from './operators';

const DOCS = 'https://docs.python.org/3';
const REF = `${DOCS}/reference`;
const compound = (anchor: string) => `${REF}/compound_stmts.html#${anchor}`;
const simple = (anchor: string) => `${REF}/simple_stmts.html#${anchor}`;
const expr = (anchor: string) => `${REF}/expressions.html#${anchor}`;
const lex = (anchor: string) => `${REF}/lexical_analysis.html#${anchor}`;
const fn = (anchor: string) => `${DOCS}/builtins/functions.html#${anchor}`;
const tut = (page: string, anchor: string) => `${DOCS}/tutorial/${page}.html#${anchor}`;
const exc = (name: string) => `${DOCS}/builtins/exceptions.html#${name}`;
const constant = (name: string) => `${DOCS}/builtins/constants.html#${name}`;

const docs: DocTable = {
  // ------------------------------------------------------------ definitions
  def: {
    kind: 'keyword',
    summary: 'Defines a **function**: a name, parameters in `( )`, a `:` and an indented body. Without a `return`, a function returns `None`.',
    details: 'Parameters can have default values (`n=1`) and type hints (`n: int`); `-> T` hints the return type. Type hints are not checked when the code runs, only by tools such as mypy.',
    example: 'def greet(name: str, times: int = 1) -> str:\n    return ("hello " + name + "\\n") * times',
    link: compound('function-definitions'),
  },
  'function_definition/async': {
    kind: 'keyword',
    title: 'async def',
    summary: 'Defines a **coroutine function**. Calling it does not run the body: it returns a coroutine object that runs when awaited (`await f()`) or scheduled (`asyncio.run(f())`). Inside it you can use `await`, `async for` and `async with`.',
    example: 'async def load(url):\n    async with session.get(url) as response:\n        return await response.text()',
    link: compound('coroutine-function-definition'),
  },
  class: {
    kind: 'keyword',
    summary: 'Defines a **class**: a blueprint for objects. The indented body holds methods (functions whose first parameter is the instance, `self`) and class attributes. Create an instance by calling the class: `Point(1, 2)`.',
    details: 'Base classes go in parentheses: `class Dog(Animal):`. `__init__` sets up a new instance. Every class inherits from `object`.',
    example: 'class Point:\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y\n\n    def norm(self):\n        return (self.x ** 2 + self.y ** 2) ** 0.5',
    link: compound('class-definitions'),
  },
  return: {
    kind: 'keyword',
    summary: 'Ends the function and hands a value back to the caller. A bare `return` (or no `return` at all) returns `None`. `return a, b` returns a tuple.',
    example: 'def divmod_(a, b):\n    return a // b, a % b',
    link: simple('the-return-statement'),
  },
  lambda: {
    kind: 'keyword',
    summary: 'A **lambda**: a small anonymous function written as one expression. `lambda x: x * 2` is the same as a `def` that returns `x * 2`.',
    details: 'The body must be a single expression (no statements, no `return`). Mostly used for short callbacks, e.g. a `key=` for `sorted`.',
    example: 'names.sort(key=lambda name: name.lower())',
    link: expr('lambda'),
  },
  yield: {
    kind: 'keyword',
    summary: 'Makes the function a **generator**: each `yield` hands a value to the caller and pauses the function until the next value is asked for (by a `for` loop or `next()`).',
    details: 'Generators are lazy: values are made one at a time, so they work for huge or endless sequences.',
    example: 'def countdown(n):\n    while n > 0:\n        yield n\n        n -= 1\n\nfor i in countdown(3):\n    print(i)  # 3, 2, 1',
    link: simple('the-yield-statement'),
  },
  'yield/from': {
    kind: 'keyword',
    title: 'yield from',
    summary: '**Delegates** to another iterable or generator: yields each of its values in turn, as if they were yielded here. Its `return` value becomes the value of the `yield from` expression.',
    example: 'def chain(a, b):\n    yield from a\n    yield from b',
    link: expr('yield-expressions'),
  },
  await: {
    kind: 'keyword',
    summary: 'Waits for an **awaitable** (a coroutine, task or future) to finish and gives its result. Meanwhile the event loop runs other tasks.',
    details: 'Only allowed inside `async def`. Calling a coroutine function without `await` does nothing but create a coroutine object (Python warns "coroutine was never awaited").',
    example: 'data = await fetch(url)\nresults = await asyncio.gather(fetch(a), fetch(b))',
    link: expr('await-expression'),
  },
  async: {
    kind: 'keyword',
    summary: 'Marks asynchronous code: `async def` defines a coroutine, `async for` loops over an asynchronous iterator, `async with` uses an asynchronous context manager.',
    link: compound('coroutines'),
  },
  'for_statement/async': {
    kind: 'keyword',
    title: 'async for',
    summary: 'Loops over an **asynchronous iterator**: each next item is awaited, so other tasks can run in between. Only allowed inside `async def`.',
    example: 'async for message in websocket:\n    print(message)',
    link: compound('the-async-for-statement'),
  },
  'with_statement/async': {
    kind: 'keyword',
    title: 'async with',
    summary: 'Uses an **asynchronous context manager**: its setup and cleanup (`__aenter__`/`__aexit__`) are awaited. Only allowed inside `async def`.',
    example: 'async with aiohttp.ClientSession() as session:\n    ...',
    link: compound('the-async-with-statement'),
  },
  'for_in_clause/async': {
    kind: 'keyword',
    title: 'async for (comprehension)',
    summary: 'An **asynchronous comprehension**: loops over an asynchronous iterator, awaiting each item.',
    example: 'names = [user.name async for user in fetch_users()]',
    link: expr('asynchronous-comprehensions'),
  },
  pass: {
    kind: 'keyword',
    summary: 'Does nothing. A placeholder where Python needs a statement but you have nothing to write yet: an empty function, class or `except` block.',
    example: 'class NotReadyYet:\n    pass',
    link: simple('the-pass-statement'),
  },
  global: {
    kind: 'keyword',
    summary: 'Declares that the listed names inside this function refer to the **module-level** variables, so assigning to them changes the global variable instead of creating a local one.',
    details: 'Reading a global never needs `global`; only assigning does. Too many globals make code hard to follow: prefer passing values and returning results.',
    example: 'counter = 0\n\ndef bump():\n    global counter\n    counter += 1',
    link: simple('the-global-statement'),
  },
  nonlocal: {
    kind: 'keyword',
    summary: 'Declares that the listed names refer to a variable of the **enclosing function** (not this one, not the module), so a nested function can reassign it.',
    example: 'def make_counter():\n    count = 0\n    def bump():\n        nonlocal count\n        count += 1\n        return count\n    return bump',
    link: simple('the-nonlocal-statement'),
  },
  del: {
    kind: 'keyword',
    summary: 'Deletes a **name**, a list item or slice, a dict key, or an attribute. `del x` removes the variable `x`; the object itself is freed once nothing refers to it anymore.',
    example: 'del items[0]\ndel config["debug"]\ndel temp',
    link: simple('the-del-statement'),
  },
  assert: {
    kind: 'keyword',
    summary: 'Checks a condition and raises `AssertionError` (with the optional message after the comma) if it is false. For catching bugs, not for validating user input.',
    details: 'Gotcha: asserts are removed when Python runs with `-O`. And `assert (cond, "msg")` with parentheses is a non-empty tuple, so it is always true.',
    example: 'assert len(items) > 0, "items must not be empty"',
    link: simple('the-assert-statement'),
  },
  'type_alias_statement/type': {
    kind: 'keyword',
    title: 'type (type alias)',
    summary: 'Declares a **type alias** (Python 3.12+): a name for a type hint. It can have type parameters in `[ ]`. `type` is a *soft keyword*: elsewhere it is the built-in `type()`.',
    example: 'type Point = tuple[float, float]\ntype Pair[T] = tuple[T, T]',
    link: simple('the-type-statement'),
  },

  // ------------------------------------------------------------- control flow
  if: {
    kind: 'keyword',
    summary: 'Runs the indented block only when the condition is **truthy**. Add `elif` branches for more conditions and an `else` for the rest.',
    details: 'Falsy values are `False`, `None`, `0`, `0.0`, empty strings and empty collections (`""`, `[]`, `{}`, `set()`); everything else is truthy. So `if items:` means "if the list is not empty".',
    example: 'if n < 0:\n    sign = -1\nelif n == 0:\n    sign = 0\nelse:\n    sign = 1',
    link: compound('the-if-statement'),
  },
  elif: {
    kind: 'keyword',
    summary: 'Short for "else if": checked only when the previous `if`/`elif` conditions were false. Python has no `switch`; a chain of `elif`s (or a `match`) does that job.',
    link: compound('the-if-statement'),
  },
  else: {
    kind: 'keyword',
    summary: 'The branch that runs when no condition before it was true.',
    link: compound('the-if-statement'),
  },
  'conditional_expression/if': {
    kind: 'keyword',
    title: 'a if cond else b (conditional expression)',
    summary: 'A **conditional expression** (Python\'s ternary): gives `a` if `cond` is truthy, otherwise `b`. Note the order: the value comes first, then the condition.',
    example: 'label = "item" if count == 1 else "items"',
    link: expr('conditional-expressions'),
  },
  'conditional_expression/else': {
    kind: 'keyword',
    title: 'a if cond else b (conditional expression)',
    summary: 'The value of the **conditional expression** when the condition is falsy.',
    example: 'label = "item" if count == 1 else "items"',
    link: expr('conditional-expressions'),
  },
  for: {
    kind: 'keyword',
    summary: 'Loops over the items of any **iterable**: a list, tuple, string, dict (its keys), file (its lines), `range(...)`, a generator... The loop variable gets each item in turn.',
    details: 'There is no C-style `for (i = 0; ...)`: use `for i in range(n)`, and `for i, item in enumerate(items)` when you need the index too. The loop variable still exists after the loop.',
    example: 'for i, name in enumerate(names):\n    print(i, name)',
    link: compound('the-for-statement'),
  },
  'for_statement/in': {
    kind: 'keyword',
    title: 'in (for loop)',
    summary: 'Separates the loop variable(s) from the **iterable** to loop over. On the left you can unpack: `for key, value in d.items():`.',
    link: compound('the-for-statement'),
  },
  'for_in_clause/for': {
    kind: 'keyword',
    title: 'for (comprehension)',
    summary: 'The loop of a **comprehension**: the expression before it is computed for each item. Several `for` clauses nest like nested loops, outer one first.',
    example: 'squares = [n * n for n in range(5)]\npairs = [(x, y) for x in xs for y in ys]',
    link: tut('datastructures', 'list-comprehensions'),
  },
  'for_in_clause/in': {
    kind: 'keyword',
    title: 'in (comprehension)',
    summary: 'Separates the comprehension\'s loop variable from the iterable it loops over.',
    link: tut('datastructures', 'list-comprehensions'),
  },
  'if_clause/if': {
    kind: 'keyword',
    title: 'if (comprehension filter)',
    summary: 'A **filter** in a comprehension: only items for which the condition is truthy are kept.',
    example: 'evens = [n for n in numbers if n % 2 == 0]',
    link: tut('datastructures', 'list-comprehensions'),
  },
  while: {
    kind: 'keyword',
    summary: 'Repeats the indented block as long as the condition is truthy. The condition is checked **before** each pass.',
    details: 'Python has no `do ... while`; write `while True:` with a `break` instead.',
    example: 'while queue:\n    handle(queue.pop())',
    link: compound('the-while-statement'),
  },
  break: {
    kind: 'keyword',
    summary: 'Leaves the innermost `for` or `while` loop immediately. A loop\'s `else` block is skipped when the loop ends with `break`.',
    details: 'Python has no labelled break: to leave nested loops, move them into a function and `return`, or use a flag.',
    example: 'for line in lines:\n    if not line:\n        break\n    print(line)',
    link: simple('the-break-statement'),
  },
  continue: {
    kind: 'keyword',
    summary: 'Skips the rest of this iteration and goes on with the next one of the innermost `for` or `while` loop.',
    example: 'for n in numbers:\n    if n < 0:\n        continue\n    total += n',
    link: simple('the-continue-statement'),
  },
  try: {
    kind: 'keyword',
    summary: 'Runs the indented block and, if it **raises** an exception, jumps to the first matching `except` clause. Optional `else` runs when nothing was raised, and `finally` always runs at the end.',
    example: 'try:\n    value = int(text)\nexcept ValueError:\n    value = 0\nelse:\n    print("parsed")\nfinally:\n    print("done")',
    link: compound('the-try-statement'),
  },
  except: {
    kind: 'keyword',
    summary: 'Handles exceptions raised in the `try` block, if they match the given type (or one of a tuple of types). `as name` binds the exception object. The first matching clause wins.',
    details: 'A bare `except:` (or `except BaseException:`) also catches `KeyboardInterrupt` and `SystemExit`; catch `Exception` or something more specific instead.',
    example: 'except (KeyError, IndexError) as error:\n    print("lookup failed:", error)',
    link: compound('except-clause'),
  },
  'except_clause/*': {
    kind: 'operator',
    title: 'except* (exception group)',
    summary: 'Handles the matching exceptions inside an **ExceptionGroup** (several exceptions raised together, e.g. by `asyncio.TaskGroup`). Several `except*` clauses can each handle their part of the group. Python 3.11+.',
    example: 'try:\n    async with asyncio.TaskGroup() as tg:\n        ...\nexcept* ConnectionError as group:\n    print(group.exceptions)',
    link: compound('except-star'),
  },
  finally: {
    kind: 'keyword',
    summary: 'A block that **always** runs when leaving the `try` statement: after success, after an exception (handled or not), even after `return` or `break`. Used for cleanup.',
    details: 'For files, locks and connections a `with` statement is usually simpler.',
    link: compound('finally-clause'),
  },
  raise: {
    kind: 'keyword',
    summary: 'Raises an **exception**: execution stops and jumps to the nearest `except` that matches. Uncaught, it ends the program with a traceback. A bare `raise` inside `except` re-raises the exception being handled.',
    example: 'if age < 0:\n    raise ValueError(f"age must be >= 0, got {age}")',
    link: simple('the-raise-statement'),
  },
  'raise_statement/from': {
    kind: 'keyword',
    title: 'raise ... from (exception chaining)',
    summary: '**Chains** exceptions: `raise New() from original` records `original` as the direct cause (`__cause__`), and the traceback shows both. `from None` hides the original context.',
    example: 'try:\n    port = int(text)\nexcept ValueError as error:\n    raise ConfigError("bad port") from error',
    link: simple('the-raise-statement'),
  },
  with: {
    kind: 'keyword',
    summary: 'Uses a **context manager**: sets something up, runs the block, and always cleans up afterwards, even if an exception is raised. `as name` binds what the setup returns.',
    details: 'The classic use is files: they are closed when the block ends. Locks, database transactions and temporary settings work the same way. Several managers can share one `with`.',
    example: 'with open("data.txt") as file:\n    text = file.read()\n# the file is closed here',
    link: compound('the-with-statement'),
  },
  match: {
    kind: 'keyword',
    summary: '**Structural pattern matching** (Python 3.10+): compares a value against the `case` patterns in order and runs the first that matches. Patterns can check shapes (lists, dicts, classes) and bind names.',
    details: '`match` is a *soft keyword*: outside this statement it can still be used as a normal name.',
    example: 'match command.split():\n    case ["go", direction]:\n        move(direction)\n    case ["quit"]:\n        stop()\n    case _:\n        print("unknown command")',
    link: compound('the-match-statement'),
  },
  case: {
    kind: 'keyword',
    summary: 'One branch of a `match`: a **pattern** (and an optional `if` guard). It runs when the subject matches; names in the pattern are bound to the matching parts. There is no fall-through.',
    details: 'A bare name like `case x:` matches **anything** and binds it; to compare against a constant, use a dotted name (`case Color.RED:`) or a literal.',
    example: 'case Point(x=0, y=y):\n    print(f"on the y axis at {y}")',
    link: compound('the-match-statement'),
  },
  'case_clause/if': {
    kind: 'keyword',
    title: 'if (guard)',
    summary: 'A **guard**: the `case` only matches if the pattern matches *and* this condition is truthy. Names bound by the pattern can be used in it.',
    example: 'case Point(x=x, y=y) if x == y:\n    print("on the diagonal")',
    link: compound('guards'),
  },
  'case_pattern/_': {
    kind: 'keyword',
    title: '_ (wildcard pattern)',
    summary: 'The **wildcard**: matches anything and binds nothing. `case _:` at the end is the default branch.',
    link: compound('wildcard-patterns'),
  },

  // ------------------------------------------------------------------ imports
  import: {
    kind: 'keyword',
    summary: 'Loads a **module** (once; later imports reuse it) and binds its name here. Use its contents as `module.name`.',
    details: '`import a.b` binds `a`; `import numpy as np` binds the shorter name `np`. Python looks for modules in the standard library, installed packages and the script\'s folder (`sys.path`).',
    example: 'import os\nimport collections.abc\nimport numpy as np',
    link: simple('the-import-statement'),
  },
  'import_from_statement/from': {
    kind: 'keyword',
    title: 'from ... import',
    summary: 'Imports **names from inside** a module, so you can use them without the module prefix. Leading dots are relative imports from the current package (`from . import utils`).',
    details: '`from module import *` imports every public name; avoid it outside the interactive prompt, since it hides where names come from.',
    example: 'from pathlib import Path\nfrom .models import User as UserModel',
    link: simple('the-import-statement'),
  },
  'import_from_statement/import': {
    kind: 'keyword',
    title: 'from ... import',
    summary: 'Lists the names to import from the module named after `from`.',
    link: simple('the-import-statement'),
  },
  'future_import_statement/from': {
    kind: 'keyword',
    title: 'from __future__ import',
    summary: 'A **future statement**: turns on a language feature from a later Python version for this file. It must come at the top of the file (after the docstring).',
    details: '`from __future__ import annotations` makes all type hints lazy strings, so they may refer to classes defined later in the file.',
    link: simple('future-statements'),
  },
  'future_import_statement/import': {
    kind: 'keyword',
    title: 'from __future__ import',
    summary: 'Names the future feature(s) to enable for this file.',
    link: simple('future-statements'),
  },
  'future_import_statement/__future__': {
    kind: 'keyword',
    title: '__future__',
    summary: 'The special `__future__` module: importing from it enables newer language behaviour (like `annotations`) in this file.',
    link: `${DOCS}/library/__future__.html`,
  },
  'aliased_import/as': {
    kind: 'keyword',
    title: 'as (import alias)',
    summary: 'Gives the imported module or name a **different local name**: `import numpy as np` lets you write `np.array`.',
    example: 'import matplotlib.pyplot as plt\nfrom datetime import datetime as dt',
    link: simple('the-import-statement'),
  },
  'wildcard_import/*': {
    kind: 'operator',
    title: 'from ... import * (wildcard import)',
    summary: 'Imports **every public name** of the module (those not starting with `_`, or the ones listed in its `__all__`). Discouraged: readers and tools can no longer tell where a name comes from.',
    link: simple('the-import-statement'),
  },
  'import_prefix/.': {
    kind: 'syntax',
    title: '. (relative import)',
    summary: 'A **relative import**: `.` is the current package, `..` its parent package. Only works inside a package, not in a script run directly.',
    example: 'from . import utils\nfrom ..core import config',
    link: `${REF}/import.html#package-relative-imports`,
  },
  'dotted_name/.': {
    kind: 'syntax',
    title: '. (dotted name)',
    summary: 'Separates the parts of a **dotted name**: a module inside a package (`os.path`), or a value pattern in a `case` (`Color.RED`).',
    link: simple('the-import-statement'),
  },

  // ------------------------------------------------------------- operator words
  'boolean_operator/and': {
    kind: 'operator',
    title: 'and',
    summary: '`a and b` is true only if both are truthy. It **short-circuits** and returns one of the operands: `a` if it is falsy (then `b` is not evaluated), otherwise `b`.',
    example: 'if user and user.is_admin:\n    show_panel()',
    link: expr('boolean-operations'),
  },
  'boolean_operator/or': {
    kind: 'operator',
    title: 'or',
    summary: '`a or b` is true if either is truthy. It **short-circuits** and returns one of the operands: `a` if it is truthy, otherwise `b`. Handy for defaults: `name or "anonymous"`.',
    details: 'Gotcha: `x == 1 or 2` is always true, because it means `(x == 1) or 2`. Write `x in (1, 2)`.',
    link: expr('boolean-operations'),
  },
  'not_operator/not': {
    kind: 'operator',
    title: 'not',
    summary: 'Logical NOT: `not x` is `True` if `x` is falsy, `False` otherwise. `not items` is a common way to test for an empty list.',
    link: expr('boolean-operations'),
  },
  'comparison_operator/in': {
    kind: 'operator',
    title: 'in (membership)',
    summary: '`x in c` is `True` if `c` **contains** `x`: an item of a list or tuple, a key of a dict, a substring of a string, a member of a set.',
    details: 'Fast for sets and dicts; on lists it checks the items one by one.',
    example: 'if key in config:\n    ...\nif "@" in email:\n    ...',
    link: expr('membership-test-operations'),
  },
  'not in/not': {
    kind: 'operator',
    title: 'not in',
    summary: '`x not in c` is `True` if `c` does **not** contain `x`: the opposite of `in`. Reads better than `not x in c`.',
    link: expr('membership-test-operations'),
  },
  'not in/in': {
    kind: 'operator',
    title: 'not in',
    summary: '`x not in c` is `True` if `c` does **not** contain `x`: the opposite of `in`.',
    link: expr('membership-test-operations'),
  },
  'comparison_operator/is': {
    kind: 'operator',
    title: 'is (identity)',
    summary: '`a is b` is `True` if both names refer to the **very same object**, not just equal values. Use it for `None`: `if result is None:`.',
    details: 'Gotcha: don\'t use `is` to compare numbers or strings; `==` compares values. Two equal lists are `==` but usually not `is`.',
    link: expr('is-not'),
  },
  'is not/is': {
    kind: 'operator',
    title: 'is not',
    summary: '`a is not b` is `True` if they are **different objects**. The usual way to write "is not None".',
    example: 'if result is not None:\n    use(result)',
    link: expr('is-not'),
  },
  'is not/not': {
    kind: 'operator',
    title: 'is not',
    summary: '`a is not b` is `True` if they are **different objects**. The usual way to write "is not None".',
    link: expr('is-not'),
  },
  '<>': {
    kind: 'operator',
    title: '<> (old not-equal)',
    summary: 'Python 2\'s spelling of `!=`. It is a syntax error in Python 3; write `!=`.',
    link: expr('comparisons'),
  },

  // ------------------------------------------------------------ operators
  'binary_operator/**': {
    kind: 'operator',
    title: '** (power)',
    summary: '`a ** b` is `a` to the power `b`: `2 ** 10` is `1024`. A negative or fractional exponent gives a float: `2 ** -1` is `0.5`, `9 ** 0.5` is `3.0`.',
    details: 'It binds tighter than a unary minus on its left: `-2 ** 2` is `-4`. (`^` is XOR, not power.)',
    link: expr('the-power-operator'),
  },
  'binary_operator///': {
    kind: 'operator',
    title: '// (floor division)',
    summary: 'Divides and rounds **down** to a whole number: `7 // 2` is `3`. With negative numbers it still rounds down: `-7 // 2` is `-4`. With a float operand the result is a float (`7.0 // 2` is `3.0`).',
    details: '`divmod(a, b)` gives `(a // b, a % b)` in one go.',
    link: expr('binary-arithmetic-operations'),
  },
  'binary_operator/@': {
    kind: 'operator',
    title: '@ (matrix multiplication)',
    summary: '`a @ b` is **matrix multiplication**. Built-in types don\'t support it; it is for libraries like NumPy (`a @ b` instead of `np.matmul(a, b)`), which implement `__matmul__`.',
    example: 'import numpy as np\nresult = weights @ inputs',
    link: expr('binary-arithmetic-operations'),
  },
  'decorator/@': {
    kind: 'syntax',
    title: '@decorator',
    summary: 'A **decorator**: `@deco` above a `def` or `class` passes it through `deco` and binds the result to the same name. It is short for `f = deco(f)` written after the definition.',
    details: 'Decorators add behaviour without changing the function body: `@property`, `@staticmethod`, `@functools.cache`, `@dataclass`, or route registration in web frameworks. Several decorators apply bottom-up.',
    example: '@functools.cache\ndef fib(n):\n    return n if n < 2 else fib(n - 1) + fib(n - 2)',
    link: `${DOCS}/glossary.html#term-decorator`,
  },
  'named_expression/:=': {
    kind: 'operator',
    title: ':= (walrus operator)',
    summary: 'An **assignment expression** (Python 3.8+): assigns a value to a name *and* gives that value, so you can assign inside a condition or comprehension.',
    example: 'if (n := len(items)) > 10:\n    print(f"too many items: {n}")\nwhile (line := file.readline()):\n    handle(line)',
    link: expr('assignment-expressions'),
  },
  'function_definition/->': {
    kind: 'syntax',
    title: '-> (return annotation)',
    summary: 'A **return type hint**: says what type the function returns. Python itself does not check it; type checkers (mypy, pyright) and editors use it.',
    example: 'def parse(text: str) -> int | None:\n    ...',
    link: `${DOCS}/library/typing.html`,
  },
  'unary_operator/-': {
    kind: 'operator',
    title: '- (negation)',
    summary: 'Negates a number: `-x`.',
    link: expr('unary-arithmetic-and-bitwise-operations'),
  },
  'unary_operator/+': {
    kind: 'operator',
    title: '+ (unary plus)',
    summary: 'Leaves a number unchanged: `+x`. Rarely needed.',
    link: expr('unary-arithmetic-and-bitwise-operations'),
  },
  'union_pattern/|': {
    kind: 'operator',
    title: '| (or-pattern)',
    summary: 'An **or-pattern** in a `case`: matches if any of the alternatives matches.',
    example: 'case "y" | "yes":\n    confirm()',
    link: compound('or-patterns'),
  },
  'union_type/|': {
    kind: 'operator',
    title: '| (union type)',
    summary: 'In a type hint, `A | B` means "an `A` or a `B`". `str | None` is an optional string.',
    link: `${DOCS}/builtins/stdtypes.html#types-union`,
  },
  'chevron/>>': {
    kind: 'operator',
    title: 'print >> file (Python 2)',
    summary: 'Python 2\'s `print >> file, value` printed to a file. In Python 3 `print` is a function: `print(value, file=file)`.',
    link: fn('print'),
  },
  '\\': {
    kind: 'syntax',
    title: '\\ (line continuation)',
    summary: 'A backslash at the very end of a line joins the next line to it, so a long statement can span lines. Inside `( )`, `[ ]` or `{ }` lines join automatically, which is the preferred style.',
    link: lex('explicit-line-joining'),
  },
  '#line_continuation': {
    kind: 'syntax',
    title: '\\ (line continuation)',
    summary: 'A backslash at the very end of a line joins the next line to it, so a long statement can span lines. Inside `( )`, `[ ]` or `{ }` lines join automatically, which is the preferred style.',
    details: 'Gotcha: nothing may follow the backslash, not even a space or a comment.',
    link: lex('explicit-line-joining'),
  },
  'attribute/.': {
    kind: 'operator',
    title: '. (attribute access)',
    summary: '`obj.name` reads the attribute `name` of `obj`: a field, a method, or a name inside a module (`os.path`). A missing attribute raises `AttributeError`; `getattr(obj, "name", default)` avoids that.',
    link: expr('attribute-references'),
  },
  'expression_list/,': {
    kind: 'syntax',
    title: ', (tuple)',
    summary: 'Commas without brackets make a **tuple**: `return a, b` returns one tuple of two values, which the caller can unpack: `x, y = f()`.',
    link: `${DOCS}/builtins/stdtypes.html#tuples`,
  },
  'pattern_list/,': {
    kind: 'syntax',
    title: ', (unpacking)',
    summary: '**Unpacking**: the value on the right is split over the names on the left, one item each. `a, b = b, a` swaps two variables.',
    example: 'name, age = ("Ann", 31)\nfor key, value in d.items():\n    ...',
    link: tut('datastructures', 'tuples-and-sequences'),
  },
  'subscript/[': {
    kind: 'syntax',
    title: 'x[i] (subscript)',
    summary: '**Indexing**: `items[0]` is the first item, `items[-1]` the last; `d[key]` looks up a dict key. With `:` inside it is a **slice**. A missing index or key raises `IndexError`/`KeyError`.',
    example: 'first = items[0]\nlast = items[-1]\nage = ages["ann"]',
    link: expr('subscriptions'),
  },
  'slice/:': {
    kind: 'syntax',
    title: 'start:stop:step (slice)',
    summary: 'A **slice**: the items from `start` up to (not including) `stop`, every `step`-th one. Each part may be left out: `xs[:3]` the first three, `xs[-2:]` the last two, `xs[::-1]` reversed. Slicing makes a copy.',
    example: 'text[1:4]\nitems[::2]   # every other item\nitems[::-1]  # reversed copy',
    link: tut('introduction', 'text'),
  },
  'pair/:': {
    kind: 'syntax',
    title: 'key: value',
    summary: 'One entry of a **dict**: the key before the colon maps to the value after it.',
    link: tut('datastructures', 'dictionaries'),
  },
  'dict_pattern/:': {
    kind: 'syntax',
    title: 'key: pattern (mapping pattern)',
    summary: 'In a mapping pattern, the value under this key must match the pattern after the colon. Extra keys are ignored.',
    link: compound('mapping-patterns'),
  },
  'typed_parameter/:': {
    kind: 'syntax',
    title: ': (type hint)',
    summary: 'A **type hint** for the parameter. Python does not check it at runtime; type checkers and editors use it.',
    link: tut('controlflow', 'function-annotations'),
  },
  'typed_default_parameter/:': {
    kind: 'syntax',
    title: ': (type hint)',
    summary: 'A **type hint** for the parameter (which also has a default value). Python does not check it at runtime; type checkers and editors use it.',
    link: tut('controlflow', 'function-annotations'),
  },
  'assignment/:': {
    kind: 'syntax',
    title: 'name: type (annotation)',
    summary: 'A **variable annotation**: gives the variable a type hint. With `= value` it also assigns; without, it only declares the hint (in a class body, e.g. a `@dataclass`, that declares a field).',
    example: 'count: int = 0\nnames: list[str] = []',
    link: simple('annotated-assignment-statements'),
  },
  'lambda/:': {
    kind: 'syntax',
    title: ': (lambda body)',
    summary: 'Separates a lambda\'s parameters from its body: the single expression whose value the lambda returns.',
    link: expr('lambda'),
  },
  'format_specifier/:': {
    kind: 'syntax',
    title: '{value:spec} (format spec)',
    summary: 'A **format specification** in an f-string: how to format the value. `:.2f` two decimals, `:>10` right-aligned in 10 characters, `:,` thousands separators, `:08b` binary padded with zeros.',
    example: 'f"{price:.2f}"     # 3.14\nf"{name:>10}"     # right-aligned\nf"{count:,}"      # 1,000,000',
    link: `${DOCS}/library/string.html#formatspec`,
  },
  'interpolation/{': {
    kind: 'syntax',
    title: '{ } (f-string replacement field)',
    summary: 'Inside an f-string, `{expression}` is replaced by the value of the expression. Add `!r` for `repr()`, `:spec` to format it, or `=` to also show the expression (`{x=}` gives `x=42`).',
    example: 'f"{user.name} is {age} years old"\nf"{total:.2f} {x=}"',
    link: lex('f-strings'),
  },
  'interpolation/}': {
    kind: 'syntax',
    title: '{ } (f-string replacement field)',
    summary: 'End of a replacement field in an f-string.',
    link: lex('f-strings'),
  },
  'interpolation/=': {
    kind: 'syntax',
    title: '{expr=} (self-documenting)',
    summary: 'Shows the expression text **and** its value: `f"{x=}"` gives `x=42`. Handy for debug prints.',
    link: lex('f-strings'),
  },
  'format_expression/{': {
    kind: 'syntax',
    title: '{ } (nested format field)',
    summary: 'A replacement field inside a format spec: the spec itself is computed, e.g. `f"{value:>{width}}"`.',
    link: lex('f-strings'),
  },
  '#type_conversion': {
    kind: 'syntax',
    title: '!r / !s / !a (conversion)',
    summary: 'Converts the value before formatting: `!r` uses `repr()` (strings get quotes, handy for debugging), `!s` uses `str()`, `!a` uses `ascii()`.',
    example: 'f"{name!r}"  # \'Ann\' with quotes',
    link: lex('f-strings'),
  },
  '#escape_interpolation': {
    kind: 'literal',
    title: '{{ }} (literal brace)',
    summary: 'A doubled brace in an f-string (or `str.format`) is a literal `{` or `}`, not a replacement field.',
    example: 'f"{{not replaced}} {value}"',
    link: lex('f-strings'),
  },
  '#escape_sequence': {
    kind: 'literal',
    title: '\\ escape sequence',
    summary: 'An **escape sequence** stands for a special character: `\\n` newline, `\\t` tab, `\\\\` backslash, `\\"` quote, `\\x41` / `\\u00e9` a character by its code. In a raw string (`r"..."`) backslashes are kept as they are.',
    link: lex('escape-sequences'),
  },

  // ----------------------------------------------------- unpacking and parameters
  'keyword_separator/*': {
    kind: 'syntax',
    title: '* (keyword-only marker)',
    summary: 'A bare `*` in a parameter list: every parameter **after** it is **keyword-only**, so callers must name it: `f(1, strict=True)`. This keeps calls readable and lets you add parameters later.',
    example: 'def connect(host, *, timeout=10, retries=3):\n    ...\n\nconnect("db", timeout=5)',
    link: tut('controlflow', 'special-parameters'),
  },
  'positional_separator//': {
    kind: 'syntax',
    title: '/ (positional-only marker)',
    summary: 'A `/` in a parameter list: every parameter **before** it is **positional-only**, so callers can\'t pass it by name. Python 3.8+.',
    example: 'def power(base, exp, /):\n    ...\n\npower(2, 10)        # fine\n# power(base=2, exp=10)  # TypeError',
    link: tut('controlflow', 'special-parameters'),
  },
  'list_splat_pattern/*': {
    kind: 'operator',
    title: '*args (variadic positional parameter)',
    summary: 'Collects any number of **extra positional arguments** into a tuple. `args` is only the conventional name.',
    example: 'def total(*numbers):\n    return sum(numbers)\n\ntotal(1, 2, 3)  # numbers == (1, 2, 3)',
    link: tut('controlflow', 'arbitrary-argument-lists'),
  },
  'dictionary_splat_pattern/**': {
    kind: 'operator',
    title: '**kwargs (variadic keyword parameter)',
    summary: 'Collects any number of **extra keyword arguments** into a dict, by name. `kwargs` is only the conventional name.',
    example: 'def tag(name, **attributes):\n    ...\n\ntag("a", href="/", title="Home")  # attributes == {"href": "/", "title": "Home"}',
    link: tut('controlflow', 'keyword-arguments'),
  },
  'list_splat/*': {
    kind: 'operator',
    title: '* (unpacking)',
    summary: '**Unpacks** an iterable: its items are inserted one by one, as separate arguments of a call or as items of a list, tuple or set.',
    example: 'args = [1, 2]\nf(*args)            # f(1, 2)\nmerged = [*a, *b, 0]',
    link: tut('controlflow', 'unpacking-argument-lists'),
  },
  'dictionary_splat/**': {
    kind: 'operator',
    title: '** (dict unpacking)',
    summary: '**Unpacks** a dict: in a call its items become keyword arguments; in a dict literal they are copied in (later keys win).',
    example: 'options = {"sep": ", "}\nprint(*items, **options)\nmerged = {**defaults, **overrides}',
    link: tut('controlflow', 'unpacking-argument-lists'),
  },
  'parenthesized_list_splat/*': {
    kind: 'operator',
    title: '* (unpacking)',
    summary: '**Unpacks** an iterable into the surrounding tuple or argument list.',
    link: expr('expression-lists'),
  },
  'splat_pattern/*': {
    kind: 'operator',
    title: '*rest (star pattern)',
    summary: 'In a sequence pattern, `*name` matches **any number of remaining items** and binds them as a list (`*_` ignores them).',
    example: 'case [first, *rest]:\n    ...',
    link: compound('sequence-patterns'),
  },
  'splat_pattern/**': {
    kind: 'operator',
    title: '**rest (mapping rest)',
    summary: 'In a mapping pattern, `**name` collects the **other keys** of the dict into a new dict.',
    example: 'case {"type": "user", **fields}:\n    ...',
    link: compound('mapping-patterns'),
  },
  'splat_type/*': {
    kind: 'operator',
    title: '*Ts (unpacked type)',
    summary: 'In a type hint, `*Ts` unpacks a `TypeVarTuple` (variadic generics), and `*args: int` means "every extra argument is an `int`".',
    link: `${DOCS}/library/typing.html#typing.TypeVarTuple`,
  },
  'splat_type/**': {
    kind: 'operator',
    title: '**P (unpacked type)',
    summary: 'In a type hint, `**kwargs: Unpack[TD]` or `**P` refers to the keyword arguments of a `ParamSpec` or `TypedDict`.',
    link: `${DOCS}/library/typing.html#typing.ParamSpec`,
  },
  'default_parameter/=': {
    kind: 'operator',
    title: '= (default value)',
    summary: 'A **default value**, used when the caller leaves the argument out.',
    details: 'Gotcha: the default is created **once**, when the `def` runs. A mutable default (`items=[]`) is shared between calls; use `items=None` and create the list inside.',
    example: 'def greet(name="world"):\n    ...\n\ndef add(item, items=None):\n    items = [] if items is None else items',
    link: tut('controlflow', 'default-argument-values'),
  },
  'typed_default_parameter/=': {
    kind: 'operator',
    title: '= (default value)',
    summary: 'A **default value**, used when the caller leaves the argument out. Gotcha: it is created once, so don\'t use a mutable default like `[]`.',
    link: tut('controlflow', 'default-argument-values'),
  },
  'keyword_argument/=': {
    kind: 'operator',
    title: 'name=value (keyword argument)',
    summary: 'Passes an argument **by name** instead of by position, so the order doesn\'t matter and the call explains itself. Keyword arguments come after positional ones.',
    example: 'print("a", "b", sep=", ", end="")\nsorted(names, key=len, reverse=True)',
    link: tut('controlflow', 'keyword-arguments'),
  },
  'keyword_pattern/=': {
    kind: 'operator',
    title: 'attr=pattern (keyword pattern)',
    summary: 'In a class pattern, the object\'s attribute named on the left must match the pattern on the right.',
    example: 'case Point(x=0, y=y):\n    ...',
    link: compound('class-patterns'),
  },
  'type_alias_statement/=': {
    kind: 'syntax',
    title: 'type X = ... (type alias)',
    summary: 'Everything after `=` is the **type** the alias stands for. It is evaluated lazily, so it may refer to names defined later.',
    link: simple('the-type-statement'),
  },
  'print_statement/print': {
    kind: 'keyword',
    title: 'print (Python 2 statement)',
    summary: 'In **Python 2**, `print` was a statement: `print "hi"`. In Python 3 it is a function and needs parentheses: `print("hi")`.',
    link: fn('print'),
  },
  'exec_statement/exec': {
    kind: 'keyword',
    title: 'exec (Python 2 statement)',
    summary: 'In **Python 2**, `exec` was a statement. In Python 3 it is the function `exec(code)`.',
    link: fn('exec'),
  },

  // --------------------------------------------------------------- brackets
  'list/[': {
    kind: 'syntax',
    title: '[ ] (list)',
    summary: 'A **list**: an ordered, changeable sequence. Add with `append`, remove with `pop`/`remove`, index from 0, and negative indexes count from the end.',
    example: 'names = ["ann", "bob"]\nnames.append("cy")\nnames[-1]  # "cy"',
    link: tut('datastructures', 'more-on-lists'),
  },
  'dictionary/{': {
    kind: 'syntax',
    title: '{ } (dict)',
    summary: 'A **dict**: maps keys to values. Look up with `d[key]` (raises `KeyError` if missing) or `d.get(key, default)`. Keeps insertion order. `{}` is an empty dict, not a set.',
    example: 'ages = {"ann": 31, "bob": 25}\nages["cy"] = 40\nfor name, age in ages.items():\n    ...',
    link: tut('datastructures', 'dictionaries'),
  },
  'set/{': {
    kind: 'syntax',
    title: '{ } (set)',
    summary: 'A **set**: an unordered collection of **unique** values with fast `in` checks and set maths (`|`, `&`, `-`). An empty set is `set()`, because `{}` is a dict.',
    example: 'seen = {"a", "b"}\nseen.add("c")\nunique = set(items)',
    link: tut('datastructures', 'sets'),
  },
  'tuple/(': {
    kind: 'syntax',
    title: '( ) (tuple)',
    summary: 'A **tuple**: an ordered, **unchangeable** sequence, often used for a fixed group of values or to return several values. It is the comma that makes it: `(1,)` is a one-item tuple, `(1)` is just `1`.',
    example: 'point = (3, 4)\nx, y = point\nempty = ()',
    link: tut('datastructures', 'tuples-and-sequences'),
  },
  'list_comprehension/[': {
    kind: 'syntax',
    title: '[x for x in ...] (list comprehension)',
    summary: 'A **list comprehension**: builds a new list by computing the expression for each item of the loop, optionally filtered with `if`. A compact replacement for a `for` loop with `append`.',
    example: 'squares = [n * n for n in range(10)]\nnames = [u.name for u in users if u.active]',
    link: tut('datastructures', 'list-comprehensions'),
  },
  'dictionary_comprehension/{': {
    kind: 'syntax',
    title: '{k: v for ...} (dict comprehension)',
    summary: 'A **dict comprehension**: builds a dict with a `key: value` pair for each item of the loop.',
    example: 'lengths = {word: len(word) for word in words}',
    link: tut('datastructures', 'dictionaries'),
  },
  'set_comprehension/{': {
    kind: 'syntax',
    title: '{x for x in ...} (set comprehension)',
    summary: 'A **set comprehension**: builds a set (so duplicates disappear) from the expression for each item of the loop.',
    example: 'domains = {email.split("@")[1] for email in emails}',
    link: tut('datastructures', 'sets'),
  },
  'generator_expression/(': {
    kind: 'syntax',
    title: '(x for x in ...) (generator expression)',
    summary: 'A **generator expression**: like a list comprehension, but **lazy**: items are computed one at a time when something iterates over it, without building a list. As the only argument of a call it needs no extra parentheses: `sum(x * x for x in xs)`.',
    details: 'A generator can only be iterated once.',
    example: 'total = sum(price * qty for price, qty in lines)',
    link: expr('generator-expressions'),
  },
  'type_parameter/[': {
    kind: 'syntax',
    title: '[T] (type parameters / arguments)',
    summary: 'Square brackets in a type: **type arguments** of a generic type (`list[int]`, `dict[str, float]`), or the **type parameters** of a generic function, class or alias (`def first[T](xs: list[T]) -> T`, Python 3.12+).',
    link: `${DOCS}/library/typing.html#generics`,
  },

  'list_pattern/[': {
    kind: 'syntax',
    title: '[ ] (sequence pattern)',
    summary: 'A **sequence pattern**: matches a list or tuple (not a string) with exactly these items, each matched by its own pattern. `*rest` allows any number of extra items.',
    example: 'case [x, y]:\n    ...\ncase [first, *rest]:\n    ...',
    link: compound('sequence-patterns'),
  },
  'dict_pattern/{': {
    kind: 'syntax',
    title: '{ } (mapping pattern)',
    summary: 'A **mapping pattern**: matches a dict that has these keys, with values matching their patterns. Other keys are allowed (collect them with `**rest`).',
    example: 'case {"action": "move", "to": target}:\n    ...',
    link: compound('mapping-patterns'),
  },
  'class_pattern/(': {
    kind: 'syntax',
    title: 'Class(...) (class pattern)',
    summary: 'A **class pattern**: matches instances of the class (an `isinstance` check), then matches attributes: `Point(x=0)` needs `point.x == 0`. It does not call the class.',
    example: 'case Point(x=0, y=y):\n    ...\ncase str():\n    ...',
    link: compound('class-patterns'),
  },

  // ---------------------------------------------------------------- literals
  '#true': { kind: 'value', title: 'True', summary: 'The boolean value true. `bool` is a subclass of `int`, so `True == 1` (and `sum(flags)` counts the true ones).', link: constant('True') },
  '#false': { kind: 'value', title: 'False', summary: 'The boolean value false. Note that `None`, `0`, `""` and empty collections are also *falsy* in conditions.', link: constant('False') },
  '#none': {
    kind: 'value',
    title: 'None',
    summary: '**No value**: what a function returns without a `return`, and the usual "missing" or "not set yet" marker. There is exactly one `None` object.',
    details: 'Test for it with `is`: `if x is None:` (not `== None`).',
    example: 'def find(name):\n    for user in users:\n        if user.name == name:\n            return user\n    return None',
    link: constant('None'),
  },
  '#ellipsis': {
    kind: 'value',
    title: '... (Ellipsis)',
    summary: 'The `Ellipsis` object. Mostly used as a placeholder body (`def todo(): ...`), in type hints (`tuple[int, ...]`) and in NumPy slicing (`array[..., 0]`).',
    link: constant('Ellipsis'),
  },
  '#integer': {
    kind: 'literal',
    title: 'integer literal',
    summary: 'An **integer** (`int`). Python integers have no size limit: `2 ** 100` just works. Underscores group digits for readability: `1_000_000`.',
    link: lex('integer-literals'),
  },
  '#float': {
    kind: 'literal',
    title: 'float literal',
    summary: 'A **floating-point** number (`float`, 64-bit). `2.5e3` means 2.5 × 10³. Floats are approximate: `0.1 + 0.2 == 0.3` is `False`; use `math.isclose` or `decimal.Decimal`.',
    link: lex('floating-point-literals'),
  },

  // -------------------------------------------------------------- built-ins
  print: {
    kind: 'function',
    summary: 'Writes values to the console (stdout), separated by spaces and followed by a newline. `sep=` changes the separator, `end=` the ending, `file=` the destination.',
    example: 'print("total:", total)\nprint(*items, sep=", ")\nprint("error", file=sys.stderr)',
    link: fn('print'),
  },
  len: { kind: 'function', summary: 'The number of items in a list, tuple, dict, set or string (in characters). Calls the object\'s `__len__`.', example: 'len([1, 2, 3])  # 3\nlen("héllo")    # 5', link: fn('len') },
  range: {
    kind: 'type',
    summary: 'A lazy sequence of integers: `range(5)` is 0 to 4, `range(2, 10, 2)` is 2, 4, 6, 8. The stop value is never included. The usual way to loop a number of times.',
    example: 'for i in range(3):\n    print(i)  # 0, 1, 2',
    link: fn('func-range'),
  },
  enumerate: { kind: 'function', summary: 'Pairs each item with its index: `(0, first), (1, second), ...`. `start=1` counts from 1. Use it instead of `range(len(items))`.', example: 'for i, name in enumerate(names, start=1):\n    print(i, name)', link: fn('enumerate') },
  zip: { kind: 'function', summary: 'Loops over several iterables **in parallel**, giving tuples of their items. Stops at the shortest one (`strict=True` makes unequal lengths an error).', example: 'for name, age in zip(names, ages):\n    print(name, age)', link: fn('zip') },
  map: { kind: 'function', summary: 'Applies a function to every item, lazily. A comprehension is often clearer: `[f(x) for x in xs]`.', example: 'numbers = list(map(int, ["1", "2"]))', link: fn('map') },
  filter: { kind: 'function', summary: 'Keeps the items for which the function returns a truthy value, lazily. `filter(None, xs)` drops falsy items. A comprehension with `if` is often clearer.', link: fn('filter') },
  sorted: { kind: 'function', summary: 'Returns a **new** sorted list from any iterable. `key=` gives a function to sort by, `reverse=True` sorts descending. (`list.sort()` sorts in place instead.)', example: 'sorted(words, key=len, reverse=True)', link: fn('sorted') },
  reversed: { kind: 'function', summary: 'Iterates over a sequence backwards, lazily. For a reversed list copy use `xs[::-1]`.', link: fn('reversed') },
  sum: { kind: 'function', summary: 'Adds up the numbers of an iterable; `start=` gives the initial value.', example: 'sum(prices)\nsum(x * x for x in xs)', link: fn('sum') },
  min: { kind: 'function', summary: 'The smallest item of an iterable, or of several arguments. `key=` compares by a function; `default=` avoids an error on an empty iterable.', example: 'min(3, 1, 2)          # 1\nmin(users, key=lambda u: u.age)', link: fn('min') },
  max: { kind: 'function', summary: 'The largest item of an iterable, or of several arguments. `key=` compares by a function; `default=` avoids an error on an empty iterable.', link: fn('max') },
  abs: { kind: 'function', summary: 'The absolute value of a number: `abs(-3)` is `3`.', link: fn('abs') },
  round: { kind: 'function', summary: 'Rounds a number to `ndigits` decimals (default: to an integer). Gotcha: halves round to the nearest **even** number: `round(2.5)` is `2`.', link: fn('round') },
  divmod: { kind: 'function', summary: '`divmod(a, b)` gives `(a // b, a % b)`: quotient and remainder at once.', link: fn('divmod') },
  pow: { kind: 'function', summary: '`pow(a, b)` is `a ** b`; `pow(a, b, m)` computes it modulo `m` efficiently.', link: fn('pow') },
  isinstance: { kind: 'function', summary: 'Checks whether a value is an instance of a class (or of a subclass), or of one of a tuple of classes. Prefer it to `type(x) == C`.', example: 'if isinstance(value, (int, float)):\n    ...', link: fn('isinstance') },
  issubclass: { kind: 'function', summary: 'Checks whether a class is a subclass of another class.', link: fn('issubclass') },
  type: {
    kind: 'type',
    summary: '`type(x)` gives the **class** of a value: `type(3)` is `int`. (To check a type, `isinstance` is usually better.) Called with three arguments it creates a new class.',
    link: fn('type'),
  },
  int: { kind: 'type', summary: 'The integer type, without size limit. `int("42")` parses a string, `int(3.9)` truncates to `3`, `int("ff", 16)` reads hex.', link: fn('int') },
  float: { kind: 'type', summary: 'The floating-point type (64-bit). `float("3.5")` parses a string; `float("inf")` and `float("nan")` are special values.', link: fn('float') },
  complex: { kind: 'type', summary: 'Complex numbers: `complex(1, 2)` is `1+2j`.', link: fn('complex') },
  bool: { kind: 'type', summary: 'The boolean type: `True` or `False`. `bool(x)` tells whether `x` is truthy.', link: fn('bool') },
  str: { kind: 'type', summary: 'The **string** type: immutable Unicode text. `str(x)` converts a value to text. Methods include `split`, `join`, `strip`, `replace`, `startswith`, `upper`, `format`.', example: 'str(42)               # "42"\n", ".join(["a", "b"])  # "a, b"', link: fn('func-str') },
  bytes: { kind: 'type', summary: 'An immutable sequence of bytes (0–255): binary data. Convert with `text.encode()` and `data.decode()`.', link: fn('func-bytes') },
  bytearray: { kind: 'type', summary: 'A changeable sequence of bytes.', link: fn('func-bytearray') },
  list: { kind: 'type', summary: 'The **list** type: an ordered, changeable sequence. `list(iterable)` makes a list from any iterable (and copies a list).', example: 'list("abc")       # ["a", "b", "c"]\nlist(range(3))    # [0, 1, 2]', link: fn('func-list') },
  dict: { kind: 'type', summary: 'The **dict** type: maps keys to values. `dict(a=1, b=2)` or `dict(pairs)` build one.', link: fn('func-dict') },
  set: { kind: 'type', summary: 'The **set** type: unique values without order. `set()` is an empty set; `set(items)` removes duplicates.', link: fn('func-set') },
  frozenset: { kind: 'type', summary: 'An immutable set, so it can be a dict key or a set member.', link: fn('func-frozenset') },
  tuple: { kind: 'type', summary: 'The **tuple** type: an ordered, unchangeable sequence. In type hints, `tuple[int, str]` is a pair and `tuple[int, ...]` any length.', link: fn('func-tuple') },
  object: { kind: 'type', summary: 'The base class of every class. `class A(object):` is the same as `class A:` in Python 3.', link: fn('object') },
  open: {
    kind: 'function',
    summary: 'Opens a file and returns a file object. Mode `"r"` reads (default), `"w"` overwrites, `"a"` appends, add `"b"` for binary. Use it in a `with` block so the file gets closed.',
    details: 'Pass `encoding="utf-8"` for text files: the default depends on the operating system.',
    example: 'with open("notes.txt", encoding="utf-8") as file:\n    for line in file:\n        print(line.rstrip())',
    link: fn('open'),
  },
  input: { kind: 'function', summary: 'Shows a prompt, waits for the user to type a line and returns it as a string (without the newline). Convert numbers yourself: `int(input("Age? "))`.', link: fn('input') },
  super: {
    kind: 'function',
    summary: '`super()` gives access to the **parent class**: `super().__init__(...)` runs the parent\'s initializer, `super().method()` its version of an overridden method.',
    example: 'class Dog(Animal):\n    def __init__(self, name):\n        super().__init__(name)\n        self.tricks = []',
    link: fn('super'),
  },
  iter: { kind: 'function', summary: 'Gets an iterator from an iterable; `next()` then takes items from it one by one.', link: fn('iter') },
  next: { kind: 'function', summary: 'Takes the next item from an iterator; raises `StopIteration` when it is exhausted, unless you pass a default: `next(it, None)`.', example: 'first_even = next((n for n in xs if n % 2 == 0), None)', link: fn('next') },
  any: { kind: 'function', summary: '`True` if at least one item is truthy (stops at the first one). `False` for an empty iterable.', example: 'if any(c.isdigit() for c in password):\n    ...', link: fn('any') },
  all: { kind: 'function', summary: '`True` if every item is truthy (stops at the first falsy one). `True` for an empty iterable.', link: fn('all') },
  hasattr: { kind: 'function', summary: 'Checks whether an object has an attribute with the given name.', link: fn('hasattr') },
  getattr: { kind: 'function', summary: 'Reads an attribute by name: `getattr(obj, "x")` is `obj.x`. A third argument is the default when it is missing.', link: fn('getattr') },
  setattr: { kind: 'function', summary: 'Sets an attribute by name: `setattr(obj, "x", 1)` is `obj.x = 1`.', link: fn('setattr') },
  delattr: { kind: 'function', summary: 'Deletes an attribute by name.', link: fn('delattr') },
  id: { kind: 'function', summary: 'A unique number for an object during its lifetime; `a is b` compares these.', link: fn('id') },
  hash: { kind: 'function', summary: 'The hash value of an object, used for dict keys and set members. Mutable built-ins (lists, dicts) are not hashable.', link: fn('hash') },
  repr: { kind: 'function', summary: 'A developer-oriented string for a value, ideally valid Python: `repr("a")` is `"\'a\'"`. Classes customize it with `__repr__`.', link: fn('repr') },
  format: { kind: 'function', summary: 'Formats a value with a format spec, as in f-strings: `format(3.14159, ".2f")` is `"3.14"`.', link: fn('format') },
  ord: { kind: 'function', summary: 'The Unicode code point of a one-character string: `ord("A")` is `65`.', link: fn('ord') },
  chr: { kind: 'function', summary: 'The character for a Unicode code point: `chr(65)` is `"A"`.', link: fn('chr') },
  bin: { kind: 'function', summary: 'An integer as a binary string: `bin(5)` is `"0b101"`.', link: fn('bin') },
  hex: { kind: 'function', summary: 'An integer as a hexadecimal string: `hex(255)` is `"0xff"`.', link: fn('hex') },
  oct: { kind: 'function', summary: 'An integer as an octal string: `oct(8)` is `"0o10"`.', link: fn('oct') },
  callable: { kind: 'function', summary: 'Checks whether a value can be called like a function.', link: fn('callable') },
  vars: { kind: 'function', summary: 'The `__dict__` of an object: its attributes as a dict.', link: fn('vars') },
  dir: { kind: 'function', summary: 'Lists the attribute names of an object: handy at the interactive prompt.', link: fn('dir') },
  help: { kind: 'function', summary: 'Shows the documentation (docstrings) of an object at the interactive prompt.', link: fn('help') },
  globals: { kind: 'function', summary: 'The dict of the current module\'s global variables.', link: fn('globals') },
  locals: { kind: 'function', summary: 'A dict of the current local variables.', link: fn('locals') },
  property: {
    kind: 'type',
    summary: 'As a decorator (`@property`), turns a method into an attribute that is **computed when read**: callers write `obj.area`, without parentheses. `@area.setter` adds code that runs on assignment.',
    example: 'class Circle:\n    @property\n    def area(self):\n        return 3.14159 * self.r ** 2',
    link: fn('property'),
  },
  staticmethod: { kind: 'type', summary: 'As a decorator (`@staticmethod`), makes a method that gets **no** `self` or `cls`: a plain function that lives in the class namespace.', link: fn('staticmethod') },
  classmethod: {
    kind: 'type',
    summary: 'As a decorator (`@classmethod`), makes the method receive the **class** (`cls`) instead of an instance. Typical use: alternative constructors like `Date.from_string(...)`.',
    example: 'class Point:\n    @classmethod\n    def origin(cls):\n        return cls(0, 0)',
    link: fn('classmethod'),
  },
  slice: { kind: 'type', summary: 'A slice object: `xs[slice(1, 3)]` is `xs[1:3]`.', link: fn('slice') },
  memoryview: { kind: 'type', summary: 'A view on the memory of a bytes-like object, without copying.', link: fn('func-memoryview') },
  exec: { kind: 'function', summary: 'Runs a string of Python code. Avoid it with untrusted input: it can do anything.', link: fn('exec') },
  eval: { kind: 'function', summary: 'Evaluates a string as a Python expression and returns the value. Never use it on untrusted input; for literals use `ast.literal_eval`.', link: fn('eval') },
  compile: { kind: 'function', summary: 'Compiles source code into a code object for `exec` or `eval`.', link: fn('compile') },
  breakpoint: { kind: 'function', summary: 'Stops here and opens the debugger (`pdb` by default).', link: fn('breakpoint') },
  ascii: { kind: 'function', summary: 'Like `repr`, but escapes non-ASCII characters.', link: fn('ascii') },
  aiter: { kind: 'function', summary: 'Gets an asynchronous iterator from an asynchronous iterable.', link: fn('aiter') },
  anext: { kind: 'function', summary: 'Awaits the next item of an asynchronous iterator.', link: fn('anext') },
  __import__: { kind: 'function', summary: 'The function the `import` statement calls. Use `importlib.import_module` instead.', link: fn('import__') },

  // -------------------------------------------------------------- constants
  NotImplemented: { kind: 'value', summary: 'Returned by special methods like `__eq__` or `__add__` to say "I don\'t know how to handle this other type": Python then tries the other operand. Not the same as `NotImplementedError`.', link: constant('NotImplemented') },
  Ellipsis: { kind: 'value', summary: 'The `...` object; see `...`.', link: constant('Ellipsis') },
  __debug__: { kind: 'value', summary: '`True` unless Python runs with `-O`; `assert` statements only run when it is true.', link: constant('debug__') },
  __name__: {
    kind: 'value',
    summary: 'The name of the current module. It is `"__main__"` when the file is run as a script, so `if __name__ == "__main__":` guards code that should not run on import.',
    example: 'if __name__ == "__main__":\n    main()',
    link: `${DOCS}/library/__main__.html`,
  },
  __file__: { kind: 'value', summary: 'The path of the current module\'s file.', link: `${REF}/datamodel.html#module.__file__` },
  __doc__: { kind: 'value', summary: 'The docstring of the current module (or of an object: `f.__doc__`).', link: `${DOCS}/glossary.html#term-docstring` },
  self: {
    kind: 'convention',
    title: 'self',
    summary: 'By convention, the first parameter of a method: the **instance** the method was called on. `obj.method(x)` runs `method(obj, x)`, so inside the method `self` is `obj`.',
    details: '`self` is not a keyword, just a name every Python programmer uses. Attributes are always reached through it: `self.count`, never just `count`.',
    example: 'class Counter:\n    def __init__(self):\n        self.count = 0\n\n    def bump(self):\n        self.count += 1',
    link: tut('classes', 'random-remarks'),
  },
  cls: {
    kind: 'convention',
    title: 'cls',
    summary: 'By convention, the first parameter of a **class method** (`@classmethod`) and of `__new__`: the class itself, so `cls(...)` creates an instance (of the subclass, if called on one).',
    link: fn('classmethod'),
  },

  // ------------------------------------------------------------- exceptions
  BaseException: { kind: 'type', summary: 'The root of all exceptions, including `KeyboardInterrupt` and `SystemExit`. Catch `Exception` instead.', link: exc('BaseException') },
  Exception: { kind: 'type', summary: 'The base class for all ordinary errors. Your own exceptions should subclass it: `class ConfigError(Exception): pass`.', link: exc('Exception') },
  ValueError: { kind: 'type', summary: 'Raised when a value has the right type but is unacceptable: `int("abc")`.', link: exc('ValueError') },
  TypeError: { kind: 'type', summary: 'Raised when an operation gets the wrong type: `"a" + 1`, or a call with the wrong number of arguments.', link: exc('TypeError') },
  KeyError: { kind: 'type', summary: 'Raised when a dict key is missing. Use `d.get(key)` or `key in d` to avoid it.', link: exc('KeyError') },
  IndexError: { kind: 'type', summary: 'Raised when a sequence index is out of range.', link: exc('IndexError') },
  AttributeError: { kind: 'type', summary: 'Raised when an attribute doesn\'t exist, e.g. calling a method on `None`.', link: exc('AttributeError') },
  NameError: { kind: 'type', summary: 'Raised when a name is not defined (often a typo, or using a variable before assigning it).', link: exc('NameError') },
  ZeroDivisionError: { kind: 'type', summary: 'Raised when dividing (or `%`) by zero.', link: exc('ZeroDivisionError') },
  NotImplementedError: { kind: 'type', summary: 'Raise it in a method that subclasses must override, or for a feature that isn\'t written yet.', link: exc('NotImplementedError') },
  RuntimeError: { kind: 'type', summary: 'A generic error for problems that fit no other category.', link: exc('RuntimeError') },
  StopIteration: { kind: 'type', summary: 'Raised by `next()` when an iterator has no more items; `for` loops handle it for you.', link: exc('StopIteration') },
  AssertionError: { kind: 'type', summary: 'Raised by a failing `assert`.', link: exc('AssertionError') },
  ImportError: { kind: 'type', summary: 'Raised when an import fails.', link: exc('ImportError') },
  ModuleNotFoundError: { kind: 'type', summary: 'Raised when a module can\'t be found: not installed, or a typo in its name.', link: exc('ModuleNotFoundError') },
  OSError: { kind: 'type', summary: 'Raised for operating-system errors: files, permissions, network.', link: exc('OSError') },
  FileNotFoundError: { kind: 'type', summary: 'Raised when a file or directory doesn\'t exist.', link: exc('FileNotFoundError') },
  PermissionError: { kind: 'type', summary: 'Raised when the operating system denies access.', link: exc('PermissionError') },
  KeyboardInterrupt: { kind: 'type', summary: 'Raised when the user presses Ctrl+C.', link: exc('KeyboardInterrupt') },
  TimeoutError: { kind: 'type', summary: 'Raised when an operation times out.', link: exc('TimeoutError') },
  RecursionError: { kind: 'type', summary: 'Raised when recursion goes too deep (the call stack limit is reached).', link: exc('RecursionError') },
  LookupError: { kind: 'type', summary: 'Base class of `KeyError` and `IndexError`.', link: exc('LookupError') },
  ArithmeticError: { kind: 'type', summary: 'Base class of arithmetic errors like `ZeroDivisionError` and `OverflowError`.', link: exc('ArithmeticError') },
  UnicodeDecodeError: { kind: 'type', summary: 'Raised when bytes can\'t be decoded as text in the given encoding.', link: exc('UnicodeDecodeError') },
  ExceptionGroup: { kind: 'type', summary: 'Several exceptions raised together; handle them with `except*`.', link: exc('ExceptionGroup') },
};

/** Context-free text explanations for `else`, picked by what the `else` belongs to. */
const ELSE: Record<string, DocEntry> = {
  if_statement: {
    kind: 'keyword',
    title: 'else',
    summary: 'The branch of an `if` that runs when the `if` condition and all `elif` conditions were false.',
    example: 'if n % 2 == 0:\n    print("even")\nelse:\n    print("odd")',
    link: compound('the-if-statement'),
  },
  for_statement: {
    kind: 'keyword',
    title: 'else (loop)',
    summary: 'On a loop, `else` runs when the loop finished **without `break`**: every item was processed. Read it as "no break". A common use is searching: the `else` handles "not found".',
    example: 'for user in users:\n    if user.name == wanted:\n        break\nelse:\n    print("not found")',
    link: compound('the-for-statement'),
  },
  while_statement: {
    kind: 'keyword',
    title: 'else (loop)',
    summary: 'On a `while` loop, `else` runs when the condition became false, i.e. the loop ended **without `break`**.',
    link: compound('the-while-statement'),
  },
  try_statement: {
    kind: 'keyword',
    title: 'else (try)',
    summary: 'In a `try` statement, `else` runs only if the `try` block raised **no** exception. Code there is not protected by the `except` clauses, which keeps them focused on the risky part.',
    example: 'try:\n    file = open(path)\nexcept OSError:\n    print("cannot open", path)\nelse:\n    with file:\n        print(file.read())',
    link: compound('the-try-statement'),
  },
};

const AS: Record<string, DocEntry> = {
  with_item: {
    kind: 'keyword',
    title: 'as (with)',
    summary: 'Binds the result of the context manager\'s setup (`__enter__`) to a name, e.g. the open file in `with open(path) as file:`.',
    link: compound('the-with-statement'),
  },
  except_clause: {
    kind: 'keyword',
    title: 'as (except)',
    summary: 'Binds the caught **exception object** to a name, so you can read its message or attributes. The name is deleted when the `except` block ends.',
    example: 'except OSError as error:\n    print(error.filename, error.strerror)',
    link: compound('except-clause'),
  },
  case_clause: {
    kind: 'keyword',
    title: 'as (pattern)',
    summary: 'An **as-pattern**: if the pattern on the left matches, the matched value is also bound to the name on the right.',
    example: 'case [x, y] as point:\n    ...',
    link: compound('as-patterns'),
  },
};

const DEF_METHOD: DocEntry = {
  kind: 'keyword',
  title: 'def (method)',
  summary: 'Defines a **method**: a function inside a class. Its first parameter (by convention `self`) receives the instance, so `obj.method(x)` calls `method(obj, x)`.',
  details: '`@classmethod` methods get the class (`cls`) instead, and `@staticmethod` methods get neither. Names like `__init__` and `__str__` are special methods that Python calls for you.',
  example: 'class Account:\n    def deposit(self, amount):\n        self.balance += amount',
  link: tut('classes', 'method-objects'),
};

const BLOCK_COLON: DocEntry = {
  kind: 'syntax',
  title: ': (start of block)',
  summary: 'Ends the header of a compound statement. The **indented** lines after it are its body; the body ends where the indentation goes back. Python uses indentation, not braces, to group statements.',
  details: 'Use 4 spaces per level (PEP 8) and don\'t mix tabs and spaces. A short body may follow on the same line: `if done: break`.',
  example: 'for n in numbers:\n    if n < 0:\n        continue\n    total += n\nprint(total)  # after the loop',
  link: `${REF}/lexical_analysis.html#indentation`,
};

const COMPOUND = new Set([
  'function_definition', 'class_definition', 'if_statement', 'elif_clause', 'else_clause', 'for_statement', 'while_statement',
  'try_statement', 'except_clause', 'finally_clause', 'with_statement', 'match_statement', 'case_clause',
]);

const UNPACK_ARGS: DocEntry = {
  kind: 'operator',
  title: '* (argument unpacking)',
  summary: '**Unpacks** an iterable into separate positional arguments: `f(*[1, 2])` is `f(1, 2)`.',
  example: 'point = (3, 4)\ndistance(*point)\nprint(*names, sep=", ")',
  link: tut('controlflow', 'unpacking-argument-lists'),
};
const UNPACK_KWARGS: DocEntry = {
  kind: 'operator',
  title: '** (keyword argument unpacking)',
  summary: '**Unpacks** a dict into keyword arguments: `f(**{"a": 1})` is `f(a=1)`.',
  example: 'options = {"sep": ", ", "end": "!\\n"}\nprint("a", "b", **options)',
  link: tut('controlflow', 'unpacking-argument-lists'),
};
const STARRED_TARGET: DocEntry = {
  kind: 'operator',
  title: '*name (starred assignment)',
  summary: 'In unpacking, `*name` collects **all remaining items** into a list, so the other names get one item each.',
  example: 'first, *rest = [1, 2, 3]   # rest == [2, 3]\nhead, *_, last = items',
  link: simple('assignment-statements'),
};

/** Integer and float literals, by their spelling. */
function numberDoc(token: Node): DocEntry | undefined {
  const t = token.text;
  if (token.type !== 'integer' && token.type !== 'float') return undefined;
  if (/[jJ]$/.test(t)) {
    return {
      kind: 'literal',
      title: 'imaginary literal',
      summary: 'An **imaginary number**: `3j` is 3 times the square root of -1. Add a real part to get a `complex`: `1 + 2j`.',
      link: lex('imaginary-literals'),
    };
  }
  const base = /^0[xX]/.test(t) ? 'hexadecimal (base 16)' : /^0[oO]/.test(t) ? 'octal (base 8)' : /^0[bB]/.test(t) ? 'binary (base 2)' : undefined;
  if (token.type === 'integer' && base) {
    let decimal = '';
    try {
      decimal = ` \`${t}\` is \`${BigInt(t.replace(/_/g, '')).toString()}\` in decimal.`;
    } catch {
      // not a valid literal (yet): leave the conversion out
    }
    return {
      kind: 'literal',
      title: `${base.split(' ')[0]} integer literal`,
      summary: `An **integer** written in ${base}: \`0x\` hex, \`0o\` octal, \`0b\` binary.${decimal}`,
      details: 'Underscores may group digits: `0b_1111_0000`. `hex()`, `oct()` and `bin()` convert the other way.',
      link: lex('integer-literals'),
    };
  }
  return docs[`#${token.type}`];
}

/** String literals: `f"..."`, `r"..."`, `b"..."`, triple-quoted, ... by their prefix and quotes. */
function stringDoc(literal: Node): DocEntry | undefined {
  if (literal.type !== 'string') return undefined;
  const start = literal.firstChild?.text ?? '"';
  const prefix = (start.match(/^[A-Za-z]*/)?.[0] ?? '').toLowerCase();
  const triple = /("""|''')$/.test(start);
  const tripleNote = triple ? ' The triple quotes let it span several lines.' : '';
  const link = lex('string-and-bytes-literals');
  if (prefix.includes('f')) {
    return {
      kind: 'literal',
      title: 'f"..." (f-string)',
      summary: `An **f-string** (formatted string literal): expressions in \`{ }\` are evaluated and their values inserted. Add \`:spec\` to format a value and \`!r\` to use its \`repr()\`.${tripleNote}`,
      details: prefix.includes('r') ? 'With `r` it is also raw: backslashes are kept as they are.' : 'Write `{{` and `}}` for literal braces.',
      example: 'f"{name} has {len(items)} items"\nf"{price:.2f} EUR"\nf"{x=}"   # shows "x=42"',
      link: lex('f-strings'),
    };
  }
  if (prefix.includes('t')) {
    return {
      kind: 'literal',
      title: 't"..." (template string)',
      summary: `A **template string** (Python 3.14+): like an f-string, but it gives a \`Template\` object with the text and the values kept apart, so a library can process them safely (e.g. escape HTML).${tripleNote}`,
      link: lex('template-string-literals'),
    };
  }
  if (prefix.includes('b')) {
    return {
      kind: 'literal',
      title: 'b"..." (bytes literal)',
      summary: `A **bytes literal**: binary data (\`bytes\`), not text. Only ASCII characters and escapes like \`\\x00\` are allowed. Convert with \`.decode()\` / \`text.encode()\`.${prefix.includes('r') ? ' With `r` it is also raw: backslashes are kept as they are.' : ''}${tripleNote}`,
      example: 'header = b"\\x89PNG"\ntext = data.decode("utf-8")',
      link,
    };
  }
  if (prefix.includes('r')) {
    return {
      kind: 'literal',
      title: 'r"..." (raw string)',
      summary: `A **raw string**: backslashes are kept as they are, not treated as escapes. Handy for regular expressions and Windows paths.${tripleNote}`,
      details: 'Gotcha: a raw string still can\'t end with an odd number of backslashes.',
      example: 'pattern = re.compile(r"\\d+\\.\\d+")\npath = r"C:\\temp\\new"',
      link,
    };
  }
  if (prefix === 'u') {
    return {
      kind: 'literal',
      title: 'u"..." (unicode string)',
      summary: `The \`u\` prefix is left over from Python 2, where it made a Unicode string. In Python 3 every \`str\` is Unicode, so it changes nothing.${tripleNote}`,
      link,
    };
  }
  if (triple) {
    return {
      kind: 'literal',
      title: '"""...""" (triple-quoted string)',
      summary: 'A **triple-quoted string**: it can span several lines, and the line breaks are part of the text. Also used for docstrings.',
      details: 'To strip the common indentation of the lines, use `textwrap.dedent`.',
      example: 'usage = """\\nUsage: tool [options]\\n  -h  help\\n"""',
      link,
    };
  }
  return {
    kind: 'literal',
    title: '"..." (string)',
    summary: 'A **string** (`str`): immutable Unicode text. Single and double quotes mean the same; pick the one that avoids escaping. Backslash escapes like `\\n` work.',
    details: 'Adjacent string literals are joined: `"a" "b"` is `"ab"`. Prefixes change the meaning: `f"..."` formats, `r"..."` is raw, `b"..."` is bytes.',
    link,
  };
}

/** Meanings the parent type alone can't tell apart. */
function docFor(token: Node): DocEntry | undefined {
  const parent = token.parent;
  if (!parent) return undefined;
  if (token.type === 'integer' || token.type === 'float') return numberDoc(token);
  switch (`${parent.type}/${token.type}`) {
    case 'else_clause/else':
      return ELSE[parent.parent?.type ?? ''];
    case 'function_definition/def':
      return classOf(parent) ? DEF_METHOD : undefined;
    case 'as_pattern/as': {
      const owner = ancestor(parent, (n) => Object.hasOwn(AS, n.type), (n) => /statement|definition/.test(n.type));
      return owner ? AS[owner.type] : undefined;
    }
    case 'list_splat/*':
      return parent.parent?.type === 'argument_list' ? UNPACK_ARGS : undefined;
    case 'dictionary_splat/**':
      return parent.parent?.type === 'argument_list' ? UNPACK_KWARGS : undefined;
    case 'list_splat_pattern/*':
      return isParameter(parent) ? undefined : STARRED_TARGET;
    case 'if_clause/if':
      return parent.parent?.type === 'case_clause' ? docs['case_clause/if'] : undefined;
  }
  if (token.type === ':' && COMPOUND.has(parent.type)) return BLOCK_COLON;
  return undefined;
}

// --------------------------------------------------------------- structure

const FUNCTIONS = new Set(['function_definition', 'lambda']);
const LOOPS = new Set(['for_statement', 'while_statement']);
const SCOPES = new Set(['function_definition', 'class_definition', 'lambda']);
/** Patterns a name can sit in while still being bound by the assignment / loop around them. */
const TARGET_PATTERNS = new Set(['pattern_list', 'tuple_pattern', 'list_pattern', 'list_splat_pattern', 'parenthesized_expression', 'tuple', 'list', 'expression_list']);

const code = (s: string) => `\`${s}\``;
const isDunder = (s: string) => /^__\w+__$/.test(s);
const privateNote = (s: string) => (/^_[^_]/.test(s) || /^__\w*[^_]$/.test(s) ? ' The leading `_` marks it as **internal** by convention: not part of the public API.' : '');

/** A definition including its decorators. */
function promote(scope: Node): Node {
  return scope.parent?.type === 'decorated_definition' && fieldOf(scope) === 'definition' ? scope.parent : scope;
}

/** The class a definition sits directly in (as a method or class attribute). */
function classOf(def: Node): Node | undefined {
  const outer = promote(def).parent;
  return outer?.type === 'block' && outer.parent?.type === 'class_definition' ? outer.parent : undefined;
}

function decorators(def: Node): string[] {
  const wrapped = promote(def);
  if (wrapped === def) return [];
  return wrapped.namedChildren.filter((c): c is Node => c?.type === 'decorator').map((d) => d.text.slice(1).trim());
}

/** Whether a `*args` / `**kwargs` / name node is a parameter (of a def or lambda). */
function isParameter(n: Node): boolean {
  const p = n.parent;
  if (!p) return false;
  if (p.type === 'parameters' || p.type === 'lambda_parameters') return true;
  return /^typed(_default)?_parameter$/.test(p.type) && /^(lambda_)?parameters$/.test(p.parent?.type ?? '');
}

/** What the special methods do (the most common ones). */
const DUNDERS: Record<string, string> = {
  __init__: 'runs when a new instance is created (`ClassName(...)`): it sets up the attributes on `self`',
  __new__: 'creates the new instance (before `__init__`); rarely needed',
  __str__: 'gives the readable text for `str(obj)` and `print(obj)`',
  __repr__: 'gives the developer-oriented text for `repr(obj)`, the debugger and the interactive prompt',
  __len__: 'is called by `len(obj)`',
  __eq__: 'is called by `==`',
  __ne__: 'is called by `!=`',
  __lt__: 'is called by `<` (and makes the objects sortable)',
  __le__: 'is called by `<=`',
  __gt__: 'is called by `>`',
  __ge__: 'is called by `>=`',
  __hash__: 'is called by `hash(obj)`, for dict keys and set members',
  __bool__: 'decides whether the object is truthy (`if obj:`)',
  __add__: 'is called by `+` (`a + b` runs `a.__add__(b)`)',
  __sub__: 'is called by `-`',
  __mul__: 'is called by `*`',
  __truediv__: 'is called by `/`',
  __matmul__: 'is called by `@`',
  __iter__: 'makes the object iterable: `for x in obj` calls it',
  __next__: 'gives the next item of an iterator',
  __contains__: 'is called by `in`',
  __getitem__: 'is called by `obj[key]`',
  __setitem__: 'is called by `obj[key] = value`',
  __delitem__: 'is called by `del obj[key]`',
  __call__: 'makes the instance callable like a function: `obj(...)`',
  __enter__: 'runs at the start of a `with` block; its return value is bound by `as`',
  __exit__: 'runs at the end of a `with` block, also after an exception',
  __getattr__: 'is called when a normal attribute lookup fails',
  __post_init__: 'runs after the `__init__` that `@dataclass` generates',
};

function functionRole(node: Node, def: Node): Role {
  const name = code(node.text);
  const scope = promote(def);
  const cls = classOf(def);
  const decos = decorators(def);
  const isAsync = def.child(0)?.type === 'async' ? 'coroutine ' : '';
  if (cls) {
    const owner = cls.childForFieldName('name')?.text ?? 'the class';
    if (isDunder(node.text)) {
      const what = DUNDERS[node.text];
      return {
        title: node.text === '__init__' ? 'Initializer (constructor)' : 'Special method',
        summary: `${name} is a **special ("dunder") method** of ${code(owner)}: you don't call it by name, Python does${what ? `. It ${what}` : ''}.`,
        scope,
      };
    }
    if (decos.includes('staticmethod')) return { title: 'Static method', summary: `Declares the static method ${name} of ${code(owner)}: it gets no \`self\` or \`cls\`.${privateNote(node.text)}`, scope };
    if (decos.includes('classmethod')) return { title: 'Class method', summary: `Declares the class method ${name} of ${code(owner)}: its first parameter (\`cls\`) is the class, not an instance.${privateNote(node.text)}`, scope };
    if (decos.includes('property')) return { title: 'Property', summary: `Declares the property ${name} of ${code(owner)}: read as \`obj.${node.text}\` (no parentheses), which runs this method.${privateNote(node.text)}`, scope };
    if (decos.some((d) => d.endsWith('.setter'))) return { title: 'Property setter', summary: `Runs when \`obj.${node.text} = value\` is assigned.`, scope };
    return { title: 'Method', summary: `Declares the ${isAsync}method ${name} of ${code(owner)}. Call it on an instance: \`obj.${node.text}(...)\`.${privateNote(node.text)}`, scope };
  }
  const nested = ancestor(def, (n) => FUNCTIONS.has(n.type));
  return {
    title: nested ? 'Nested function' : 'Function name',
    summary: nested
      ? `Declares the ${isAsync}function ${name} inside another function: only visible there, and it can use the outer function's variables (a closure).`
      : `Declares the ${isAsync}function ${name}.${privateNote(node.text)}`,
    scope,
  };
}

function parameterRole(node: Node, params: Node): Role {
  const name = code(node.text);
  const owner = params.parent;
  const scope = owner ? promote(owner) : undefined;
  if (owner?.type === 'lambda') return { title: 'Lambda parameter', summary: `${name} is a parameter of this lambda.`, scope };
  // Where the parameter sits: before `/`, after `*` / `*args`.
  const items = params.namedChildren.filter((c): c is Node => !!c);
  const index = items.findIndex((c) => c.startIndex <= node.startIndex && node.endIndex <= c.endIndex);
  const before = items.slice(0, index);
  const first = index === 0;
  const holder = items[index];
  if (holder?.type === 'list_splat_pattern' || holder?.firstNamedChild?.type === 'list_splat_pattern') {
    return { title: 'Parameter (*args)', summary: `${name} collects any extra positional arguments into a **tuple**.`, scope };
  }
  if (holder?.type === 'dictionary_splat_pattern' || holder?.firstNamedChild?.type === 'dictionary_splat_pattern') {
    return { title: 'Parameter (**kwargs)', summary: `${name} collects any extra keyword arguments into a **dict**.`, scope };
  }
  const cls = owner && classOf(owner);
  const decos = owner ? decorators(owner) : [];
  if (first && cls && !decos.includes('staticmethod')) {
    if (decos.includes('classmethod') || owner?.childForFieldName('name')?.text === '__new__') {
      return { title: 'Class parameter', summary: `${name} receives the **class** the method was called on (by convention named \`cls\`).`, scope };
    }
    return { title: 'Self parameter', summary: `${name} receives the **instance** the method was called on: \`obj.method()\` passes \`obj\` here. Named \`self\` by convention.`, scope };
  }
  const extra: string[] = [];
  if (items.slice(index + 1).some((c) => c.type === 'positional_separator')) extra.push('It is **positional-only** (it comes before `/`): callers can\'t pass it by name.');
  else if (before.some((c) => c.type === 'keyword_separator' || c.type === 'list_splat_pattern' || c.firstNamedChild?.type === 'list_splat_pattern')) extra.push('It is **keyword-only** (it comes after `*`): callers must write `' + node.text + '=...`.');
  if (holder && /default_parameter$/.test(holder.type)) extra.push('It has a default value, so callers may leave it out.');
  return { title: 'Parameter', summary: [`${name} is a parameter: a local variable set from the caller's argument.`, ...extra].join(' '), scope };
}

/** The statement or construct that binds a name used as an assignment or loop target, if any. */
function targetOf(node: Node): { kind: 'assign' | 'loop' | 'comprehension' | 'walrus'; owner: Node; unpacked: boolean } | undefined {
  let n = node;
  let unpacked = false;
  for (let p = n.parent; p; n = p, p = p.parent) {
    if (TARGET_PATTERNS.has(p.type)) {
      unpacked = true;
      continue;
    }
    const f = fieldOf(n);
    if (p.type === 'assignment' && f === 'left') return { kind: 'assign', owner: p, unpacked };
    if (p.type === 'for_statement' && f === 'left') return { kind: 'loop', owner: p, unpacked };
    if (p.type === 'for_in_clause' && f === 'left') return { kind: 'comprehension', owner: p.parent ?? p, unpacked };
    if (p.type === 'named_expression' && f === 'name') return { kind: 'walrus', owner: p, unpacked };
    return undefined;
  }
  return undefined;
}

function assignmentRole(node: Node, assignment: Node, unpacked: boolean): Role {
  const name = code(node.text);
  // `a = b = 0`: the whole chain is one statement.
  let stmt: Node = assignment;
  while (stmt.parent?.type === 'assignment') stmt = stmt.parent;
  if (stmt.parent?.type === 'expression_statement') stmt = stmt.parent;
  const from = unpacked ? ' (unpacked from the value on the right)' : '';
  const annotated = !!assignment.childForFieldName('type');
  const hasValue = !!assignment.childForFieldName('right');
  const body = stmt.parent;
  const cls = body?.type === 'block' && body.parent?.type === 'class_definition' ? body.parent : undefined;
  if (cls) {
    const owner = code(cls.childForFieldName('name')?.text ?? 'the class');
    if (annotated && !hasValue) return { title: 'Class attribute (annotated)', summary: `Declares the attribute ${name} of ${owner} with a type hint and no value. In a \`@dataclass\` (or similar) this is a **field**, set by the generated \`__init__\`.`, scope: stmt };
    return { title: 'Class attribute', summary: `Declares the class attribute ${name} of ${owner}${from}: shared by all instances, unless an instance assigns its own \`self.${node.text}\`.`, scope: stmt };
  }
  const fnScope = ancestor(stmt, (n) => SCOPES.has(n.type));
  if (!fnScope || fnScope.type === 'class_definition') {
    if (/^[A-Z][A-Z0-9_]*$/.test(node.text)) return { title: 'Constant', summary: `Assigns the module-level name ${name}${from}. ALL_CAPS means it is meant as a **constant** (by convention: Python does not enforce it).`, scope: stmt };
    return { title: 'Global variable', summary: `Assigns the module-level (global) variable ${name}${from}. Functions can read it; to reassign it inside a function they need \`global ${node.text}\`.`, scope: stmt };
  }
  return { title: 'Variable', summary: `Assigns the local variable ${name}${from}. Its first assignment in a function makes it local to that function.`, scope: stmt };
}

/** Roles that don't bind a name (for deciding whether a file defines its own `print`, ...). */
const NON_BINDING = new Set(['Keyword argument', 'Decorator', 'Global name', 'Nonlocal name', 'Class pattern', 'Value pattern', 'Attribute pattern', 'Module name']);

export function role(node: Node, field: string | null): Role | undefined {
  const parent = node.parent;
  if (!parent) return undefined;
  const name = code(node.text);
  switch (`${parent.type}.${field ?? ''}`) {
    case 'function_definition.name':
      return functionRole(node, parent);
    case 'class_definition.name': {
      const bases = parent.childForFieldName('superclasses');
      return {
        title: 'Class name',
        summary: `Declares the class ${name}${bases && bases.namedChildCount ? `, a subclass of \`${bases.text.slice(1, -1)}\`` : ''}. Create instances by calling it: \`${node.text}(...)\`.${privateNote(node.text)}`,
        scope: promote(parent),
      };
    }
    case 'default_parameter.name':
    case 'typed_default_parameter.name':
      return parent.parent ? parameterRole(node, parent.parent) : undefined;
    case 'keyword_argument.name':
      return parent.parent?.parent?.type === 'class_definition'
        ? { title: 'Keyword argument', summary: `A class keyword: ${node.text === 'metaclass' ? 'chooses the **metaclass** (the class of this class).' : `passed to the parent class's \`__init_subclass__\`.`}` }
        : { title: 'Keyword argument', summary: `Passes the argument by name: it goes to the parameter ${name}, wherever that is in the parameter list.` };
    case 'named_expression.name':
      return { title: 'Variable (walrus)', summary: `\`:=\` assigns ${name} here and also gives the value to the surrounding expression.`, scope: parent };
    case 'aliased_import.alias':
      return { title: 'Import alias', summary: `The imported module or name is called ${name} in this file.`, scope: ancestor(node, (n) => /import/.test(n.type) && /statement$/.test(n.type)) };
    case 'global_statement.':
      return { title: 'Global name', summary: `In this function, ${name} refers to the module-level variable: assigning to it changes the global.`, scope: ancestor(node, (n) => n.type === 'function_definition') };
    case 'nonlocal_statement.':
      return { title: 'Nonlocal name', summary: `In this function, ${name} refers to the variable of the enclosing function: assigning to it changes that one.`, scope: ancestor(node, (n) => n.type === 'function_definition') };
    case 'decorator.':
      return { title: 'Decorator', summary: `Applies the decorator ${name} to the definition below it: it is replaced by \`${node.text}(definition)\`.`, scope: parent.parent ?? undefined };
    case 'keyword_pattern.':
      return parent.firstNamedChild?.equals(node) ? { title: 'Attribute pattern', summary: `The object's attribute ${name} must match the pattern after \`=\`.` } : undefined;
    case 'splat_pattern.':
      return captureRole(node);
    case 'as_pattern.':
      // `case <pattern> as name`: the name after `as` (in `with`/`except` it is an as_pattern_target).
      return parent.parent?.type === 'case_pattern' && parent.lastNamedChild?.equals(node) ? captureRole(node) : undefined;
  }

  // Parameters of a def or lambda.
  if (parent.type === 'parameters' || parent.type === 'lambda_parameters') return parameterRole(node, parent);
  if (/^typed_parameter$/.test(parent.type) && !field && parent.parent) return parameterRole(node, parent.parent);
  if ((parent.type === 'list_splat_pattern' || parent.type === 'dictionary_splat_pattern') && isParameter(parent)) {
    const params = parent.parent?.type.endsWith('parameters') ? parent.parent : parent.parent?.parent;
    if (params) return parameterRole(node, params);
  }

  // `with ... as name`, `except E as name`.
  if (parent.type === 'as_pattern_target') {
    const owner = ancestor(parent, (n) => n.type === 'with_statement' || n.type === 'except_clause');
    if (owner?.type === 'except_clause') return { title: 'Caught exception', summary: `${name} holds the exception that was caught. It is deleted at the end of the \`except\` block.`, scope: owner };
    if (owner) return { title: 'Context variable', summary: `${name} is what the context manager's setup returned (for \`open\`: the file), usable inside the \`with\` block.`, scope: owner };
  }

  // Names in import statements.
  if (parent.type === 'dotted_name') {
    const holder = parent.parent;
    const f = fieldOf(parent);
    if (holder?.type === 'future_import_statement' && f === 'name') {
      return { title: 'Future feature', summary: `Turns on the language feature ${name} for this file.`, scope: holder };
    }
    if (holder?.type === 'aliased_import' && holder.parent?.type === 'import_from_statement') {
      const alias = holder.childForFieldName('alias')?.text;
      return { title: 'Imported name', summary: `Imports ${name} from the module \`${holder.parent.childForFieldName('module_name')?.text ?? ''}\`, available here as \`${alias}\`.`, scope: holder.parent };
    }
    if (holder && /^(import_statement|aliased_import)$/.test(holder.type) && f === 'name') {
      const alias = holder.type === 'aliased_import' ? holder.childForFieldName('alias')?.text : undefined;
      const first = parent.firstNamedChild?.equals(node);
      return {
        title: 'Imported module',
        summary: alias ? `Imports the module \`${parent.text}\`, available here as \`${alias}\`.` : first ? `Imports the module \`${parent.text}\`; the name ${name} is bound here.` : `Part of the module path \`${parent.text}\`.`,
        scope: ancestor(node, (n) => n.type === 'import_statement' || n.type === 'import_from_statement'),
      };
    }
    if (holder?.type === 'import_from_statement' && f === 'name') {
      return { title: 'Imported name', summary: `Imports ${name} from the module \`${holder.childForFieldName('module_name')?.text ?? ''}\`, so it can be used without a prefix.`, scope: holder };
    }
    if (holder && /import_from_statement|relative_import|future_import_statement/.test(holder.type)) {
      return { title: 'Module name', summary: `The module \`${parent.text}\` to import from.` };
    }
    // `case name:` binds; `case Point(...)` names a class.
    if (holder?.type === 'case_pattern' || holder?.type === 'keyword_pattern' || holder?.type === 'dict_pattern') {
      if (parent.namedChildCount === 1) return captureRole(node);
      return { title: 'Value pattern', summary: `Matches when the subject equals \`${parent.text}\` (a dotted name is compared, not bound).` };
    }
    if (holder?.type === 'class_pattern') {
      return { title: 'Class pattern', summary: `Matches instances of \`${parent.text}\` (checked with \`isinstance\`); the arguments in \`( )\` match their attributes.` };
    }
  }

  // Type parameters: `def f[T](...)`, `class Box[T]:`, `type Pair[T] = ...`.
  if (parent.type === 'type' && parent.parent?.type === 'type_parameter') {
    const generic = parent.parent.parent;
    if (generic?.type === 'function_definition' || generic?.type === 'class_definition' || (generic?.type === 'generic_type' && generic.parent?.parent?.type === 'type_alias_statement' && fieldOf(generic.parent) === 'left')) {
      return { title: 'Type parameter', summary: `${name} is a **type variable**: a placeholder for a type, filled in where the generic is used.`, scope: generic.type === 'generic_type' ? (generic.parent?.parent ?? undefined) : promote(generic) };
    }
  }
  // `type Name = ...` / `type Name[T] = ...`
  const alias = ancestor(node, (n) => n.type === 'type_alias_statement', (n) => n.type === 'type_parameter');
  const aliased = alias?.childForFieldName('left')?.firstNamedChild;
  const aliasName = aliased?.type === 'generic_type' ? aliased.firstNamedChild : aliased;
  if (alias && aliasName?.equals(node)) {
    return { title: 'Type alias', summary: `Declares the type alias ${name}: a name for the type after \`=\`.`, scope: alias };
  }

  // `self.x = ...` sets an instance attribute.
  if (parent.type === 'attribute' && field === 'attribute' && parent.childForFieldName('object')?.text === 'self' && targetOf(parent)?.kind === 'assign') {
    const stmt = targetOf(parent)!.owner;
    return { title: 'Instance attribute', summary: `Sets the attribute ${name} on this instance (\`self\`); other methods read it as \`self.${node.text}\`.`, scope: stmt.parent?.type === 'expression_statement' ? stmt.parent : stmt };
  }

  // Assignment and loop targets.
  const target = targetOf(node);
  switch (target?.kind) {
    case 'assign':
      return assignmentRole(node, target.owner, target.unpacked);
    case 'loop':
      return { title: 'Loop variable', summary: `${name} gets the next item of the iterable in each pass of the loop. It still exists after the loop.`, scope: target.owner };
    case 'comprehension':
      return { title: 'Comprehension variable', summary: `${name} takes each item in turn; it only exists inside the comprehension.`, scope: target.owner };
    case 'walrus':
      return { title: 'Variable (walrus)', summary: `\`:=\` assigns ${name} here and also gives the value to the surrounding expression.`, scope: target.owner };
  }
  return undefined;
}

function captureRole(node: Node): Role {
  const clause = ancestor(node, (n) => n.type === 'case_clause');
  return { title: 'Capture pattern', summary: `Binds the matching part of the subject to \`${node.text}\`, usable in this \`case\` (and after it).`, scope: clause };
}

function jumpTarget(token: Node): JumpTarget | undefined {
  switch (token.type) {
    case 'return': {
      const fn = ancestor(token, (n) => n.type === 'function_definition');
      return fn && { node: fn, verb: 'returns from' };
    }
    case 'yield':
    case 'await': {
      const fn = ancestor(token, (n) => n.type === 'function_definition' || n.type === 'lambda');
      return fn && { node: fn, verb: 'pauses' };
    }
    case 'break':
    case 'continue': {
      const loop = ancestor(token, (n) => LOOPS.has(n.type), (n) => SCOPES.has(n.type));
      return loop && { node: loop, verb: token.type === 'break' ? 'breaks out of' : 'continues' };
    }
    case 'raise': {
      // Only a raise inside the `try:` body is handled by that try's `except` clauses.
      let n: Node = token;
      for (let p = n.parent; p; n = p, p = p.parent) {
        if (p.type === 'function_definition') return { node: p, verb: 'raises out of' };
        if (p.type === 'try_statement' && fieldOf(n) === 'body' && p.children.some((c) => c?.type === 'except_clause')) {
          return { node: p, verb: 'may be caught by' };
        }
      }
      return undefined;
    }
  }
  return undefined;
}

const NAME_KINDS = new Set<DocKind>(['value', 'type', 'function']);

/** Whether the file binds `node.text` itself somewhere (an assignment, def, parameter or import shadowing a built-in). */
function declaredInFile(node: Node): boolean {
  let root: Node = node;
  while (root.parent) root = root.parent;
  for (const d of root.descendantsOfType('identifier')) {
    if (!d || d.text !== node.text || d.equals(node)) continue;
    const r = role(d, fieldOf(d));
    if (r && !NON_BINDING.has(r.title)) return true;
  }
  return false;
}

export const python: LanguageSpec = {
  comments: pythonComments,
  id: 'python',
  languageIds: ['python'],
  displayName: 'Python',
  wasm: 'tree-sitter-python.wasm',
  fence: 'python',
  docs: { ...operatorDocs('python'), ...docs },
  identifierTypes: new Set(['identifier']),
  wrapperTypes: new Set([
    'elif_clause', 'else_clause', 'is not', 'not in', 'for_in_clause', 'if_clause', 'decorator', 'keyword_separator',
    'positional_separator', 'import_prefix', 'case_pattern', 'format_specifier',
  ]),
  noScopeTokens: new Set([',', ';', '.', ':', '=', '\\']),
  indentedBlocks: true,
  role,
  jumpTarget,
  promote,
  docFor,
  literalDoc: stringDoc,
  acceptIdentifierDoc(node, field, entry) {
    const parent = node.parent;
    if (parent?.type === 'attribute' && field === 'attribute') return false; // `x.sum`: a member, not the built-in
    if (entry.kind === 'convention') return true; // `self` / `cls`
    if (!NAME_KINDS.has(entry.kind)) return false; // `match`, `type`, `case` used as plain names
    const r = role(node, field);
    if (r && !NON_BINDING.has(r.title)) return false; // the user's own name
    return !declaredInFile(node);
  },
};
