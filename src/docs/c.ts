import type { Node } from 'web-tree-sitter';
import type { DocEntry, DocTable, JumpTarget, LanguageSpec, Role } from '../core/model';
import { ancestor, fieldOf } from '../core/nodes';
import { cComments } from './comments';

// C and C++ share most of their syntax (and their tree-sitter grammars share
// node types), so this file holds everything both need. cpp.ts builds on it.

export type Lang = 'c' | 'cpp';

const CPPREF = 'https://en.cppreference.com/w/';

/** cppreference link for C, or for C++ (where the page path sometimes differs). */
export const refFor =
  (lang: Lang) =>
  (cPath: string, cppPath: string = cPath): string =>
    lang === 'c' ? `${CPPREF}c/${cPath}` : `${CPPREF}cpp/${cppPath}`;

/** The doc table for the C part of the language, with links for `lang`. */
export function buildCDocs(lang: Lang): DocTable {
  const ref = refFor(lang);
  const kw = (k: string) => ref(`keyword/${k}`);
  const isCpp = lang === 'cpp';
  return {
    // ------------------------------------------------------------ preprocessor
    '#include': {
      kind: 'keyword',
      summary: 'Pastes the contents of another file (a *header*) here before compiling. Headers declare the functions, types and macros you want to use.',
      details: '`<stdio.h>` searches the system/library include paths; `"mine.h"` looks next to this file first. Including only *declares* things: the code itself comes from a library or another `.c` file at link time.',
      example: '#include <stdio.h>   // standard library\n#include "list.h"    // your own header',
      link: ref('preprocessor/include'),
    },
    '#system_lib_string': {
      kind: 'literal',
      title: '<header> (system include)',
      summary: 'Angle brackets: look for this header in the compiler\'s system / library include directories (not next to this file).',
      link: ref('preprocessor/include'),
    },
    '#define': {
      kind: 'keyword',
      summary: 'Defines a **macro**: from here on the preprocessor replaces the name with the text after it, before the compiler ever sees the code.',
      details: 'It is plain text substitution, not a variable: there is no type and no scope. Convention: macro names are `UPPER_CASE`. Prefer `const` variables or `enum`s for constants when you can.',
      example: '#define MAX_ITEMS 8\nint items[MAX_ITEMS];   // becomes: int items[8];',
      link: ref('preprocessor/replace'),
    },
    'preproc_function_def/#define': {
      kind: 'keyword',
      title: '#define NAME(args) (function-like macro)',
      summary: 'Defines a **function-like macro**: uses like `NAME(x)` are replaced by the body with the arguments pasted in as text.',
      details: 'Wrap every parameter and the whole body in parentheses: `#define SQUARE(x) x * x` turns `SQUARE(1 + 2)` into `1 + 2 * 1 + 2`. Arguments may be evaluated more than once, so `SQUARE(i++)` is a bug. Inside the body, `#x` turns an argument into a string and `a##b` glues two tokens together.',
      example: '#define SQUARE(x) ((x) * (x))\n#define STR(x) #x        // STR(hi) -> "hi"\n#define GLUE(a, b) a##b  // GLUE(x, 1) -> x1',
      link: ref('preprocessor/replace'),
    },
    '#undef': {
      kind: 'keyword',
      summary: 'Removes a macro definition made with `#define`.',
      example: '#undef MAX_ITEMS',
      link: ref('preprocessor/replace'),
    },
    '#ifdef': {
      kind: 'keyword',
      summary: 'Conditional compilation: the lines up to the matching `#else`/`#endif` are only compiled if the macro is defined.',
      details: 'Macros are often set from the build, e.g. `cc -DDEBUG main.c`. The skipped code is not compiled at all, so it may even contain errors.',
      example: '#ifdef DEBUG\n    printf("x = %d\\n", x);\n#endif',
      link: ref('preprocessor/conditional'),
    },
    '#ifndef': {
      kind: 'keyword',
      summary: 'Conditional compilation: the following lines are only compiled if the macro is **not** defined.',
      details: 'Classic use: an *include guard*, so a header\'s contents are only seen once even if it\'s included several times.',
      example: '#ifndef LIST_H\n#define LIST_H\n/* declarations */\n#endif',
      link: ref('preprocessor/conditional'),
    },
    '#if': {
      kind: 'keyword',
      summary: 'Conditional compilation: the following lines are only compiled if the constant expression is non-zero. Undefined names count as `0`.',
      example: '#if defined(_WIN32) && VERSION >= 2\n/* ... */\n#endif',
      link: ref('preprocessor/conditional'),
    },
    '#elif': {
      kind: 'keyword',
      summary: '"else if" for conditional compilation: checked when the previous `#if`/`#elif` branches were all false.',
      link: ref('preprocessor/conditional'),
    },
    '#else': {
      kind: 'keyword',
      summary: 'Conditional compilation: these lines are compiled when the `#if`/`#ifdef` condition above was false.',
      link: ref('preprocessor/conditional'),
    },
    '#endif': {
      kind: 'keyword',
      summary: 'Ends a conditional-compilation block started by `#if`, `#ifdef` or `#ifndef`.',
      link: ref('preprocessor/conditional'),
    },
    defined: {
      kind: 'operator',
      title: 'defined(NAME)',
      summary: 'In `#if`/`#elif`: `1` if the macro is defined, `0` otherwise. Lets you combine checks, unlike `#ifdef`.',
      example: '#if defined(DEBUG) || defined(TRACE)',
      link: ref('preprocessor/conditional'),
    },
    '#pragma': {
      kind: 'keyword',
      summary: 'A compiler-specific instruction. Unknown pragmas are ignored. Common: `#pragma once` (include this header only once).',
      link: ref('preprocessor/impl'),
    },
    '#error': {
      kind: 'keyword',
      summary: 'Stops compilation with the given message. Used inside `#if` blocks to reject unsupported configurations.',
      example: '#if !defined(__STDC__)\n#error "needs a standard C compiler"\n#endif',
      link: ref('preprocessor/error'),
    },
    '#line': {
      kind: 'keyword',
      summary: 'Changes the line number (and file name) the compiler reports. Mostly used by code generators.',
      link: ref('preprocessor/line'),
    },

    // -------------------------------------------------------------- keywords
    typedef: {
      kind: 'keyword',
      summary: 'Gives an existing type a new name (an alias). It does **not** create a new type: the alias and the original are interchangeable.',
      details: 'Often used so you can write `Node` instead of `struct Node`. Read the declaration as if `typedef` weren\'t there: the name sits where a variable name would be.',
      example: 'typedef unsigned long ulong;\ntypedef struct Node { int value; struct Node *next; } Node;\ntypedef int (*Compare)(const void *, const void *);',
      link: ref('language/typedef'),
    },
    struct: {
      kind: 'keyword',
      summary: isCpp
        ? 'Declares a structure type: a group of named members. In C++ a `struct` is exactly a `class` whose members are **public** by default.'
        : 'Declares a **structure**: a type that groups named fields, laid out one after another in memory. Access fields with `.` (or `->` through a pointer).',
      details: isCpp
        ? 'By convention `struct` is used for simple data holders and `class` for types with invariants and private state.'
        : 'In C the type is called `struct Point`, not just `Point`; use `typedef` if you want a shorter name. Structs are copied by value when assigned or passed to functions.',
      example: 'struct Point {\n    int x;\n    int y;\n};\nstruct Point p = { .x = 1, .y = 2 };',
      link: ref('language/struct', 'language/class'),
    },
    union: {
      kind: 'keyword',
      summary: 'Declares a **union**: like a struct, but all members share the same memory, so it holds only one of them at a time. Its size is that of the largest member.',
      details: 'Reading a different member than the one last written reinterprets the bytes (allowed in C, undefined behaviour in C++). Usually paired with a "tag" field saying which member is valid.',
      example: 'union Number {\n    int i;\n    float f;\n};',
      link: ref('language/union'),
    },
    enum: {
      kind: 'keyword',
      summary: isCpp
        ? 'Declares an **enumeration**: a type with named integer constants. Plain `enum` names leak into the surrounding scope and convert to `int`; prefer `enum class` in C++.'
        : 'Declares an **enumeration**: named integer constants. Values start at 0 and count up unless you give one explicitly.',
      details: isCpp
        ? undefined
        : 'Enum constants are plain `int`s in C: nothing stops you from storing any other number in an enum variable.',
      example: 'enum Color { RED, GREEN = 5, BLUE };  // 0, 5, 6',
      link: ref('language/enum'),
    },
    sizeof: {
      kind: 'operator',
      summary: 'The size in bytes of a type or of an expression\'s type, computed at compile time. The result has type `size_t`.',
      details: 'Parentheses are needed for a type (`sizeof(int)`) but optional for an expression (`sizeof x`). On an array it gives the whole array\'s size, but on a pointer (including an array parameter!) only the pointer\'s size. Number of elements: `sizeof arr / sizeof arr[0]`.',
      example: 'Node *n = malloc(sizeof(Node));\nsize_t count = sizeof nums / sizeof nums[0];',
      link: ref('language/sizeof'),
    },
    static: {
      kind: 'keyword',
      summary: 'Means different things depending on where it is used:',
      details: [
        '- **On a global variable or function**: visible only inside this source file (*internal linkage*), like "private to this file".',
        '- **On a local variable**: the variable lives for the whole program and keeps its value between calls; it is initialized only once.',
        ...(isCpp ? ['- **On a class member**: the member belongs to the class itself, not to each object (one shared copy; no `this`).'] : []),
      ].join('\n'),
      example: isCpp
        ? 'static int helper(int x);      // only in this file\nint next_id() {\n    static int id = 0;          // survives between calls\n    return ++id;\n}\nstruct Counter { static int count; };'
        : 'static int helper(int x);      // only in this file\nint next_id() {\n    static int id = 0;          // survives between calls\n    return ++id;\n}',
      link: kw('static'),
    },
    'array_declarator/static': {
      kind: 'keyword',
      title: '[static N] (array parameter)',
      summary: 'In an array parameter: promises the caller passes a pointer to **at least N** elements (never `NULL`). Lets the compiler warn and optimize.',
      example: 'void fill(int buf[static 16]);',
      link: ref('language/array'),
    },
    extern: {
      kind: 'keyword',
      summary: '**Declares** a variable or function without defining it: "this exists somewhere else (in another file or library), the linker will find it".',
      details: 'Put `extern` declarations in a header and the single definition (without `extern`) in one `.c` file. Functions are `extern` by default.',
      example: '// counter.h\nextern int counter;\n// counter.c\nint counter = 0;',
      link: kw('extern'),
    },
    auto: {
      kind: 'keyword',
      summary: 'In old C, marks a local variable with automatic storage (the default anyway, so nobody writes it). Since C23 it also means "infer the type", like C++ `auto`.',
      example: 'auto x = 1.5;   // C23: x is a double',
      link: kw('auto'),
    },
    register: {
      kind: 'keyword',
      summary: 'An old hint to keep a local variable in a CPU register. Compilers ignore it today; the only effect is that you can\'t take the variable\'s address.',
      link: kw('register'),
    },
    inline: {
      kind: 'keyword',
      summary: 'Suggests the compiler paste the function\'s body at each call instead of calling it. Mostly it allows defining small functions in headers.',
      details: 'Compilers decide about inlining themselves; `inline` matters mostly for the linkage rules (`static inline` in a header is the simple, safe form).',
      example: 'static inline int max(int a, int b) { return a > b ? a : b; }',
      link: ref('language/inline'),
    },
    const: {
      kind: 'keyword',
      summary: 'Makes something read-only: the compiler rejects writes through this name.',
      details:
        '`const` applies to what is on its **left** (or right, if nothing is left): `const char *p` is a pointer to read-only chars (you can move `p`), `char *const p` is a read-only pointer to changeable chars. ' +
        (isCpp ? 'On a member function (`int size() const`) it promises not to modify the object.' : 'A `const` variable is not a compile-time constant in C (use `#define` or `enum` for array sizes).'),
      example: 'const int limit = 10;\nconst char *name = "ada";   // can\'t change the chars\nchar *const fixed = buf;    // can\'t change the pointer',
      link: ref('language/const', 'language/cv'),
    },
    volatile: {
      kind: 'keyword',
      summary: 'Tells the compiler the value may change outside the program\'s control (hardware registers, signal handlers), so every read and write must really happen.',
      details: '`volatile` does **not** make code thread-safe; use atomics or locks for that.',
      link: ref('language/volatile', 'language/cv'),
    },
    restrict: {
      kind: 'keyword',
      summary: 'A promise on a pointer: while it is in use, the memory it points to is accessed only through it (no other pointer aliases it). Lets the compiler optimize.',
      example: 'void *memcpy(void *restrict dst, const void *restrict src, size_t n);',
      link: ref('language/restrict'),
    },
    _Atomic: {
      kind: 'keyword',
      summary: 'Makes a type atomic: reads and writes are indivisible, so threads can share it safely without a lock.',
      link: ref('language/atomic'),
    },
    _Noreturn: {
      kind: 'keyword',
      summary: 'Marks a function that never returns to its caller (it exits, aborts, or loops forever). C23 spelling: `[[noreturn]]`.',
      example: '_Noreturn void die(const char *msg);',
      link: ref('language/_Noreturn', 'language/attributes/noreturn'),
    },
    thread_local: {
      kind: 'keyword',
      summary: 'Gives each thread its own separate copy of the variable (also spelled `_Thread_local` in C11).',
      link: ref('language/storage_duration'),
    },
    _Alignas: { kind: 'keyword', summary: 'Requires a variable to be stored at an address that is a multiple of the given alignment (bytes). C23 spelling: `alignas`.', example: '_Alignas(16) char buf[64];', link: ref('language/_Alignas', 'language/alignas') },
    alignas: { kind: 'keyword', summary: 'Requires a variable (or type) to be stored at an address that is a multiple of the given alignment in bytes.', example: 'alignas(16) char buf[64];', link: ref('language/_Alignas', 'language/alignas') },
    _Alignof: { kind: 'operator', summary: 'The alignment requirement (in bytes) of a type. C23 spelling: `alignof`.', link: ref('language/_Alignof', 'language/alignof') },
    alignof: { kind: 'operator', summary: 'The alignment requirement (in bytes) of a type: valid addresses for it are multiples of this number.', link: ref('language/_Alignof', 'language/alignof') },
    _Generic: {
      kind: 'keyword',
      summary: 'Compile-time selection by type: picks the branch whose type matches the controlling expression. Used to build "overloaded" macros.',
      example: '#define abs_any(x) _Generic((x), int: abs, double: fabs)(x)',
      link: ref('language/generic'),
    },
    _Static_assert: {
      kind: 'keyword',
      summary: 'Checks a condition at **compile time** and fails the build with the message if it is false. C23 spelling: `static_assert`.',
      example: '_Static_assert(sizeof(int) == 4, "need 32-bit int");',
      link: ref('language/_Static_assert', 'language/static_assert'),
    },
    static_assert: {
      kind: 'keyword',
      summary: 'Checks a condition at **compile time** and fails the build (with the message) if it is false.',
      example: 'static_assert(sizeof(int) == 4, "need 32-bit int");',
      link: ref('language/_Static_assert', 'language/static_assert'),
    },
    typeof: {
      kind: 'keyword',
      summary: 'The type of an expression (C23, previously a GCC extension). Handy in macros.',
      example: 'typeof(x) copy = x;',
      link: ref('language/typeof'),
    },
    constexpr: {
      kind: 'keyword',
      summary: 'C23: declares a true compile-time constant, usable e.g. as an array size.',
      example: 'constexpr int N = 16;\nint buf[N];',
      link: ref('language/constexpr'),
    },
    __attribute__: {
      kind: 'keyword',
      summary: 'A GCC/Clang extension that attaches extra information to a declaration, e.g. `unused`, `packed`, `format(printf, 1, 2)`.',
      example: '__attribute__((unused)) static int debug_only;',
      link: ref('language/attributes'),
    },
    asm: { kind: 'keyword', summary: 'Embeds raw assembly code. Its syntax depends on the compiler and CPU.', link: ref('language/asm') },
    'attribute_declaration/[[': {
      kind: 'syntax',
      title: '[[attribute]]',
      summary: 'A standard attribute: extra information for the compiler, e.g. `[[nodiscard]]` (warn if the result is ignored), `[[maybe_unused]]`, `[[fallthrough]]`, `[[deprecated]]`.',
      example: '[[nodiscard]] int parse(const char *s);',
      link: ref('language/attributes'),
    },

    // ---------------------------------------------------------- control flow
    if: {
      kind: 'keyword',
      summary: 'Runs the next statement (or `{ }` block) only if the condition in parentheses is true, i.e. **non-zero**.',
      details: 'Any number or pointer works as a condition: `0` and `NULL` are false, everything else is true. Watch out for `if (x = 0)` (assignment!) when you mean `if (x == 0)`.',
      example: 'if (n == NULL) {\n    return;\n} else if (n->value > 0) {\n    puts("positive");\n} else {\n    puts("other");\n}',
      link: ref('language/if'),
    },
    else: {
      kind: 'keyword',
      summary: 'The branch of an `if` that runs when the condition is false. `else if` chains further conditions.',
      details: 'A dangling `else` belongs to the **nearest** `if`. Use braces to avoid surprises.',
      link: ref('language/if'),
    },
    switch: {
      kind: 'keyword',
      summary: 'Jumps to the `case` label matching an integer (or enum/char) value, or to `default`.',
      details: '**Cases fall through**: execution continues into the next case unless you write `break`. Case labels must be constants; strings can\'t be switched on.',
      example: 'switch (c) {\ncase \'a\':\ncase \'e\':\n    vowels++;\n    break;\ndefault:\n    others++;\n}',
      link: ref('language/switch'),
    },
    case: {
      kind: 'keyword',
      summary: 'A label inside a `switch`: execution jumps here when the value equals this constant, and then **continues into the following cases** until a `break`.',
      link: ref('language/switch'),
    },
    default: {
      kind: 'keyword',
      summary: 'The label in a `switch` that is jumped to when no `case` matches. It can appear anywhere, and also falls through without `break`.',
      link: ref('language/switch'),
    },
    for: {
      kind: 'keyword',
      summary: 'A loop with three parts: `for (init; condition; step)`. The init runs once, the condition is checked before each iteration, the step runs after each iteration.',
      details: 'Any part may be empty: `for (;;)` loops forever. A variable declared in the init only exists inside the loop.',
      example: 'for (int i = 0; i < n; i++) {\n    total += nums[i];\n}',
      link: ref('language/for'),
    },
    while: {
      kind: 'keyword',
      summary: 'Repeats the body as long as the condition is true (non-zero). The condition is checked **before** each iteration, so the body may run zero times.',
      example: 'while (p != NULL) {\n    p = p->next;\n}',
      link: ref('language/while'),
    },
    do: {
      kind: 'keyword',
      summary: 'A `do { ... } while (condition);` loop: the body runs **at least once**, the condition is checked after each iteration.',
      details: 'Note the semicolon after `while (...)`.',
      example: 'do {\n    c = getchar();\n} while (c != \'\\n\' && c != EOF);',
      link: ref('language/do'),
    },
    'do_statement/while': {
      kind: 'keyword',
      title: 'while (in do-while)',
      summary: 'The condition of a `do ... while` loop, checked **after** each run of the body. Needs a `;` at the end.',
      link: ref('language/do'),
    },
    break: {
      kind: 'keyword',
      summary: 'Leaves the innermost `for`/`while`/`do` loop or `switch` immediately.',
      details: 'There are no labelled breaks in C: to leave nested loops, use a flag, a `return`, or `goto`.',
      link: ref('language/break'),
    },
    continue: {
      kind: 'keyword',
      summary: 'Skips the rest of this loop iteration and goes on with the next one. In a `for` loop the step (`i++`) still runs.',
      link: ref('language/continue'),
    },
    return: {
      kind: 'keyword',
      summary: 'Ends the current function and gives its result back to the caller. A `void` function uses a bare `return;` (or just reaches the end).',
      details: 'Never return the address of a local variable: it stops existing when the function returns.',
      example: 'int square(int x) {\n    return x * x;\n}',
      link: ref('language/return'),
    },
    goto: {
      kind: 'keyword',
      summary: 'Jumps to a label (`name:`) elsewhere in the same function.',
      details: 'Mostly avoided, but a common C idiom is `goto cleanup;` to run shared error-handling code at the end of a function.',
      example: 'if (!buf) goto fail;\n/* ... */\nfail:\n    free(other);\n    return -1;',
      link: ref('language/goto'),
    },

    // ----------------------------------------------------------- types
    int: { kind: 'type', summary: 'The basic signed integer type, at least 16 bits but **32 bits** on all common platforms (range about ±2.1 billion).', details: 'Signed overflow is *undefined behaviour*: the program may do anything, so don\'t rely on wrap-around.', link: ref('language/arithmetic_types', 'language/types') },
    char: { kind: 'type', summary: 'One byte. Holds a character code (like `\'A\'` = 65) and is also used as a small integer and for raw bytes.', details: 'Whether plain `char` is signed or unsigned depends on the platform. A C string is an array of `char` ending with `\'\\0\'`.', link: ref('language/arithmetic_types', 'language/types') },
    short: { kind: 'type', summary: 'A short integer, at least 16 bits (`short int`).', link: ref('language/arithmetic_types', 'language/types') },
    long: { kind: 'type', summary: 'A long integer, at least 32 bits: 64 bits on Linux/macOS, but 32 on Windows. `long long` is at least 64 bits everywhere.', link: ref('language/arithmetic_types', 'language/types') },
    signed: { kind: 'type', summary: 'Makes an integer type signed (it can hold negative numbers). Integers are signed by default, except that plain `char` may not be.', link: ref('language/arithmetic_types', 'language/types') },
    unsigned: { kind: 'type', summary: 'Makes an integer type unsigned: no negative values, and arithmetic **wraps around** (0 - 1 is the maximum value). `unsigned` alone means `unsigned int`.', details: 'Mixing signed and unsigned in a comparison converts the signed one: `-1 < 1u` is false!', link: ref('language/arithmetic_types', 'language/types') },
    float: { kind: 'type', summary: 'A single-precision (32-bit) floating-point number, about 7 significant digits. Literals need an `f` suffix: `1.5f`.', link: ref('language/arithmetic_types', 'language/types') },
    double: { kind: 'type', summary: 'A double-precision (64-bit) floating-point number, about 15 significant digits. Floating literals like `1.5` are `double` by default.', link: ref('language/arithmetic_types', 'language/types') },
    void: {
      kind: 'type',
      summary: '"No type": a function returning `void` returns nothing; `(void)` as a parameter list means "takes no arguments"; `void *` is a pointer to anything.',
      details: '`(void)x;` casts a value to `void` to say "I deliberately ignore this" (silences unused warnings). In C, `void *` converts to any other pointer type without a cast.',
      link: ref('language/arithmetic_types', 'language/types'),
    },
    _Bool: { kind: 'type', summary: 'The C99 boolean type: holds 0 or 1. Include `<stdbool.h>` to use the nicer names `bool`, `true` and `false`.', link: ref('language/arithmetic_types', 'language/types') },
    bool: {
      kind: 'type',
      summary: isCpp ? 'The boolean type: `true` or `false`. Converts to `1`/`0` in arithmetic.' : 'Boolean type, `true` or `false` (from `<stdbool.h>` before C23, a keyword since C23). It is really an integer that is always 0 or 1.',
      link: ref('language/arithmetic_types', 'language/types'),
    },
    size_t: {
      kind: 'type',
      summary: 'Unsigned integer type for sizes and counts: the result of `sizeof`, and what `strlen` and `malloc` use. Print it with `%zu`.',
      details: 'Being unsigned, `size_t i = 0; i - 1` is a huge number, so loops counting down with `i >= 0` never end.',
      link: ref('types/size_t'),
    },
    ssize_t: { kind: 'type', summary: 'POSIX signed counterpart of `size_t`: a size, or `-1` for an error (e.g. the result of `read`).', link: ref('types/size_t') },
    ptrdiff_t: { kind: 'type', summary: 'Signed integer type for the difference between two pointers into the same array.', link: ref('types/ptrdiff_t') },
    intptr_t: { kind: 'type', summary: 'A signed integer type big enough to hold a pointer value.', link: ref('types/integer') },
    uintptr_t: { kind: 'type', summary: 'An unsigned integer type big enough to hold a pointer value.', link: ref('types/integer') },
    ...Object.fromEntries(
      ['8', '16', '32', '64'].flatMap((bits) => [
        [`int${bits}_t`, { kind: 'type', summary: `A signed integer of exactly ${bits} bits (from \`<stdint.h>\`). Use the fixed-width types when the size matters, e.g. for file formats.`, link: ref('types/integer') } as DocEntry],
        [`uint${bits}_t`, { kind: 'type', summary: `An unsigned integer of exactly ${bits} bits (from \`<stdint.h>\`).`, link: ref('types/integer') } as DocEntry],
      ]),
    ),
    FILE: { kind: 'type', summary: 'An open file or stream, used through a `FILE *` from `fopen` (or `stdin`/`stdout`/`stderr`). You never look inside it.', link: ref('io/FILE', 'io/c/FILE') },
    va_list: { kind: 'type', summary: 'Holds the state for walking through the extra arguments of a variadic function (`...`). Used with `va_start`, `va_arg` and `va_end`.', link: ref('variadic/va_list', 'utility/variadic/va_list') },

    // ----------------------------------------------------------- values
    NULL: {
      kind: 'value',
      summary: isCpp ? 'The C null pointer macro. In C++ use `nullptr` instead.' : 'The **null pointer**: a pointer that points to nothing. Dereferencing it crashes (undefined behaviour), so check pointers before using them.',
      details: isCpp ? undefined : 'Functions like `malloc` and `fopen` return `NULL` on failure.',
      example: 'Node *n = malloc(sizeof *n);\nif (n == NULL) return -1;',
      link: ref('types/NULL'),
    },
    nullptr: { kind: 'value', summary: 'The null pointer constant (C23; long-standing in C++). Like `NULL`, but with its own type `nullptr_t`, so it can\'t be mistaken for the integer 0.', link: ref('language/nullptr') },
    true: { kind: 'value', summary: isCpp ? 'The `bool` value true.' : 'The value 1 as a `bool` (a macro from `<stdbool.h>` before C23, a keyword since).', link: ref('language/bool_constant', 'language/bool_literal') },
    false: { kind: 'value', summary: isCpp ? 'The `bool` value false.' : 'The value 0 as a `bool` (a macro from `<stdbool.h>` before C23, a keyword since).', link: ref('language/bool_constant', 'language/bool_literal') },
    EXIT_SUCCESS: { kind: 'value', summary: 'Exit status meaning success (0), for `return` from `main` or `exit()`.', link: ref('program/EXIT_status', 'utility/program/EXIT_status') },
    EXIT_FAILURE: { kind: 'value', summary: 'Exit status meaning failure (usually 1), for `return` from `main` or `exit()`.', link: ref('program/EXIT_status', 'utility/program/EXIT_status') },
    EOF: { kind: 'value', summary: 'A negative `int` (usually -1) returned by `getchar`, `fgetc`, `scanf`... at end of input or on error. That\'s why `getchar` returns `int`, not `char`.', link: ref('io', 'io/c') },
    stdin: { kind: 'value', summary: 'The standard input stream (`FILE *`): keyboard or piped input.', link: ref('io/std_streams', 'io/c/std_streams') },
    stdout: { kind: 'value', summary: 'The standard output stream (`FILE *`), where `printf` writes. Usually line-buffered on a terminal.', link: ref('io/std_streams', 'io/c/std_streams') },
    stderr: { kind: 'value', summary: 'The standard error stream (`FILE *`), for error messages. Unbuffered, and separate from `stdout` so errors still show when output is redirected.', link: ref('io/std_streams', 'io/c/std_streams') },
    errno: { kind: 'value', summary: 'A global error code set by library functions when they fail. Only meaningful right after a failed call; print it with `perror` or `strerror(errno)`.', link: ref('error/errno') },
    __func__: { kind: 'value', summary: 'A string with the name of the current function. Handy in log messages.', link: ref('language/function_definition', 'language/function') },
    __FILE__: { kind: 'value', summary: 'A predefined macro: the current source file name, as a string.', link: ref('preprocessor/replace') },
    __LINE__: { kind: 'value', summary: 'A predefined macro: the current line number.', link: ref('preprocessor/replace') },

    // ------------------------------------------------------ library functions
    printf: {
      kind: 'function',
      summary: 'Prints formatted text to stdout. The format string holds placeholders: `%d` int, `%u` unsigned, `%ld` long, `%zu` size_t, `%f` double, `%c` char, `%s` string, `%p` pointer, `%%` a percent sign.',
      details: 'The placeholders must match the argument types exactly; the compiler can\'t always check this, and a mismatch is undefined behaviour. Nothing is added automatically: write `\\n` yourself.',
      example: 'printf("%s is %d years old\\n", name, age);\nprintf("%5.2f|%-4d|\\n", 3.14159, 7);  // " 3.14|7   |"',
      link: ref('io/fprintf', 'io/c/fprintf'),
    },
    fprintf: { kind: 'function', summary: 'Like `printf`, but writes to the given stream, e.g. `fprintf(stderr, ...)` for error messages.', link: ref('io/fprintf', 'io/c/fprintf') },
    sprintf: { kind: 'function', summary: 'Like `printf`, but writes into a char buffer. **Unsafe**: it can overflow the buffer; use `snprintf`.', link: ref('io/fprintf', 'io/c/fprintf') },
    snprintf: { kind: 'function', summary: 'Formats like `printf` into a buffer of the given size, never writing past it. Returns the length the full text would have had.', example: 'char buf[32];\nsnprintf(buf, sizeof buf, "id-%d", id);', link: ref('io/fprintf', 'io/c/fprintf') },
    scanf: {
      kind: 'function',
      summary: 'Reads formatted input from stdin. You pass **addresses** where the values go: `scanf("%d", &n)`. Returns how many items were read successfully.',
      details: 'Always check the return value. `%s` without a width can overflow the buffer: use e.g. `%31s` for a `char[32]`. For whole lines, `fgets` is safer.',
      example: 'int n;\nif (scanf("%d", &n) != 1) {\n    /* not a number */\n}',
      link: ref('io/fscanf', 'io/c/fscanf'),
    },
    sscanf: { kind: 'function', summary: 'Like `scanf`, but reads from a string.', link: ref('io/fscanf', 'io/c/fscanf') },
    puts: { kind: 'function', summary: 'Prints a string followed by a newline to stdout.', link: ref('io/puts', 'io/c/puts') },
    putchar: { kind: 'function', summary: 'Writes one character to stdout.', link: ref('io/putchar', 'io/c/putchar') },
    getchar: { kind: 'function', summary: 'Reads one character from stdin; returns it as an `int`, or `EOF` at end of input.', link: ref('io/getchar', 'io/c/getchar') },
    fgets: { kind: 'function', summary: 'Reads a line (up to size-1 chars, including the `\\n`) into a buffer. Returns `NULL` at end of input. The safe way to read text lines.', example: 'char line[128];\nwhile (fgets(line, sizeof line, stdin)) { }', link: ref('io/fgets', 'io/c/fgets') },
    fopen: { kind: 'function', summary: 'Opens a file and returns a `FILE *`, or `NULL` on failure. Mode: `"r"` read, `"w"` write (truncates), `"a"` append, add `"b"` for binary.', example: 'FILE *f = fopen("data.txt", "r");\nif (!f) { perror("data.txt"); return 1; }', link: ref('io/fopen', 'io/c/fopen') },
    fclose: { kind: 'function', summary: 'Closes a file opened with `fopen`, flushing buffered output.', link: ref('io/fclose', 'io/c/fclose') },
    perror: { kind: 'function', summary: 'Prints your message plus a description of the current `errno` to stderr.', link: ref('io/perror', 'io/c/perror') },
    malloc: {
      kind: 'function',
      summary: 'Allocates a block of memory on the **heap** and returns a pointer to it, or `NULL` if that fails. The memory is **not** initialized.',
      details: 'Every `malloc` needs exactly one matching `free` when you are done, or memory leaks. Using the memory after `free` is a serious bug. ' + (isCpp ? 'In C++ prefer `new`, or better `std::make_unique` / containers.' : 'Idiom: `malloc(n * sizeof *p)` stays correct if the type of `p` changes.'),
      example: 'int *nums = malloc(n * sizeof *nums);\nif (nums == NULL) return -1;\n/* ... */\nfree(nums);',
      link: ref('memory/malloc', 'memory/c/malloc'),
    },
    calloc: { kind: 'function', summary: 'Allocates memory for `count` elements of `size` bytes each, **zero-initialized**. Returns `NULL` on failure. Free it with `free`.', example: 'int *grid = calloc(rows * cols, sizeof(int));', link: ref('memory/calloc', 'memory/c/calloc') },
    realloc: {
      kind: 'function',
      summary: 'Resizes a heap block, possibly moving it. Returns the new pointer (old contents kept), or `NULL` on failure, in which case the **old block is still valid**.',
      details: 'Don\'t write `p = realloc(p, n)`: on failure you lose the only pointer to the old block. Use a temporary.',
      example: 'int *bigger = realloc(nums, 2 * n * sizeof *nums);\nif (bigger) nums = bigger;',
      link: ref('memory/realloc', 'memory/c/realloc'),
    },
    free: {
      kind: 'function',
      summary: 'Releases memory obtained from `malloc`, `calloc` or `realloc`. `free(NULL)` does nothing.',
      details: 'After `free(p)`, `p` still holds the old address ("dangling pointer"): don\'t use it, and don\'t free it twice. Setting `p = NULL` afterwards helps.',
      link: ref('memory/free', 'memory/c/free'),
    },
    memcpy: { kind: 'function', summary: 'Copies `n` bytes from `src` to `dst`. The regions must not overlap (use `memmove` if they might).', example: 'memcpy(copy, original, len + 1);  // +1 for the \'\\0\'', link: ref('string/byte/memcpy') },
    memmove: { kind: 'function', summary: 'Copies `n` bytes like `memcpy`, but works correctly even if the regions overlap.', link: ref('string/byte/memmove') },
    memset: { kind: 'function', summary: 'Fills `n` bytes with one byte value. Usually used to zero memory: `memset(buf, 0, sizeof buf)`.', link: ref('string/byte/memset') },
    memcmp: { kind: 'function', summary: 'Compares `n` bytes; returns 0 if equal, negative/positive if the first differing byte is smaller/larger.', link: ref('string/byte/memcmp') },
    strlen: {
      kind: 'function',
      summary: 'The length of a C string: the number of chars before the terminating `\'\\0\'` (not counting it). It walks the whole string, so it is O(n).',
      details: 'It counts **bytes**, not characters: "héllo" is 6 bytes in UTF-8. Remember `+ 1` for the terminator when allocating a copy.',
      link: ref('string/byte/strlen'),
    },
    strcmp: { kind: 'function', summary: 'Compares two strings: returns 0 if equal, negative if the first sorts before the second, positive otherwise. (`==` on strings compares the **pointers**, not the text!)', example: 'if (strcmp(cmd, "quit") == 0) { }', link: ref('string/byte/strcmp') },
    strncmp: { kind: 'function', summary: 'Like `strcmp`, but compares at most `n` characters.', link: ref('string/byte/strncmp') },
    strcpy: { kind: 'function', summary: 'Copies a string including its `\'\\0\'`. **Unsafe**: nothing stops it from overflowing the destination buffer.', link: ref('string/byte/strcpy') },
    strncpy: { kind: 'function', summary: 'Copies at most `n` chars. Gotcha: if the source is too long, the result is **not** `\'\\0\'`-terminated.', link: ref('string/byte/strncpy') },
    strcat: { kind: 'function', summary: 'Appends one string to the end of another. The destination must have room for both.', link: ref('string/byte/strcat') },
    strchr: { kind: 'function', summary: 'Finds the first occurrence of a character in a string; returns a pointer to it or `NULL`.', link: ref('string/byte/strchr') },
    strstr: { kind: 'function', summary: 'Finds the first occurrence of a substring; returns a pointer to it or `NULL`.', link: ref('string/byte/strstr') },
    strdup: { kind: 'function', summary: 'Returns a `malloc`ed copy of a string (POSIX, standard since C23). Free it when done.', link: ref('string/byte/strdup') },
    atoi: { kind: 'function', summary: 'Converts a string to an `int`. Returns 0 on bad input, indistinguishable from "0"; `strtol` lets you detect errors.', link: ref('string/byte/atoi') },
    strtol: { kind: 'function', summary: 'Converts a string to a `long`, telling you (via `endptr`) where the number ended, so you can detect bad input.', link: ref('string/byte/strtol') },
    exit: { kind: 'function', summary: 'Ends the program immediately with the given status (`EXIT_SUCCESS`/`EXIT_FAILURE`), after flushing open files.', link: ref('program/exit', 'utility/program/exit') },
    abort: { kind: 'function', summary: 'Ends the program abnormally right away (no cleanup), e.g. after detecting a bug.', link: ref('program/abort', 'utility/program/abort') },
    qsort: { kind: 'function', summary: 'Sorts an array of any type, given the element count, element size and a comparison function returning negative/0/positive.', example: 'int cmp(const void *a, const void *b) {\n    return *(const int *)a - *(const int *)b;\n}\nqsort(nums, n, sizeof nums[0], cmp);', link: ref('algorithm/qsort') },
    rand: { kind: 'function', summary: 'A pseudo-random `int` between 0 and `RAND_MAX`. Seed it once with `srand(time(NULL))`. Not suitable for security.', link: ref('numeric/random/rand') },
    abs: { kind: 'function', summary: 'The absolute value of an `int` (`fabs` for doubles).', link: ref('numeric/math/abs') },
    sqrt: { kind: 'function', summary: 'Square root (`<math.h>`; link with `-lm` on Linux).', link: ref('numeric/math/sqrt') },
    assert: {
      kind: 'macro',
      summary: 'Checks a condition at run time; if it is false, prints the expression, file and line, and aborts. Disabled entirely when `NDEBUG` is defined.',
      details: 'For catching bugs, not for handling expected errors. Don\'t put code with side effects inside it.',
      example: 'assert(index < count);',
      link: ref('error/assert'),
    },
    va_start: { kind: 'macro', summary: 'Starts reading a variadic function\'s extra arguments; the second argument is the last named parameter.', example: 'va_list args;\nva_start(args, count);', link: ref('variadic/va_start', 'utility/variadic/va_start') },
    va_arg: { kind: 'macro', summary: 'Fetches the next variadic argument, as the type you name. Nothing checks that the caller really passed that type.', link: ref('variadic/va_arg', 'utility/variadic/va_arg') },
    va_end: { kind: 'macro', summary: 'Finishes reading variadic arguments; call it before the function returns.', link: ref('variadic/va_end', 'utility/variadic/va_end') },
    offsetof: { kind: 'macro', summary: 'The byte offset of a member inside a struct.', example: 'offsetof(struct Point, y)  // usually 4', link: ref('types/offsetof') },

    // --------------------------------------------------------------- operators
    'pointer_declarator/*': {
      kind: 'operator',
      title: '* (pointer declarator)',
      summary: 'In a declaration, `*` makes the name a **pointer**: a variable holding the memory address of a value of the given type.',
      details: 'The `*` belongs to the name, not the type: `int *a, b;` makes `a` a pointer but `b` a plain `int`. Read declarations from the name outwards: `char *argv[]` is "array of pointers to char".',
      example: 'int x = 5;\nint *p = &x;   // p holds the address of x\n*p = 6;        // x is now 6',
      link: ref('language/pointer'),
    },
    'abstract_pointer_declarator/*': {
      kind: 'operator',
      title: 'T * (pointer type)',
      summary: 'A pointer type without a name, as in a cast `(char *)p`, `sizeof(int *)` or a parameter in a prototype.',
      link: ref('language/pointer'),
    },
    'pointer_expression/*': {
      kind: 'operator',
      title: '* (dereference)',
      summary: '`*p` is **the value `p` points to**: read it or assign to it. The pointer must point to valid memory (not `NULL`, not freed).',
      example: '*head = n;      // store into what head points to\nint v = *p;     // read through p',
      link: ref('language/operator_member_access'),
    },
    'binary_expression/*': {
      kind: 'operator',
      title: '* (multiply)',
      summary: 'Multiplication. Integer results that don\'t fit overflow (undefined for signed types).',
      link: ref('language/operator_arithmetic'),
    },
    'pointer_expression/&': {
      kind: 'operator',
      title: '& (address-of)',
      summary: '`&x` gives the **address** of `x`: a pointer to it. Used to let a function modify a variable, or to point at an existing object.',
      example: 'scanf("%d", &n);   // scanf writes into n\npush(&list, 3);    // push may change list itself',
      link: ref('language/operator_member_access'),
    },
    'binary_expression/&': {
      kind: 'operator',
      title: '& (bitwise AND)',
      summary: 'Bitwise AND: each result bit is 1 only where **both** operands have a 1. Used to test or clear bits (masks).',
      details: 'Precedence trap: `x & 1 == 0` means `x & (1 == 0)`. Write `(x & 1) == 0`. For true/false logic use `&&`.',
      example: 'if (flags & FLAG_READ) { }\nlow = value & 0xFF;',
      link: ref('language/operator_arithmetic'),
    },
    'binary_expression/|': { kind: 'operator', title: '| (bitwise OR)', summary: 'Bitwise OR: each result bit is 1 where **either** operand has a 1. Used to combine flags. For true/false logic use `||`.', example: 'int mode = FLAG_READ | FLAG_WRITE;', link: ref('language/operator_arithmetic') },
    'binary_expression/^': { kind: 'operator', title: '^ (bitwise XOR)', summary: 'Bitwise exclusive OR: 1 where the operand bits differ. **Not** "to the power of": use `pow()` for that.', link: ref('language/operator_arithmetic') },
    'unary_expression/~': { kind: 'operator', title: '~ (bitwise NOT)', summary: 'Flips every bit. `x & ~MASK` clears the bits in `MASK`.', link: ref('language/operator_arithmetic') },
    'binary_expression/<<': {
      kind: 'operator',
      title: '<< (left shift)',
      summary: 'Shifts the bits left: `x << n` is `x` times 2ⁿ. `1u << k` makes a mask with only bit `k` set.',
      details: 'Shifting by the bit width or more, or shifting a negative number, is undefined. Use unsigned values for bit twiddling.',
      link: ref('language/operator_arithmetic'),
    },
    'binary_expression/>>': { kind: 'operator', title: '>> (right shift)', summary: 'Shifts the bits right: `x >> n` divides an unsigned value by 2ⁿ.', link: ref('language/operator_arithmetic') },
    'binary_expression/&&': {
      kind: 'operator',
      title: '&& (logical AND)',
      summary: 'True (1) if **both** sides are non-zero. Short-circuits: the right side isn\'t evaluated if the left is false.',
      example: 'if (p != NULL && p->value > 0) { }  // safe: p checked first',
      link: ref('language/operator_logical'),
    },
    'binary_expression/||': { kind: 'operator', title: '|| (logical OR)', summary: 'True (1) if **either** side is non-zero. Short-circuits: the right side isn\'t evaluated if the left is true.', link: ref('language/operator_logical') },
    'unary_expression/!': { kind: 'operator', title: '! (logical NOT)', summary: '1 if the operand is zero (or `NULL`), else 0. `if (!p)` means "if p is null".', link: ref('language/operator_logical') },
    'binary_expression/==': {
      kind: 'operator',
      title: '== (equal)',
      summary: 'Compares two values; the result is 1 (true) or 0 (false).',
      details: 'Don\'t confuse with `=` (assignment). On strings, `==` compares the pointers, not the text: use `strcmp`. Comparing floating-point results exactly is fragile.',
      link: ref('language/operator_comparison'),
    },
    'binary_expression//': { kind: 'operator', title: '/ (divide)', summary: 'Division. With two integers it is **integer division**, rounding toward zero: `7 / 2` is `3`. Make one side floating (`7 / 2.0`) to get `3.5`.', details: 'Dividing an integer by zero is undefined behaviour (usually a crash).', link: ref('language/operator_arithmetic') },
    'binary_expression/%': { kind: 'operator', title: '% (remainder)', summary: 'The remainder of integer division: `7 % 3` is `1`. Takes the sign of the left operand (`-7 % 3` is `-1`). Only for integers.', link: ref('language/operator_arithmetic') },
    'assignment_expression/=': {
      kind: 'operator',
      title: '= (assignment)',
      summary: 'Stores the right-hand value into the left-hand variable. An assignment is itself an expression with the assigned value, so `a = b = 0` works.',
      details: 'That is also why `if (x = 0)` compiles: it assigns and then tests 0. Compilers warn about it; you meant `==`.',
      link: ref('language/operator_assignment'),
    },
    'update_expression/++': {
      kind: 'operator',
      title: '++ (increment)',
      summary: 'Adds 1. `i++` gives the **old** value then increments; `++i` increments first and gives the new value. As a statement on its own they do the same.',
      details: 'Don\'t use the same variable twice in one expression with `++` (like `i = i++`): that is undefined behaviour.',
      link: ref('language/operator_incdec'),
    },
    'update_expression/--': { kind: 'operator', title: '-- (decrement)', summary: 'Subtracts 1. `n--` gives the old value, `--n` the new one.', link: ref('language/operator_incdec') },
    'field_expression/->': {
      kind: 'operator',
      title: '-> (member through pointer)',
      summary: '`p->field` accesses a member of the struct that `p` **points to**. It is shorthand for `(*p).field`.',
      details: 'Use `.` when you have the struct itself, `->` when you have a pointer to it.',
      example: 'struct Point pt = {1, 2};\nstruct Point *pp = &pt;\npt.x = 3;     // on the struct\npp->x = 4;    // through the pointer',
      link: ref('language/operator_member_access'),
    },
    'field_expression/.': {
      kind: 'operator',
      title: '. (member access)',
      summary: '`s.field` accesses a member of a struct or union value. Through a pointer, use `p->field` instead.',
      link: ref('language/operator_member_access'),
    },
    'field_designator/.': {
      kind: 'syntax',
      title: '.field = (designated initializer)',
      summary: 'Initializes a struct member **by name**. Members you don\'t mention are set to zero.',
      example: 'struct Point p = { .y = 2 };   // x is 0',
      link: ref('language/struct_initialization', 'language/aggregate_initialization'),
    },
    'subscript_designator/[': {
      kind: 'syntax',
      title: '[i] = (designated initializer)',
      summary: 'Initializes the array element at this index. Elements you don\'t mention are set to zero.',
      example: 'int days[12] = { [0] = 31, [1] = 28 };',
      link: ref('language/array_initialization', 'language/aggregate_initialization'),
    },
    'conditional_expression/?': {
      kind: 'operator',
      title: 'a ? b : c (conditional)',
      summary: 'An inline if/else that produces a value: if `a` is true the result is `b`, otherwise `c`. Only one of `b` and `c` is evaluated.',
      example: 'int big = x > y ? x : y;',
      link: ref('language/operator_other'),
    },
    'conditional_expression/:': {
      kind: 'operator',
      title: 'a ? b : c (conditional)',
      summary: 'Separates the two results of the conditional operator: the value after `:` is used when the condition is false.',
      link: ref('language/operator_other'),
    },
    'array_declarator/[': {
      kind: 'syntax',
      title: '[N] (array declarator)',
      summary: 'Declares an **array** of N elements, stored next to each other. Indexes go from `0` to `N-1`; nothing checks the bounds at run time.',
      details: 'Empty brackets let the initializer decide the size (`int a[] = {1, 2, 3};`). As a function **parameter**, `int a[]` really means `int *a`: arrays are passed as a pointer to their first element.',
      example: 'int nums[8] = {0};    // all zero\nchar name[] = "ada";  // 4 chars incl. \'\\0\'',
      link: ref('language/array'),
    },
    'subscript_expression/[': {
      kind: 'operator',
      title: 'a[i] (indexing)',
      summary: 'The element at index `i` (starting at 0). For pointers and arrays, `a[i]` means `*(a + i)`.',
      details: 'Reading or writing outside the array is undefined behaviour: it may silently corrupt other data.',
      link: ref('language/operator_member_access'),
    },
    'variadic_parameter/...': {
      kind: 'syntax',
      title: '... (variadic parameters)',
      summary: 'The function takes **any number of extra arguments** after the named ones, like `printf`. Read them with `va_start`/`va_arg`/`va_end`.',
      details: 'There is no type checking and no count: the function must find out from its named parameters (a count, or a format string) how many there are and what types.',
      example: 'int sum(int count, ...);\nsum(3, 10, 20, 30);',
      link: ref('language/variadic', 'language/variadic_arguments'),
    },
    'cast_expression/(': {
      kind: 'operator',
      title: '(type) cast',
      summary: 'Converts a value to another type, e.g. `(double)n` or `(unsigned char)c`. `(void)x` discards a value on purpose.',
      details: 'Casts silence the compiler, so they can hide real bugs (like casting away `const`). Use them sparingly.',
      example: 'double avg = (double)total / count;',
      link: ref('language/cast', 'language/explicit_cast'),
    },
    'compound_literal_expression/(': {
      kind: 'syntax',
      title: '(type){...} (compound literal)',
      summary: 'Creates an unnamed object of the given type in place, like a struct literal.',
      example: 'draw((struct Point){ .x = 1, .y = 2 });',
      link: ref('language/compound_literal', 'language/aggregate_initialization'),
    },
    'initializer_list/{': {
      kind: 'syntax',
      title: '{ ... } (initializer)',
      summary: 'Initial values for an array or struct, in order. Missing values are set to zero, so `= {0}` zeroes everything.',
      example: 'int nums[5] = {1, 2};   // 1, 2, 0, 0, 0',
      link: ref('language/struct_initialization', 'language/aggregate_initialization'),
    },
    'compound_statement/{': {
      kind: 'syntax',
      title: '{ } (block)',
      summary: 'A block groups statements. Local variables declared inside exist only until the closing `}`.',
      link: ref('language/statements'),
    },
    'bitfield_clause/:': {
      kind: 'syntax',
      title: ': N (bit-field)',
      summary: 'Makes the struct member use only N bits, to pack several small fields into one integer.',
      example: 'struct Flags {\n    unsigned ready : 1;\n    unsigned mode  : 3;\n};',
      link: ref('language/bit_field'),
    },

    // ---------------------------------------------------------------- literals
    '#char_literal': {
      kind: 'literal',
      title: "'c' (character constant)",
      summary: isCpp
        ? "A single character in single quotes. It has type `char`; its value is the character code (`'A'` is 65)."
        : "A single character in single quotes. Its value is the character's code, an **`int`** (`'A'` is 65), so you can do arithmetic like `c - '0'`.",
      details: "Single quotes are for one character, double quotes for strings: `'a'` is a number, `\"a\"` is an array of two chars (`'a'` and `'\\0'`). Prefixes `L'x'`, `u'x'`, `U'x'`, `u8'x'` pick wider character types.",
      link: ref('language/character_constant', 'language/character_literal'),
    },
    'string_literal/"': {
      kind: 'literal',
      title: '"..." (string literal)',
      summary: isCpp
        ? 'A C-style string literal: a read-only array of `const char` ending in `\'\\0\'`. Wrap it in `std::string` (or add the `s` suffix) to get a real string object.'
        : 'A string literal: a read-only array of `char` with a hidden `\'\\0\'` at the end, so `"hi"` takes 3 bytes. Text is stored as UTF-8 bytes in most setups.',
      details: 'Adjacent literals are joined at compile time: `"split " "string"` is one string (handy for long text). Don\'t modify a literal through a `char *`; that is undefined behaviour.',
      link: ref('language/string_literal'),
    },
    'string_literal/L"': { kind: 'literal', title: 'L"..." (wide string)', summary: 'A wide string of `wchar_t` characters (16 bits on Windows, 32 elsewhere).', link: ref('language/string_literal') },
    'string_literal/u8"': { kind: 'literal', title: 'u8"..." (UTF-8 string)', summary: 'A string literal guaranteed to be encoded as UTF-8.', link: ref('language/string_literal') },
    'string_literal/u"': { kind: 'literal', title: 'u"..." (UTF-16 string)', summary: 'A string of 16-bit `char16_t` code units, UTF-16 encoded.', link: ref('language/string_literal') },
    'string_literal/U"': { kind: 'literal', title: 'U"..." (UTF-32 string)', summary: 'A string of 32-bit `char32_t` code points, UTF-32 encoded.', link: ref('language/string_literal') },
    '#escape_sequence': {
      kind: 'literal',
      title: '\\ (escape sequence)',
      summary: 'A backslash escape for a character you can\'t type directly: `\\n` newline, `\\t` tab, `\\0` the null character, `\\\\` backslash, `\\"` quote, `\\x41` hex code.',
      link: ref('language/escape'),
    },
  };
}

