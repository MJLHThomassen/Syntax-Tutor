import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { load } from './helpers.mjs';

let L;
before(async () => {
  L = await load('c', 'c', 'tour.c');
});

const hoverC = (...args) => L.hover(...args);
const scopeC = (...args) => L.scope(...args);

describe('C hovers', () => {
  test('keywords get a doc with heading, example and link', () => {
    const h = hoverC('#include <stdio.h>');
    assert.match(h.markdown, /^\*\*`#include`\*\* · C keyword/);
    assert.match(h.markdown, /```c\n/);
    assert.match(h.markdown, /en\.cppreference\.com\/w\/c\/preprocessor\/include/);
    assert.match(hoverC('<stdio.h>').markdown, /system include/);
    assert.match(hoverC('typedef unsigned').markdown, /alias/);
  });

  test('context picks the right meaning of a token', () => {
    assert.match(hoverC('*next;').markdown, /pointer declarator/);
    assert.match(hoverC('*head = n').markdown, /dereference/);
    assert.match(hoverC('SQUARE(i) * 2', 0, 10).markdown, /multiply/);
    assert.match(hoverC('&pt;').markdown, /address-of/);
    assert.match(hoverC('0x0F & ~', 0, 5).markdown, /bitwise AND/);
    assert.match(hoverC('~0x1').markdown, /bitwise NOT/);
    assert.match(hoverC('pp->x', 0, 2).markdown, /member through pointer/);
    assert.match(hoverC('pt.x)', 0, 2).markdown, /\. \(member access\)/);
    assert.match(hoverC('.x = 1').markdown, /designated initializer/);
    assert.match(hoverC('? pt.x').markdown, /conditional/);
    assert.match(hoverC('argv[]', 0, 4).markdown, /array declarator/);
    assert.match(hoverC('nums[i] =', 0, 4).markdown, /indexing/);
    assert.match(hoverC('...)').markdown, /variadic/);
    assert.match(hoverC('(void)ready').markdown, /cast/);
    assert.match(hoverC('1u << 3', 0, 3).markdown, /left shift/);
    assert.match(hoverC('while (n > 0)').markdown, /do-while/);
    assert.match(hoverC('while (true)').markdown, /\*\*`while`\*\*/);
    assert.match(hoverC('#define SQUARE').markdown, /function-like macro/);
    assert.match(hoverC('#define MAX_ITEMS').markdown, /^\*\*`#define`\*\*/);
    assert.match(hoverC('#else').markdown, /condition above was false/);
  });

  test('static: file scope vs local variable', () => {
    assert.match(hoverC('static int counter').markdown, /^\*\*`static \(file scope\)`\*\*[\s\S]*only inside this source file/);
    assert.match(hoverC('static inline').markdown, /static \(file scope\)/);
    assert.match(hoverC('static int id').markdown, /^\*\*`static \(local variable\)`\*\*[\s\S]*keeps its value between calls/);
    assert.equal(L.text(scopeC('static int id').primary), 'static int id = 0;');
  });

  test('built-ins only match where they are really the built-in', () => {
    assert.match(hoverC('printf("one').markdown, /\*\*`printf`\*\* · C built-in function[\s\S]*%zu/);
    assert.match(hoverC('malloc(sizeof').markdown, /heap/);
    assert.match(hoverC('free(copy)').markdown, /malloc/);
    assert.match(hoverC('NULL) {').markdown, /C built-in value/);
    assert.match(hoverC('size_t length').markdown, /C built-in type/);
    assert.match(hoverC('unsigned long').markdown, /wraps around/);
    assert.match(hoverC('va_list args').markdown, /variadic/);
    assert.match(hoverC('va_start(').markdown, /C macro/);
    assert.match(hoverC('EXIT_FAILURE').markdown, /Exit status/);
    assert.equal(hoverC('length(list))'), undefined); // call of the user's own function
    assert.equal(hoverC('total += va_arg'), undefined); // a plain local variable
  });

  test('declaration names describe their role and type', () => {
    assert.match(hoverC('add(int a').markdown, /\*\*Function name\*\* · Defines the function `add`\. It returns `int`/);
    assert.match(hoverC('main(int').markdown, /where the program starts/);
    assert.match(hoverC('argv[]').markdown, /Parameter.*array of pointer to `char`/);
    assert.match(hoverC('head, int').markdown, /pointer to pointer to `Node`/);
    assert.match(hoverC('value) {').markdown, /by value/);
    assert.match(hoverC('op)(int').markdown, /pointer to function returning `int`/);
    assert.match(hoverC('greeting =').markdown, /Global variable.*pointer to `const char`/);
    assert.match(hoverC('counter = 0').markdown, /only visible in this file/);
    assert.match(hoverC('id = 0').markdown, /Static local variable.*keeps its value between calls/);
    assert.match(hoverC('shared_total').markdown, /External variable/);
    assert.match(hoverC('ulong;').markdown, /Typedef name.*`unsigned long`/);
    assert.match(hoverC('Node;').markdown, /Typedef name.*`struct Node`/);
    assert.match(hoverC('Point {').markdown, /Struct name.*`struct Point`/);
    assert.match(hoverC('GREEN = 5').markdown, /Enum constant.*value `5`/);
    assert.match(hoverC('BLUE }').markdown, /one more than the previous/);
    assert.match(hoverC('MAX_ITEMS 8').markdown, /Macro name.*`8`/);
    assert.match(hoverC('next;').markdown, /Field.*struct `Node`.*pointer to `struct Node`/);
    assert.match(hoverC('f;\n}').markdown, /Union member/);
    assert.match(hoverC('cleanup:').markdown, /\*\*Label\*\*/);
  });

  test('jump keywords say where they go', () => {
    assert.match(hoverC('return a + b').markdown, /returns from `static inline int add\(int a, int b\) \{`/);
    assert.match(hoverC('continue;').markdown, /continues `for \(i = 0; i < MAX_ITEMS; i\+\+\) \{`/);
    assert.match(hoverC('break;\n    default').markdown, /breaks out of `switch \(pt\.x\) \{`/);
    assert.match(hoverC('break;\n    }').markdown, /breaks out of `while \(true\) \{`/);
    assert.match(hoverC('goto cleanup').markdown, /jumps to `cleanup:`/);
  });

  test('literals', () => {
    assert.match(hoverC("'A'").markdown, /character constant[\s\S]*`int`/);
    assert.match(hoverC('"split "').markdown, /Adjacent literals are joined/);
    assert.match(hoverC('\\n");').markdown, /escape sequence/);
  });

  test('nothing for strings, comments, plain identifiers and punctuation', () => {
    assert.equal(hoverC('other\\n', 0, 0), undefined); // inside a string
    assert.match(hoverC('Hover anything').markdown, /line comment/); // comments get their own explanation
    assert.equal(hoverC('len++'), undefined);
    assert.equal(hoverC(', int b'), undefined);
    assert.equal(hoverC('n;\n}'), undefined); // `*head = n;`: a plain use
  });

  test('columns after non-ASCII text (UTF-16) line up', () => {
    const h = hoverC('";\nconst char *joined');
    assert.match(h.markdown, /string literal/);
    assert.equal(L.text(h.span), '"');
    assert.equal(hoverC('👋', 0, 1), undefined);
  });
});

describe('C scopes', () => {
  const mainHead = 'int main(int argc, char *argv[]) {';

  test('the function name and return highlight the function', () => {
    const t = L.text(scopeC('main(int').primary);
    assert.ok(t.startsWith(mainHead) && t.endsWith('return EXIT_FAILURE;\n}'), t);
    const r = scopeC('return EXIT_FAILURE');
    assert.equal(L.text(r.primary), 'return EXIT_FAILURE;');
    assert.ok(L.text(r.related).startsWith(mainHead));
  });

  test('keywords highlight their statement, outlined with the keyword and closing brace', () => {
    const s = scopeC('if (n == NULL)');
    assert.equal(L.text(s.primary), 'if (n == NULL) {\n        return;\n    }');
    assert.deepEqual(s.boundaries.map((b) => L.text(b)), ['if', '}']);
  });

  test('else / else if highlight the whole if chain', () => {
    const t = L.text(scopeC('if (big < 0)').primary);
    assert.ok(t.startsWith('if (big < 0) {') && t.endsWith('length(list));\n    }'), t);
    assert.equal(L.text(scopeC('else if').primary), t);
    assert.equal(L.text(scopeC('if (big == 0)').primary), t);
    assert.equal(L.text(scopeC('else {').primary), t);
  });

  test('storage classes and qualifiers highlight the declaration', () => {
    assert.equal(L.text(scopeC('static int counter').primary), 'static int counter = 0;');
    assert.equal(L.text(scopeC('const char *greeting').primary), 'const char *greeting = "héllo 👋";');
    assert.equal(L.text(scopeC('volatile').primary), 'volatile bool ready = false;');
  });

  test('typedef struct: keyword and struct name include the whole typedef', () => {
    for (const s of [scopeC('typedef struct'), scopeC('Node {', 0, 0)]) {
      const t = L.text(s.primary);
      assert.ok(t.startsWith('typedef struct Node {') && t.endsWith('} Node;'), t);
    }
  });

  test('a struct type reference highlights its definition', () => {
    const t = L.text(scopeC('Point pt').primary);
    assert.ok(t.startsWith('struct Point {\n    int x;'), t);
  });

  test('preprocessor conditionals highlight the whole block', () => {
    const t = L.text(scopeC('#ifdef').primary);
    assert.ok(t.startsWith('#ifdef DEBUG') && t.endsWith('#endif'), t);
    assert.equal(L.text(scopeC('#else').primary), t);
  });

  test('break and continue target the loop or switch', () => {
    const b = scopeC('break;\n    default');
    assert.ok(L.text(b.related).startsWith('switch (pt.x) {'));
    const c = scopeC('continue;');
    assert.ok(L.text(c.related).startsWith('for (i = 0;'));
  });

  test('goto and its label point at the labelled statement', () => {
    const s = scopeC('goto cleanup');
    assert.ok(L.text(s.related).startsWith('cleanup:\n    LOG('));
    assert.ok(L.text(scopeC('cleanup;', 0, 0).primary).startsWith('cleanup:'));
  });

  test('declaration names highlight their declaration', () => {
    assert.equal(L.text(scopeC('value) {').primary), 'int value');
    assert.equal(L.text(scopeC('op)(int').primary), 'int (*op)(int, int) = add;');
    assert.equal(L.text(scopeC('GREEN').primary), 'GREEN = 5');
  });

  test('the cursor just after a keyword still counts', () => {
    const s = scopeC('switch (pt', 0, 6, true);
    assert.ok(L.text(s.primary).startsWith('switch (pt.x) {'));
    assert.equal(scopeC('switch (pt', 0, 6, false), undefined); // that's the space
  });

  test('values, types, plain identifiers and punctuation get no scope', () => {
    assert.equal(scopeC('NULL) {'), undefined);
    assert.equal(scopeC('int x;'), undefined);
    assert.equal(scopeC('len++'), undefined);
    assert.equal(scopeC(', int b'), undefined);
  });

  test('braces highlight their block', () => {
    const s = scopeC('{\n    return a + b');
    assert.equal(L.text(s.primary), '{\n    return a + b;\n}');
    assert.deepEqual(s.boundaries.map((b) => L.text(b)), ['{', '}']);
  });
});
