import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { load } from './helpers.mjs';

let L;
before(async () => {
  L = await load('cpp', 'cpp', 'tour.cpp');
});

const hoverCpp = (...args) => L.hover(...args);
const scopeCpp = (...args) => L.scope(...args);

describe('C++ hovers', () => {
  test('keywords get a doc with heading, example and a C++ link', () => {
    const h = hoverCpp('class Shape');
    assert.match(h.markdown, /^\*\*`class`\*\* · C\+\+ keyword/);
    assert.match(h.markdown, /```cpp\n/);
    assert.match(h.markdown, /en\.cppreference\.com\/w\/cpp\/language\/class/);
    // Shared C docs link to the C++ pages too.
    assert.match(hoverCpp('#include <iostream>').markdown, /w\/cpp\/preprocessor\/include/);
  });

  test('context picks the right meaning of a token', () => {
    assert.match(hoverCpp('&os,').markdown, /& \(reference\)/);
    assert.match(hoverCpp('&&text').markdown, /rvalue reference/);
    assert.match(hoverCpp('&& who').markdown, /logical AND/);
    assert.match(hoverCpp('*age <<').markdown, /dereference/);
    assert.match(hoverCpp('*raw').markdown, /pointer declarator/);
    assert.match(hoverCpp('os << "Rect(', 0, 3).markdown, /^\*\*`<< \(stream output\)`\*\*/);
    assert.match(hoverCpp('<< owned.size()').markdown, /stream output/);
    assert.match(hoverCpp('<< 1)').markdown, /^\*\*`<< \(left shift\)`\*\*/);
    assert.match(hoverCpp('[factor]').markdown, /lambda/);
    assert.match(hoverCpp('&](int', 0, 0).markdown, /capture by reference/);
    assert.match(hoverCpp('=] {').markdown, /capture by copy/);
    assert.match(hoverCpp('~Shape').markdown, /destructor/);
    assert.match(hoverCpp('::cout').markdown, /scope resolution/);
    assert.match(hoverCpp('... + rest').markdown, /fold expression/);
    assert.match(hoverCpp('... rest)').markdown, /function parameter pack/);
    assert.match(hoverCpp('typename... Rest').markdown, /parameter pack/);
    assert.match(hoverCpp('class Level').markdown, /scoped enum/);
    assert.match(hoverCpp('for (const auto').markdown, /range-based for/);
    assert.match(hoverCpp('[who', 0, 0).markdown, /structured binding/);
    assert.match(hoverCpp('= default', 0, 2).markdown, /^\*\*`= default`\*\*/);
    assert.match(hoverCpp(': width_').markdown, /member initializer list/);
    assert.match(hoverCpp(': public Shape').markdown, /inheritance/);
    assert.match(hoverCpp('operator*').markdown, /overloaded operator/);
    assert.match(hoverCpp('*(double k)').markdown, /operator\* \(overloaded operator\)/);
    assert.match(hoverCpp('using namespace', 0, 6).markdown, /using-directive/);
    assert.match(hoverCpp('static inline').markdown, /^\*\*`static \(class member\)`\*\*[\s\S]*belongs to the \*\*class itself/);
  });

  test('keywords of classes, templates, exceptions and modern C++', () => {
    assert.match(hoverCpp('virtual double').markdown, /run time/);
    assert.match(hoverCpp('override {').markdown, /base class/);
    assert.match(hoverCpp('final').markdown, /inherit/);
    assert.match(hoverCpp('explicit').markdown, /implicit/);
    assert.match(hoverCpp('friend').markdown, /private/);
    assert.match(hoverCpp('mutable int').markdown, /`const` member functions/);
    assert.match(hoverCpp('noexcept {').markdown, /never throws/);
    assert.match(hoverCpp('consteval').markdown, /compile time/);
    assert.match(hoverCpp('decltype').markdown, /declared type/);
    assert.match(hoverCpp('new Rect').markdown, /heap/);
    assert.match(hoverCpp('delete raw').markdown, /`new`/);
    assert.match(hoverCpp('concept').markdown, /C\+\+20/);
    assert.match(hoverCpp('typename T>\nconcept').markdown, /type parameter/);
    assert.match(hoverCpp('static_cast').markdown, /\*\*`static_cast`\*\* · C\+\+ keyword/);
    assert.match(hoverCpp('dynamic_cast').markdown, /checked/);
  });

  test('standard library names are explained where they really are std::', () => {
    assert.match(hoverCpp('cout << owned').markdown, /^\*\*`std::cout`\*\* · C\+\+ built-in value/);
    assert.match(hoverCpp('endl;\n}').markdown, /flushes/);
    assert.match(hoverCpp('vector<T>').markdown, /dynamic array/);
    assert.match(hoverCpp('unique_ptr<geo').markdown, /sole owner/);
    assert.match(hoverCpp('make_unique').markdown, /^\*\*`std::make_unique`\*\* · C\+\+ built-in function/);
    assert.match(hoverCpp('is_arithmetic_v').markdown, /type trait/);
    assert.match(hoverCpp('move(text)').markdown, /steal/);
    assert.match(hoverCpp('runtime_error').markdown, /run time/);
    assert.match(hoverCpp('std::vector<int> nums').markdown, /standard library namespace/);
    assert.equal(hoverCpp('find(who)'), undefined); // a member function call, not std::find
    assert.match(hoverCpp('find(const std::map').markdown, /^\*\*Function name\*\*/); // the user's own find
    assert.equal(hoverCpp('find(ages, "ada")', 0, 0), undefined); // call of the user's find
    assert.equal(hoverCpp('size() <<'), undefined);
  });

  test('declaration names describe their role', () => {
    assert.match(hoverCpp('Rect(double w').markdown, /\*\*Constructor\*\*/);
    assert.match(hoverCpp('Shape() =').markdown, /\*\*Destructor\*\*/);
    assert.match(hoverCpp('area() const = 0').markdown, /Method name.*`Shape`.*pure virtual/);
    assert.match(hoverCpp('area() const override').markdown, /Method name.*`override`/);
    assert.match(hoverCpp('geo {').markdown, /\*\*Namespace\*\*/);
    assert.match(hoverCpp('Numeric =').markdown, /\*\*Concept\*\*/);
    assert.match(hoverCpp('T, typename').markdown, /must satisfy the concept `geo::Numeric`/);
    assert.match(hoverCpp('largest(const').markdown, /Function template name/);
    assert.match(hoverCpp('count_').markdown, /`static`: one copy shared/);
    assert.match(hoverCpp('item :').markdown, /Loop variable.*reference to `const auto`/);
    assert.match(hoverCpp('who, age]').markdown, /Structured binding/);
    assert.match(hoverCpp('factor](int').markdown, /Captured variable.*by copy/);
    assert.match(hoverCpp('width_(w)').markdown, /Member initializer/);
    assert.match(hoverCpp('Rect(side, side)').markdown, /Delegating constructor/);
    assert.match(hoverCpp('Rect;').markdown, /Using declaration.*`geo::Rect`/);
    assert.match(hoverCpp('&e)', 0, 1).markdown, /Caught exception/);
    assert.match(hoverCpp('scale =').markdown, /holds a lambda/);
    assert.match(hoverCpp('Level {').markdown, /scoped enum/);
  });

  test('jump keywords say where they go', () => {
    assert.match(hoverCpp('return n * factor').markdown, /returns from `\[factor\]\(int n\)/);
    assert.match(hoverCpp('throw std::invalid').markdown, /throws out of `T largest/);
    assert.match(hoverCpp('throw std::runtime').markdown, /is caught by a matching `catch` of `try \{`/);
    assert.match(hoverCpp('throw;').markdown, /rethrows the current exception out of `int main\(\) \{`/);
    assert.match(hoverCpp('continue;').markdown, /continues `for \(const auto &\[who, age\] : ages\) \{`/);
  });

  test('literals', () => {
    assert.match(hoverCpp('R"(').markdown, /raw string/);
    assert.match(hoverCpp('"moved"s', 0, 7).markdown, /user-defined literal/);
    assert.match(hoverCpp("' ' <<").markdown, /character/);
  });

  test('nothing for strings, comments, plain identifiers and punctuation', () => {
    assert.equal(hoverCpp('empty"', 0, 0), undefined); // inside a string
    assert.match(hoverCpp('Hover anything').markdown, /line comment/); // comments get their own explanation
    assert.equal(hoverCpp('best = item;'), undefined);
    assert.match(hoverCpp(', int> &ages').markdown, /comma/); // separators have hovers too
  });

  test('columns after non-ASCII text (UTF-16) line up', () => {
    const h = hoverCpp('s;\n    int factor');
    assert.match(h.markdown, /user-defined literal/);
    assert.equal(L.text(h.span), '"héllo 👋"s');
  });
});

describe('C++ scopes', () => {
  test('class keyword and name highlight the class', () => {
    for (const s of [scopeCpp('class Rect'), scopeCpp('Rect final')]) {
      const t = L.text(s.primary);
      assert.ok(t.startsWith('class Rect final : public Shape {') && t.endsWith('static inline int count_ = 0;\n}'), t);
    }
  });

  test('template keyword and template function name include the template line', () => {
    for (const s of [scopeCpp('template <typename T>\nT largest'), scopeCpp('largest(const')]) {
      const t = L.text(s.primary);
      assert.ok(t.startsWith('template <typename T>\nT largest(') && t.endsWith('return best;\n}'), t);
    }
  });

  test('method qualifiers highlight the whole method', () => {
    const method = 'double area() const override { return width_ * height_; }';
    assert.equal(L.text(scopeCpp('override {').primary), method);
    assert.equal(L.text(scopeCpp('const override').primary), method);
    assert.equal(L.text(scopeCpp('virtual double').primary), 'virtual double area() const = 0;');
  });

  test('catch highlights the whole try statement', () => {
    const t = L.text(scopeCpp('catch (const').primary);
    assert.ok(t.startsWith('try {') && t.endsWith('throw;\n    }'), t);
    assert.equal(L.text(scopeCpp('try {').primary), t);
  });

  test('throw inside try relates to the try statement', () => {
    const s = scopeCpp('throw std::runtime');
    assert.equal(L.text(s.primary), 'throw std::runtime_error("no numbers");');
    assert.ok(L.text(s.related).startsWith('try {'));
  });

  test('lambda captures highlight the whole lambda', () => {
    const lambda = '[factor](int n) { return n * factor; }';
    assert.equal(L.text(scopeCpp('[factor]').primary), lambda);
    assert.equal(L.text(scopeCpp('factor](int').primary), lambda);
    assert.equal(L.text(scopeCpp('mutable {').primary), '[&](int n) mutable { factor += n; return factor; }');
  });

  test('namespace and range-for', () => {
    const ns = L.text(scopeCpp('namespace geo').primary);
    assert.ok(ns.startsWith('namespace geo {') && ns.endsWith('}'), ns);
    const loop = L.text(scopeCpp('for (int &n').primary);
    assert.equal(loop, 'for (int &n : nums) {\n        n = scale(n);\n    }');
  });

  test('values, types, std names and punctuation get no scope', () => {
    assert.equal(scopeCpp('nullopt'), undefined);
    assert.equal(scopeCpp('cout << owned'), undefined);
    assert.equal(scopeCpp('int factor'), undefined);
    assert.equal(scopeCpp(', int> &ages'), undefined);
  });
});