// ---------------------------------------------------------------- declarators

/** Declarator nodes that wrap a declared name (innermost first when climbing). */
const DECLARATORS = new Set([
  'pointer_declarator',
  'array_declarator',
  'function_declarator',
  'parenthesized_declarator',
  'init_declarator',
  'attributed_declarator',
  'reference_declarator',
  'variadic_declarator',
  'qualified_identifier',
  'destructor_name',
]);

/** Declarations that own a declarator chain. */
const OWNERS = new Set([
  'declaration',
  'function_definition',
  'parameter_declaration',
  'optional_parameter_declaration',
  'variadic_parameter_declaration',
  'field_declaration',
  'type_definition',
  'for_range_loop',
  'friend_declaration',
]);

export interface Declared {
  /** Declarator wrappers from the name outwards. */
  chain: Node[];
  /** The declaration owning the declarator chain. */
  owner: Node;
}

/** If `node` is the name introduced by a C/C++ declaration, its declarator chain and owner. */
export function declaredName(node: Node): Declared | undefined {
  const chain: Node[] = [];
  let n = node;
  for (;;) {
    const p = n.parent;
    if (!p) return undefined;
    const field = fieldOf(n);
    if (DECLARATORS.has(p.type)) {
      // Only climb through the "declarator" slot (not array sizes, initial values, parameters...).
      const ok =
        p.type === 'qualified_identifier'
          ? field === 'name' && p.parent?.type === 'function_declarator'
          : p.type === 'destructor_name' || p.type === 'parenthesized_declarator' || p.type === 'reference_declarator' || p.type === 'variadic_declarator' || p.type === 'attributed_declarator'
            ? field === null || field === 'declarator'
            : field === 'declarator';
      if (!ok) return undefined;
      chain.push(p);
      n = p;
      continue;
    }
    if (OWNERS.has(p.type) && field === 'declarator') return { chain, owner: p };
    return undefined;
  }
}

