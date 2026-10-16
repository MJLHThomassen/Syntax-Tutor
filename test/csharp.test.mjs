import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { load } from './helpers.mjs';

let L;
before(async () => {
  L = await load('csharp', 'csharp', 'tour.cs');
});

const hover = (...args) => L.hover(...args);
const scope = (...args) => L.scope(...args);
const md = (...args) => {
  const h = hover(...args);
  assert.ok(h, `no hover for ${JSON.stringify(args[0])}`);
  return h.markdown;
};

describe('C# hovers', () => {
  test('keywords get a doc with heading, example and link', () => {
    const h = md('class Circle');
    assert.match(h, /^\*\*`class`\*\* · C# keyword/);
    assert.match(h, /```csharp\n/);
    assert.match(h, /learn\.microsoft\.com\/en-us\/dotnet\/csharp\/language-reference\/keywords\/class/);
  });

  test('using: directive, using static and using statement', () => {
    assert.match(md('using System;'), /using \(directive\)/);
    assert.match(md('using static', 0, 6), /using static/);
    assert.match(md('using (var file'), /using \(statement\)/);
    assert.match(md('namespace Tour;'), /namespace \(file-scoped\)/);
  });

  test('new: modifier, target-typed and operator', () => {
    assert.match(md('new string ToString'), /new \(modifier\)/);
    assert.match(md('new(a.radius'), /target-typed/);
    assert.match(md('new List<string>'), /new \(operator\)/);
  });

  test('? and ! depend on context', () => {
    assert.match(md('string? name', 0, 6), /nullable type/);
    assert.match(md('name?.Length', 0, 4), /null-conditional/);
    assert.match(md('args?[0]', 0, 4), /null-conditional/);
    assert.match(md('0 ? 0 : value', 0, 2), /conditional operator/);
    assert.match(md('default!', 0, 7), /null-forgiving/);
    assert.match(md('?? "anonymous"'), /null-coalescing\)/);
    assert.match(md('??= label'), /null-coalescing assignment/);
  });

  test('=> is a lambda, an expression body or a switch arm', () => {
    assert.match(md('=> a + b'), /=> \(lambda\)/);
    assert.match(md('=> Tau / 2'), /expression-bodied member/);
    assert.match(md('=> "negative"'), /switch arm/);
  });

  test('switch, when, default, in and where depend on context', () => {
    assert.match(md('switch\n'), /switch \(expression\)/);
    assert.match(md('switch (DateTime'), /switch \(statement\)/);
    assert.match(md('when n < 0'), /case guard/);
    assert.match(md('when (ex.Message'), /exception filter/);
    assert.match(md('default:'), /default \(switch\)/);
    assert.match(md('default!'), /default \(value\)/);
    assert.match(md('in items'), /in \(foreach\)/);
    assert.match(md('in int bonus'), /in \(parameter\)/);
    assert.match(md('in words'), /in \(LINQ\)/);
    assert.match(md('where T :'), /generic constraint/);
    assert.match(md('where w.Length'), /where \(LINQ\)/);
    assert.match(md('out int half'), /output parameter/);
  });

  test('yield return / yield break, ranges, indices and strings', () => {
    assert.match(md('return i;', 0, 0), /yield return/);
    assert.match(md('break;\n            yield'), /yield break/);
    assert.match(md('^1'), /index from end/);
    assert.match(md('..3'), /\(range\)/);
    assert.match(md('$"Largest'), /\$ \(interpolated string\)/);
    assert.match(md('Largest: '), /\$"\.\.\." \(interpolated string\)/);
    assert.match(md('@"C:'), /verbatim string/);
    assert.match(md('{"x": 1}'), /raw string/);
    assert.match(md('global::'), /global::/);
    assert.match(md('_ =>'), /discard/);
  });

  test('built-ins only match where they are really the built-in', () => {
    assert.match(md('Console.WriteLine($"Largest'), /\*\*`Console`\*\* · C# built-in type/);
    assert.match(md('Task.Delay'), /built-in type/);
    assert.match(md('int.MaxValue'), /\*\*`int`\*\* · C# built-in type/);
    assert.match(md('List<string> {'), /growable list/);
    assert.match(md('nameof(args)'), /\*\*`nameof`\*\* · C# keyword/);
    assert.match(md('dynamic anything'), /\*\*`dynamic`\*\*/);
    assert.match(md('value < 0'), /new value being assigned/);
    // A member called `DayOfWeek` (DateTime.Now.DayOfWeek) is not the DayOfWeek type.
    assert.equal(hover('DayOfWeek)'), undefined);
    assert.match(md('DayOfWeek.Saturday'), /built-in type/);
  });

  test('declaration names describe their role', () => {
    assert.match(md('Circle : Shape'), /\*\*Class name\*\*.*`sealed` `partial`/);
    assert.match(md('Size\n'), /\*\*Struct name\*\*/);
    assert.match(md('Point(int X'), /\*\*Record name\*\*/);
    assert.match(md('X, int Y'), /\*\*Record parameter\*\*/);
    assert.match(md('Radius {'), /\*\*Property\*\*/);
    assert.match(md('Width {'), /auto-property/);
    assert.match(md('Area();\n    public virtual'), /\*\*Method name\*\*.*`abstract`/);
    assert.match(md('Circle(double'), /\*\*Constructor\*\*/);
    assert.match(md('half,'), /\*\*Parameter\*\*.*`out` parameter/);
    assert.match(md('T>(IEnumerable'), /\*\*Type parameter\*\*/);
    assert.match(md('Green ='), /\*\*Enum member\*\*/);
    assert.match(md('Tau ='), /\*\*Constant\*\*/);
    assert.match(md('count;'), /\*\*Field\*\*/);
    assert.match(md('Changed;'), /\*\*Event\*\*/);
    assert.match(md('words = new'), /\*\*Local variable\*\*.*inferred/);
    assert.match(md('ex)'), /\*\*Exception variable\*\*/);
    assert.match(md('item in'), /\*\*Loop variable\*\*/);
    assert.match(md('w in words'), /\*\*Range variable\*\*/);
    assert.match(md('weekend:'), /\*\*Label\*\*/);
  });

  test('jump keywords say where they go', () => {
    assert.match(md('return best'), /returns from `static T Largest<T>/);
    assert.match(md('break; else'), /breaks out of `while \(true\)/);
    assert.match(md('break;\n            default'), /breaks out of `switch \(DateTime\.Now\.DayOfWeek\)`/);
    assert.match(md('continue;'), /continues `while \(true\)/);
    assert.match(md('goto weekend'), /jumps to `weekend:`/);
    assert.match(md('throw new'), /throws to the `catch` clauses of `try`/);
    assert.match(md('yield break'), /ends the sequence of `static IEnumerable<int> Evens\(int limit\)`/);
  });

  test('contextual keywords used as plain names show their role, not the keyword', () => {
    // `add` is only a keyword inside an event declaration; here it is a local variable.
    assert.doesNotMatch(md('add = (a, b)'), /keyword/);
    // `file` is wrapped by the grammar (identifier(file)); it still gets its role.
    const f = md('file = new');
    assert.match(f, /^\*\*Local variable\*\* · Declares `file`, which is disposed/);
    assert.doesNotMatch(f, /C# keyword/);
  });

  test('qualified names get library docs, declared namespaces do not', () => {
    assert.match(md('Math;'), /\*\*`Math`\*\* · C# built-in type/);
    assert.match(md('StringReader(json'), /\*\*`StringReader`\*\* · C# built-in type/);
    assert.match(md('Tour;'), /^\*\*Namespace\*\*/);
    assert.equal(hover('System;', 0, 0), undefined);
  });

  test('nothing for strings, comments, plain identifiers and punctuation', () => {
    assert.equal(hover('"world"', 0, 1), undefined); // string content
    assert.equal(hover('nope'), undefined);
    assert.match(hover('Hover anything').markdown, /line comment/); // comments get their own explanation
    assert.equal(hover('best = item'), undefined); // a use of a local
    assert.match(hover('; ; i').markdown, /semicolon/); // separators have hovers too
  });

  test('columns after non-ASCII text (UTF-16) line up', () => {
    const h = hover('nameof(Main)');
    assert.match(h.markdown, /\*\*`nameof`\*\*/);
    assert.equal(L.text(h.span), 'nameof');
    const s = scope('{ "héllo');
    assert.equal(L.text(s.primary), '{ "héllo 👋", "world", nameof(Main) }');
    assert.deepEqual(s.boundaries.map((b) => L.text(b)), ['{', '}']);
  });
});

describe('C# scopes', () => {
  const circleStart = 'public sealed partial class Circle : Shape\n{';
  const circleEnd = 'public static implicit operator double(Circle c) => c.radius;\n}';

  test('class keyword, modifiers and class name highlight the whole class', () => {
    for (const s of [scope('class Circle'), scope('sealed'), scope('Circle : Shape', 0, 2)]) {
      const t = L.text(s.primary);
      assert.ok(t.startsWith(circleStart), t);
      assert.ok(t.endsWith(circleEnd), t);
    }
    assert.deepEqual(scope('class Circle').boundaries.map((b) => L.text(b)), ['class', '}']);
  });

  test('the cursor just after a keyword still counts', () => {
    const s = scope('class Circle', 0, 5, true);
    assert.ok(L.text(s.primary).startsWith(circleStart));
    assert.equal(scope('class Circle', 0, 5, false), undefined);
  });

  test('method name and type parameter highlight the method', () => {
    const t = L.text(scope('Largest<T>(', 0, 1).primary);
    assert.ok(t.startsWith('static T Largest<T>(IEnumerable<T> items)') && t.endsWith('return best;\n    }'), t);
    assert.equal(L.text(scope('T>(IEnumerable').primary), t);
  });

  test('else highlights the whole if; get highlights its accessor', () => {
    assert.equal(L.text(scope('else continue').primary), 'if (path.Length > 0) break; else continue;');
    assert.equal(L.text(scope('get =>').primary), 'get => radius;');
  });

  test('var and a local name highlight the declaration statement', () => {
    const decl = 'var words = new List<string> { "héllo 👋", "world", nameof(Main) };';
    assert.equal(L.text(scope('var words').primary), decl);
    assert.equal(L.text(scope('words = new').primary), decl);
  });

  test('case highlights its switch section; catch its clause', () => {
    assert.equal(L.text(scope('case DayOfWeek.Saturday').primary), 'case DayOfWeek.Saturday:\n                goto weekend;');
    const c = L.text(scope('catch').primary);
    assert.ok(c.startsWith('catch (InvalidOperationException ex) when') && c.endsWith('}'), c);
  });

  test('lambda parameters highlight the lambda', () => {
    assert.equal(L.text(scope('a, b) =>').primary), '(a, b) => a + b');
  });

  test('return and throw also yield what they leave', () => {
    const r = scope('return best');
    assert.equal(L.text(r.primary), 'return best;');
    assert.ok(L.text(r.related).startsWith('static T Largest<T>'));
    const t = scope('throw new');
    assert.ok(L.text(t.related).startsWith('try\n        {\n            checked'));
  });

  test('a contextual keyword used as a name highlights its declaration', () => {
    const t = L.text(scope('file = new').primary);
    assert.ok(t.startsWith('using (var file = new global::System.IO.StringReader(json))') && t.endsWith('{ }'), t);
    assert.equal(scope('global::'), undefined);
  });

  test('goto and its label point at the labelled statement', () => {
    const g = scope('goto weekend');
    assert.ok(L.text(g.related).startsWith('weekend:\n        using'));
    assert.ok(L.text(scope('weekend;', 0, 1).primary).startsWith('weekend:'));
  });

  test('values, built-in types, plain identifiers and punctuation get no scope', () => {
    assert.equal(scope('null =>'), undefined);
    assert.equal(scope('int.MaxValue'), undefined);
    assert.equal(scope('best = item'), undefined);
    assert.equal(scope('; ; i'), undefined);
  });
});