const CV = new Set(['const', 'volatile', 'restrict', '_Atomic']);

function qualifiers(n: Node): string[] {
  return n.children.filter((c) => c?.type === 'type_qualifier' && CV.has(c.text)).map((c) => c!.text);
}

/** "pointer to const char"-style description of a declarator chain (the C "spiral rule"). */
export function describeType(chain: Node[], owner: Node): string {
  const parts: string[] = [];
  for (const d of chain) {
    switch (d.type) {
      case 'pointer_declarator': {
        const q = qualifiers(d);
        parts.push(`${q.length ? `${q.join(' ')} ` : ''}pointer to`);
        break;
      }
      case 'array_declarator': {
        const size = d.childForFieldName('size')?.text;
        parts.push(size ? `array of ${size}` : 'array of');
        break;
      }
      case 'function_declarator':
        parts.push('function returning');
        break;
      case 'reference_declarator':
        parts.push(d.children.some((c) => c?.type === '&&') ? 'rvalue reference to' : 'reference to');
        break;
    }
  }
  const typeNode = owner.childForFieldName('type');
  let type = typeNode?.text;
  if (typeNode && TYPE_SPECIFIERS.has(typeNode.type) && typeNode.childForFieldName('body')) {
    // `typedef struct Node { ... } Node;`: name the struct instead of quoting its whole body.
    const tag = typeNode.childForFieldName('name')?.text;
    type = tag ? `${TAG_WORD[typeNode.type]} ${tag}` : `${TAG_WORD[typeNode.type]} { ... }`;
  }
  const base = type ? [...qualifiers(owner), type].join(' ') : undefined;
  if (!base) return parts.join(' ').replace(/ (to|of|returning)$/, '');
  const deduced = /^(auto|decltype\(auto\))$/.test(type!) ? ' (the type is deduced from the initializer)' : '';
  return [...parts, `\`${base}\`${deduced}`].join(' ');
}

const hasChild = (n: Node, text: string) => n.children.some((c) => c?.text === text);
const storage = (n: Node, text: string) => n.children.some((c) => c?.type === 'storage_class_specifier' && c.text === text);

const FUNCTIONS = new Set(['function_definition', 'lambda_expression']);
const TYPE_SPECIFIERS = new Set(['struct_specifier', 'union_specifier', 'enum_specifier', 'class_specifier']);

/** The definition (with a body) of a struct/union/enum/class named `name`, anywhere in the file. */
export function findTypeDefinition(from: Node, kind: string, name: string): Node | undefined {
  for (const n of rootOf(from).descendantsOfType(kind)) {
    if (n && n.childForFieldName('body') && n.childForFieldName('name')?.text === name) return n;
  }
  return undefined;
}

/** The labeled statement `name:` in the function around `from`. */
function rootOf(n: Node): Node {
  let r = n;
  while (r.parent) r = r.parent;
  return r;
}

function labelled(name: string, from: Node): Node | undefined {
  const fn = ancestor(from, (n) => FUNCTIONS.has(n.type)) ?? rootOf(from);
  for (const l of fn.descendantsOfType('labeled_statement')) {
    if (l && l.childForFieldName('label')?.text === name) return l;
  }
  return undefined;
}

const TAG_WORD: Record<string, string> = { struct_specifier: 'struct', union_specifier: 'union', enum_specifier: 'enum', class_specifier: 'class' };
const TAG_TITLE: Record<string, string> = { struct_specifier: 'Struct', union_specifier: 'Union', enum_specifier: 'Enum', class_specifier: 'Class' };

/** Describe a name declared by a declarator chain (variables, functions, parameters, fields, typedefs). */
export function declaratorRole(node: Node, d: Declared, lang: Lang): Role | undefined {
  const { chain, owner } = d;
  const name = `\`${node.text}\``;
  // The first "real" declarator decides: a function_declarator directly around the name means a function.
  const first = chain.find((c) => c.type !== 'qualified_identifier' && c.type !== 'destructor_name' && c.type !== 'attributed_declarator');
  const isFunction = first?.type === 'function_declarator';
  const typeDesc = describeType(chain, owner);
  const rest = isFunction ? describeType(chain.slice(chain.indexOf(first!) + 1), owner) : '';
  const returns = rest === '`void`' ? ' It returns nothing (`void`).' : rest ? ` It returns ${rest}.` : '';

  if (isFunction) {
    const fd = first!;
    const defined = owner.type === 'function_definition';
    const inClass = owner.parent?.type === 'field_declaration_list' || (owner.parent?.type === 'template_declaration' && owner.parent.parent?.type === 'field_declaration_list');
    const qualified = chain.some((c) => c.type === 'qualified_identifier');
    const scope = owner.parent?.type === 'template_declaration' ? owner.parent : owner;
    if (lang === 'cpp' && (inClass || qualified || node.parent?.type === 'destructor_name' || node.type === 'field_identifier')) {
      const cls = inClass ? ancestor(owner, (n) => n.type === 'class_specifier' || n.type === 'struct_specifier') : undefined;
      const className = cls?.childForFieldName('name')?.text ?? (qualified ? chain.find((c) => c.type === 'qualified_identifier')?.childForFieldName('scope')?.text : undefined);
      const where = qualified && !inClass ? ' (defined outside its class)' : '';
      if (node.parent?.type === 'destructor_name') {
        return { title: 'Destructor', summary: `\`~${node.text}\` runs automatically when an object of \`${className ?? node.text}\` is destroyed (goes out of scope or is \`delete\`d)${where}. Use it to release resources.`, scope };
      }
      if (className && node.text === className) {
        return { title: 'Constructor', summary: `A constructor of \`${className}\`: runs when an object is created, to initialize its members${where}. It has no return type.`, scope };
      }
      const notes: string[] = [];
      if (storage(owner, 'static')) notes.push('`static`: called on the class (`Class::f()`), has no `this`.');
      if (hasChild(owner, 'virtual')) notes.push('`virtual`: calls through a base-class pointer/reference use the derived class\'s version.');
      if (fd.children.some((c) => c?.type === 'virtual_specifier' && c.text === 'override')) notes.push('`override`: replaces a virtual method of the base class.');
      if (fd.children.some((c) => c?.type === 'type_qualifier' && c.text === 'const')) notes.push('`const`: doesn\'t modify the object.');
      if (owner.type === 'field_declaration' && owner.childForFieldName('default_value')?.text === '0') notes.push('`= 0`: **pure virtual**, derived classes must implement it.');
      const what = defined ? 'Defines' : 'Declares';
      return { title: 'Method name', summary: `${what} the member function ${name}${className ? ` of \`${className}\`` : ''}${where}.${returns}${notes.length ? ` ${notes.join(' ')}` : ''}`, scope };
    }
    const main = node.text === 'main' && owner.parent?.type === 'translation_unit' ? ' `main` is where the program starts; its `int` result is the exit status (0 = success).' : '';
    const tmpl = owner.parent?.type === 'template_declaration' ? ' template' : '';
    if (defined) return { title: `Function${tmpl} name`, summary: `Defines the function${tmpl} ${name}.${returns}${main}`, scope };
    return {
      title: 'Function declaration',
      summary: `Declares the function ${name} without defining it (a *prototype*): the body is elsewhere, later in this file or in another file or library.${returns}`,
      scope,
    };
  }

  switch (owner.type) {
    case 'parameter_declaration':
    case 'optional_parameter_declaration':
    case 'variadic_parameter_declaration': {
      const list = owner.parent;
      if (list?.type === 'template_parameter_list') {
        // `template <Numeric T>` parses like `template <int N>`: tell them apart by looking for the concept.
        const typeName = owner.childForFieldName('type');
        const last = typeName?.type === 'qualified_identifier' ? typeName.childForFieldName('name')?.text : typeName?.text;
        const isConcept = !!last && rootOf(owner).descendantsOfType('concept_definition').some((c) => c?.childForFieldName('name')?.text === last);
        return isConcept
          ? { title: 'Template parameter', summary: `${name} stands for a type, which must satisfy the concept \`${typeName!.text}\`.`, scope: list.parent ?? owner }
          : { title: 'Template parameter', summary: `${name} is a template parameter of type ${typeDesc}: a compile-time value (or, if \`${typeName?.text}\` is a concept, a constrained type).`, scope: list.parent ?? owner };
      }
      if (list?.parent?.type === 'catch_clause') {
        return { title: 'Caught exception', summary: `${name} is the exception object caught by this handler: ${typeDesc}.`, scope: list.parent };
      }
      const pack = owner.type === 'variadic_parameter_declaration' ? ' It is a **parameter pack**: it stands for any number of arguments.' : '';
      const def = owner.type === 'optional_parameter_declaration' ? ' It has a default value, so callers may leave it out.' : '';
      const byValue =
        lang === 'c'
          ? chain.some((c) => c.type === 'pointer_declarator' || c.type === 'array_declarator')
            ? ' Through the pointer, the function can change the caller\'s data.'
            : ' C passes arguments **by value**: it is a copy of what the caller passed.'
          : chain.some((c) => c.type === 'reference_declarator')
            ? ' It is a reference: it refers to the caller\'s object instead of copying it.'
            : '';
      return { title: 'Parameter', summary: `${name} is a parameter (${typeDesc}), set by the caller.${byValue}${pack}${def}`, scope: owner };
    }
    case 'field_declaration': {
      const container = owner.parent?.parent;
      const notes: string[] = [];
      if (storage(owner, 'static')) notes.push('`static`: one copy shared by the whole class, not one per object.');
      if (owner.children.some((c) => c?.type === 'type_qualifier' && c.text === 'mutable')) notes.push('`mutable`: may change even inside `const` methods.');
      if (owner.children.some((c) => c?.type === 'bitfield_clause')) notes.push('It is a bit-field.');
      const kind = container?.type === 'union_specifier' ? 'Union member' : 'Field';
      const of = container ? ` of ${TAG_WORD[container.type] ?? ''} \`${container.childForFieldName('name')?.text ?? '(anonymous)'}\`` : '';
      return { title: kind, summary: `Declares the member ${name}${of}: ${typeDesc}.${notes.length ? ` ${notes.join(' ')}` : ''}`, scope: owner };
    }
    case 'type_definition':
      return { title: 'Typedef name', summary: `${name} becomes another name for ${typeDesc}.`, scope: owner };
    case 'for_range_loop':
      return { title: 'Loop variable', summary: `${name} takes each element of the range in turn: ${typeDesc}.`, scope: owner };
    case 'declaration': {
      const top = owner.parent?.type === 'translation_unit' || owner.parent?.type === 'declaration_list' || owner.parent?.type === 'preproc_ifdef' || owner.parent?.type === 'preproc_if';
      const scope = owner.parent?.type === 'template_declaration' ? owner.parent : owner;
      if (storage(owner, 'extern')) {
        return { title: 'External variable', summary: `Declares ${name} (${typeDesc}) but doesn't define it: the storage is defined in another file.`, scope };
      }
      if (top) {
        const vis = storage(owner, 'static') ? ' `static` here means it is only visible in this file.' : ' It lives for the whole program and is zero-initialized if you don\'t give a value.';
        return { title: 'Global variable', summary: `Declares the global variable ${name}: ${typeDesc}.${vis}`, scope };
      }
      if (storage(owner, 'static')) {
        return { title: 'Static local variable', summary: `Declares ${name}: ${typeDesc}. Because it is \`static\`, it keeps its value between calls and is initialized only once.`, scope };
      }
      const init = chain.find((c) => c.type === 'init_declarator')?.childForFieldName('value');
      const lambda = init?.type === 'lambda_expression' ? ' It holds a lambda (an unnamed function object).' : '';
      return { title: 'Local variable', summary: `Declares the local variable ${name}: ${typeDesc}. It exists until the end of the enclosing block.${lambda}`, scope };
    }
  }
  return undefined;
}

/** Roles shared by C and C++: declaration names and labels. */
export function cRole(node: Node, field: string | null, lang: Lang = 'c'): Role | undefined {
  const parent = node.parent;
  if (!parent) return undefined;
  const name = `\`${node.text}\``;

  const declared = declaredName(node);
  if (declared) return declaratorRole(node, declared, lang);

  switch (`${parent.type}.${field ?? ''}`) {
    case 'struct_specifier.name':
    case 'union_specifier.name':
    case 'enum_specifier.name':
    case 'class_specifier.name': {
      const word = TAG_WORD[parent.type];
      if (parent.childForFieldName('body')) {
        const scoped = parent.type === 'enum_specifier' && parent.children.some((c) => c?.type === 'class' || c?.type === 'struct');
        const extra =
          lang === 'c' && word !== 'enum'
            ? ` Its type name is \`${word} ${node.text}\` (the \`${word}\` keyword is part of the name in C).`
            : scoped
              ? ` A scoped enum: write \`${node.text}::Value\`, and values don't convert to int implicitly.`
              : '';
        return { title: `${TAG_TITLE[parent.type]} name`, summary: `Declares the ${word} ${name}.${extra}`, scope: parent };
      }
      const def = findTypeDefinition(parent, parent.type, node.text);
      return { title: `${TAG_TITLE[parent.type]} type`, summary: `Refers to the ${word} ${name}${def ? ' declared in this file' : ''}.`, scope: def };
    }
    case 'enumerator.name': {
      const value = parent.childForFieldName('value')?.text;
      return {
        title: 'Enum constant',
        summary: value
          ? `Declares the constant ${name} with value \`${value}\`.`
          : `Declares the constant ${name}. Without \`=\`, its value is one more than the previous constant (the first is 0).`,
        scope: parent,
      };
    }
    case 'preproc_def.name': {
      const value = parent.childForFieldName('value')?.text.trim();
      return {
        title: 'Macro name',
        summary: value
          ? `Defines the macro ${name}: the preprocessor replaces each use with \`${value}\` before compiling.`
          : `Defines the macro ${name} (with no value; typically tested with \`#ifdef\`).`,
        scope: parent,
      };
    }
    case 'preproc_function_def.name':
      return { title: 'Function-like macro', summary: `Defines the macro ${name}: \`${node.text}(...)\` is replaced by the body, with the arguments pasted in as text.`, scope: parent };
    case 'preproc_params.':
      return { title: 'Macro parameter', summary: `${name} is replaced by the text of the corresponding argument wherever it appears in the macro body.`, scope: parent.parent ?? undefined };
    case 'preproc_ifdef.name':
      return { title: 'Macro test', summary: `Checks whether the macro ${name} is defined.` };
    case 'labeled_statement.label':
      return { title: 'Label', summary: `${name} names this statement so \`goto ${node.text};\` can jump here.`, scope: parent };
    case 'goto_statement.label': {
      const target = labelled(node.text, node);
      return { title: 'Label reference', summary: `Jumps to the statement labelled ${name}.`, scope: target };
    }
  }
  return undefined;
}

// ------------------------------------------------------------------ jumps

export const LOOPS = new Set(['for_statement', 'while_statement', 'do_statement', 'for_range_loop']);
const BREAKABLE = new Set([...LOOPS, 'switch_statement']);

export function cJumpTarget(token: Node): JumpTarget | undefined {
  switch (token.type) {
    case 'return': {
      const fn = ancestor(token, (n) => FUNCTIONS.has(n.type));
      return fn && { node: fn, verb: 'returns from' };
    }
    case 'break':
    case 'continue': {
      const kinds = token.type === 'break' ? BREAKABLE : LOOPS;
      const target = ancestor(token, (n) => kinds.has(n.type), (n) => FUNCTIONS.has(n.type));
      return target && { node: target, verb: token.type === 'break' ? 'breaks out of' : 'continues' };
    }
    case 'goto': {
      const label = token.parent?.childForFieldName('label');
      const target = label && labelled(label.text, token);
      return target ? { node: target, verb: 'jumps to' } : undefined;
    }
  }
  return undefined;
}

// ------------------------------------------------------------------ scopes

export const C_WRAPPERS = [
  'storage_class_specifier',
  'type_qualifier',
  'else_clause',
  'preproc_else',
  'preproc_elif',
  'preproc_elifdef',
  'attribute_specifier',
  'alignas_qualifier',
];

export function cPromote(scope: Node): Node {
  const p = scope.parent;
  if (!p) return scope;
  // `if ... else if ... else`: one chain, highlighted as a whole.
  if (scope.type === 'if_statement' && p.type === 'else_clause' && p.parent?.type === 'if_statement') return cPromote(p.parent);
  // Qualifiers like `const`/`override` on a function declarator belong to the whole function.
  if (scope.type === 'function_declarator' && (p.type === 'function_definition' || p.type === 'field_declaration' || p.type === 'declaration')) return cPromote(p);
  // `typedef struct Node {...} Node;` / `struct P {...} p;`: include the surrounding declaration.
  if (TYPE_SPECIFIERS.has(scope.type) && scope.childForFieldName('body') && (p.type === 'type_definition' || p.type === 'declaration')) return p;
  return scope;
}

// --------------------------------------------------------- identifier docs

/** Identifiers that the grammar parses as plain names but are really keywords. */
export const IDENT_KEYWORDS = new Set(['_Static_assert', 'static_assert', 'typeof', 'offsetof']);

/** Generic acceptance rules for built-in docs on identifiers. */
export function acceptBuiltin(node: Node, field: string | null, entry: DocEntry): boolean {
  if (declaredName(node)) return false; // the user's own declaration
  if (node.type === 'field_identifier' || node.type === 'statement_identifier') return false;
  const parent = node.parent;
  const called = parent?.type === 'call_expression' && field === 'function';
  switch (entry.kind) {
    case 'function':
    case 'macro':
      return node.type === 'identifier' && called;
    case 'type':
      return node.type === 'primitive_type' || node.type === 'type_identifier';
    case 'value':
      return node.type === 'identifier' && parent?.type !== 'preproc_ifdef';
    case 'keyword':
      return IDENT_KEYWORDS.has(node.text) && (called || parent?.type === 'macro_type_specifier');
  }
  return false;
}

// ------------------------------------------------- context-dependent docs

/** The separate meanings of `static`, picked by where it appears (see `staticDoc`). */
export function buildStaticDocs(lang: Lang): Record<'file' | 'local' | 'member', DocEntry> {
  const kw = refFor(lang)('keyword/static');
  return {
    file: {
      kind: 'keyword',
      title: 'static (file scope)',
      summary: 'On a global variable or function: it is visible **only inside this source file** (*internal linkage*), like "private to this file". Other files can\'t see or clash with it.',
      details: 'This meaning has nothing to do with lifetime: globals live for the whole program anyway.',
      example: 'static int counter = 0;           // only this file\nstatic int helper(int x) { return x * 2; }',
      link: kw,
    },
    local: {
      kind: 'keyword',
      title: 'static (local variable)',
      summary: 'On a local variable: it lives for the **whole program** and keeps its value between calls. It is initialized only once, the first time.',
      details: 'Without `static`, a local variable is created anew on every call.',
      example: 'int next_id(void) {\n    static int id = 0;  // survives between calls\n    return ++id;\n}',
      link: kw,
    },
    member: {
      kind: 'keyword',
      title: 'static (class member)',
      summary: 'On a class member: it belongs to the **class itself**, not to each object. A static data member has one shared copy; a static member function has no `this` and is called as `Class::f()`.',
      example: 'struct Counter {\n    static inline int count = 0;\n    static int next() { return ++count; }\n};',
      link: refFor(lang)('keyword/static', 'language/static'),
    },
  };
}

const FILE_SCOPE = new Set(['translation_unit', 'declaration_list', 'linkage_specification', 'preproc_if', 'preproc_ifdef', 'preproc_else', 'preproc_elif', 'template_declaration']);

/** Which `static` a storage-class token is: file scope, local variable, or (C++) class member. */
export function staticDoc(token: Node, docs: Record<'file' | 'local' | 'member', DocEntry>): DocEntry | undefined {
  if (token.type !== 'static' || token.parent?.type !== 'storage_class_specifier') return undefined;
  const owner = token.parent.parent;
  if (!owner) return undefined;
  const container = owner.parent?.type === 'template_declaration' ? owner.parent.parent : owner.parent;
  if (owner.type === 'field_declaration' || container?.type === 'field_declaration_list') return docs.member;
  if (container && FILE_SCOPE.has(container.type)) return docs.file;
  return docs.local;
}

/** Identifiers in a `name` field that are references, not declarations (`std::cout`, `typeof(x)`). */
const NAME_REFERENCES = new Set(['qualified_identifier', 'template_function', 'template_type', 'macro_type_specifier']);

/** A name the user declares here (so built-in docs don't apply). */
export function isDeclarationName(node: Node, field: string | null): boolean {
  if (declaredName(node)) return true;
  return field === 'name' && !NAME_REFERENCES.has(node.parent?.type ?? '');
}

const cDocs = buildCDocs('c');
const cStatic = buildStaticDocs('c');

export const c: LanguageSpec = {
  comments: cComments,
  id: 'c',
  languageIds: ['c'],
  displayName: 'C',
  wasm: 'tree-sitter-c.wasm',
  fence: 'c',
  docs: cDocs,
  identifierTypes: new Set(['identifier', 'type_identifier', 'field_identifier', 'primitive_type', 'statement_identifier']),
  keywordNodeTypes: new Set(['preproc_directive']),
  wrapperTypes: new Set(C_WRAPPERS),
  noScopeTokens: new Set([',', ';', '.', '"', "'", ':', '=', 'L"', 'u"', 'U"', 'u8"', "L'", "u'", "U'", "u8'"]),
  role: (node, field) => cRole(node, field, 'c'),
  jumpTarget: cJumpTarget,
  promote: cPromote,
  isDeclarationName,
  docFor: (token) => staticDoc(token, cStatic),
  acceptIdentifierDoc: acceptBuiltin,
};
