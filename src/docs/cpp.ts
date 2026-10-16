import type { Node, Tree } from 'web-tree-sitter';
import type { DocEntry, DocTable, JumpTarget, LanguageSpec, Role } from '../core/model';
import { ancestor, fieldOf } from '../core/nodes';
import { C_WRAPPERS, acceptBuiltin, buildCDocs, buildStaticDocs, cJumpTarget, cPromote, cRole, isDeclarationName, refFor, staticDoc } from './c';
import { cppComments } from './comments';

const ref = refFor('cpp');
const kw = (k: string) => ref(`keyword/${k}`);
const lang = (page: string) => ref(`language/${page}`);

// Overloadable operators: `operator<sym>` in a declaration gets one shared explanation.
const OVERLOADABLE = ['+', '-', '*', '/', '%', '^', '&', '|', '~', '!', '=', '<', '>', '+=', '-=', '*=', '/=', '%=', '<<', '>>', '<<=', '>>=', '==', '!=', '<=', '>=', '<=>', '&&', '||', '++', '--', ',', '->', '[]', '()', 'new', 'delete'];

const operatorDocs: DocTable = Object.fromEntries(
  OVERLOADABLE.map((op) => [
    `operator_name/${op}`,
    {
      kind: 'operator',
      title: `operator${op} (overloaded operator)`,
      summary: `This function defines what \`${op === '()' ? 'obj(args)' : op === '[]' ? 'obj[i]' : op}\` does for this type (*operator overloading*). It is called like the built-in operator.`,
      details: 'Keep overloads unsurprising: they should behave like the built-in operator (e.g. `+` does not modify its operands).',
      link: lang('operators'),
    } as DocEntry,
  ]),
);

const cppDocs: DocTable = {
  // -------------------------------------------------------- classes & access
  class: {
    kind: 'keyword',
    summary: 'Declares a **class**: a type bundling data members and member functions (methods). Members are **private** by default.',
    details: 'A class definition ends with `};` (the semicolon is required). Objects are values: assigning one copies it, unless you use pointers or references.',
    example: 'class Counter {\npublic:\n    void inc() { ++n_; }\n    int get() const { return n_; }\nprivate:\n    int n_ = 0;\n};',
    link: lang('class'),
  },
  'enum_specifier/class': {
    kind: 'keyword',
    title: 'enum class (scoped enum)',
    summary: 'A **scoped enumeration**: the names live inside the enum (`Level::Low`) and don\'t convert to `int` implicitly. Prefer it over plain `enum`.',
    example: 'enum class Level { Low, High };\nLevel l = Level::High;\nint n = static_cast<int>(l);',
    link: lang('enum'),
  },
  'enum_specifier/struct': {
    kind: 'keyword',
    title: 'enum struct (scoped enum)',
    summary: 'Same as `enum class`: a scoped enumeration whose names must be qualified (`E::Value`).',
    link: lang('enum'),
  },
  'type_parameter_declaration/class': {
    kind: 'keyword',
    title: 'class (template parameter)',
    summary: 'In a template parameter list, `class T` means exactly the same as `typename T`: "T is a type". It does not have to be a class.',
    link: lang('template_parameters'),
  },
  'friend_declaration/class': {
    kind: 'keyword',
    title: 'friend class',
    summary: 'Gives the named class access to this class\'s private and protected members.',
    link: lang('friend'),
  },
  public: {
    kind: 'keyword',
    summary: 'Access specifier: members after `public:` can be used by anyone. In `class D : public B`, the base class\'s public members stay public in `D` (the usual "is-a" inheritance).',
    link: lang('access'),
  },
  private: {
    kind: 'keyword',
    summary: 'Access specifier: members after `private:` can only be used by this class\'s own member functions (and friends). The default in a `class`.',
    details: 'Keep data members private and expose behaviour through public methods; that lets the class protect its invariants.',
    link: lang('access'),
  },
  protected: {
    kind: 'keyword',
    summary: 'Access specifier: members after `protected:` are usable by this class and by classes derived from it, but not from outside.',
    link: lang('access'),
  },
  'base_class_clause/:': {
    kind: 'syntax',
    title: ': Base (inheritance)',
    summary: 'Lists the base classes this class **inherits** from. It gets their members and can be used wherever a base is expected (through a pointer or reference).',
    example: 'class Rect : public Shape { };',
    link: lang('derived_class'),
  },
  virtual: {
    kind: 'keyword',
    summary: 'Makes a member function **virtual**: calling it through a base-class pointer or reference runs the version of the actual (derived) object, chosen at run time.',
    details: 'Write `= 0` to make it *pure virtual*: no implementation here, derived classes must provide one, and the class becomes abstract. A class with virtual functions should have a `virtual` destructor.',
    example: 'struct Shape {\n    virtual ~Shape() = default;\n    virtual double area() const = 0;\n};',
    link: lang('virtual'),
  },
  override: {
    kind: 'keyword',
    summary: 'Says "this replaces a virtual function of the base class". The compiler reports an error if there is nothing to override (e.g. a typo or a signature mismatch).',
    example: 'double area() const override { return w * h; }',
    link: lang('override'),
  },
  final: {
    kind: 'keyword',
    summary: 'On a class: nobody may inherit from it. On a virtual function: derived classes may not override it any further.',
    example: 'class Rect final : public Shape { };',
    link: lang('final'),
  },
  explicit: {
    kind: 'keyword',
    summary: 'Forbids using this constructor (or conversion operator) for **implicit** conversions. Without it, a one-argument constructor lets `Rect r = 2.0;` or passing `2.0` where a `Rect` is expected compile silently.',
    details: 'Good default: mark single-argument constructors `explicit`.',
    example: 'explicit Rect(double side);\nRect r(2.0);   // ok\nRect s = 2.0;  // error',
    link: lang('explicit'),
  },
  friend: {
    kind: 'keyword',
    summary: 'Grants a function or class access to this class\'s private members. Often used for operators like `<<` that must be free functions.',
    example: 'friend std::ostream &operator<<(std::ostream &os, const Rect &r);',
    link: lang('friend'),
  },
  mutable: {
    kind: 'keyword',
    summary: 'On a data member: it may be changed even inside `const` member functions (e.g. caches, counters). On a lambda: the lambda may modify its by-copy captures.',
    example: 'auto next = [n = 0]() mutable { return ++n; };',
    link: lang('cv'),
  },
  this: {
    kind: 'value',
    summary: 'Inside a member function: a **pointer** to the object the function was called on. `this->x` is usually written as just `x`.',
    details: 'In a `const` member function, `this` points to a `const` object. In a lambda, `[this]` captures it.',
    link: lang('this'),
  },
  operator: {
    kind: 'keyword',
    summary: 'Declares an **overloaded operator**: a function named `operator+`, `operator==`, `operator<<`, ... that runs when that operator is used on this type.',
    example: 'Rect operator*(double k) const { return Rect(w * k, h * k); }\nbool operator==(const Rect &) const = default;',
    link: lang('operators'),
  },
  'operator_cast/operator': {
    kind: 'keyword',
    title: 'operator T (conversion operator)',
    summary: 'Defines how this type converts to `T`. Usually marked `explicit`, e.g. `explicit operator bool()` for "is this valid?" checks.',
    link: lang('cast_operator'),
  },
  ...operatorDocs,
  'destructor_name/~': {
    kind: 'syntax',
    title: '~Name (destructor)',
    summary: 'A **destructor**: runs automatically when the object is destroyed (goes out of scope, or is `delete`d), to release what it owns. This is the basis of RAII.',
    details: 'If a class is used polymorphically (deleted through a base pointer), the base destructor must be `virtual`.',
    example: '~File() { std::fclose(f_); }',
    link: lang('destructor'),
  },
  'field_initializer_list/:': {
    kind: 'syntax',
    title: ': member(value) (member initializer list)',
    summary: 'Initializes base classes and data members **before** the constructor body runs. Required for `const` and reference members; better than assigning in the body.',
    details: 'Members are initialized in the order they are declared in the class, not the order written here.',
    example: 'Rect(double w, double h) : width_(w), height_(h) {}',
    link: lang('constructor'),
  },
  'default_method_clause/default': {
    kind: 'keyword',
    title: '= default',
    summary: 'Asks the compiler to generate this special member function (constructor, destructor, copy/move, comparison) with its default behaviour.',
    example: 'virtual ~Shape() = default;\nbool operator==(const Point &) const = default;',
    link: lang('function#Defaulted_functions'),
  },
  'delete_method_clause/delete': {
    kind: 'keyword',
    title: '= delete',
    summary: 'Forbids this function: any call to it is a compile error. Commonly used to make a type non-copyable.',
    example: 'File(const File &) = delete;\nFile &operator=(const File &) = delete;',
    link: lang('function#Deleted_functions'),
  },
  'field_declaration/=': {
    kind: 'syntax',
    title: '= (default member initializer)',
    summary: 'Gives a data member a default value used by every constructor that doesn\'t initialize it. On a virtual function, `= 0` instead makes it **pure virtual**.',
    example: 'int reads_ = 0;\nvirtual double area() const = 0;',
    link: lang('data_members#Member_initialization'),
  },
  struct: {
    kind: 'keyword',
    summary: 'Declares a class type whose members (and bases) are **public** by default. Otherwise identical to `class`.',
    details: 'By convention `struct` is used for simple data holders, `class` for types with private state and invariants. Unlike C, you can use the name without writing `struct`.',
    example: 'struct Config {\n    std::string title;\n    int level = 0;\n};',
    link: lang('class'),
  },

  // ------------------------------------------------------- templates
  template: {
    kind: 'keyword',
    summary: 'Declares a **template**: a function or class written once with placeholders (`<typename T>`) that the compiler fills in for each type it is used with.',
    details: 'Templates are instantiated at compile time, so their code usually lives in headers. Error messages can be long: read the first one.',
    example: 'template <typename T>\nT largest(const std::vector<T> &items);\n\nlargest(std::vector<int>{1, 2}); // T = int',
    link: lang('templates'),
  },
  typename: {
    kind: 'keyword',
    summary: 'Tells the compiler that a name depending on a template parameter is a **type**, e.g. `typename T::value_type`.',
    link: kw('typename'),
  },
  'type_parameter_declaration/typename': {
    kind: 'keyword',
    title: 'typename T (type parameter)',
    summary: 'Declares a template **type parameter**: `T` stands for whatever type the template is used with.',
    example: 'template <typename T>\nT twice(T x) { return x + x; }',
    link: lang('template_parameters'),
  },
  'optional_type_parameter_declaration/typename': {
    kind: 'keyword',
    title: 'typename T = Default',
    summary: 'A template type parameter with a default type, used when the caller doesn\'t specify one.',
    link: lang('template_parameters'),
  },
  'variadic_type_parameter_declaration/typename': {
    kind: 'keyword',
    title: 'typename... (parameter pack)',
    summary: 'Declares a template **parameter pack**: any number of types (including zero).',
    example: 'template <typename... Args>\nvoid log(Args... args);',
    link: lang('parameter_pack'),
  },
  'variadic_type_parameter_declaration/...': {
    kind: 'syntax',
    title: '... (template parameter pack)',
    summary: 'Makes this template parameter a **pack**: it accepts any number of types.',
    link: lang('parameter_pack'),
  },
  'variadic_declarator/...': {
    kind: 'syntax',
    title: '... (function parameter pack)',
    summary: 'A **function parameter pack**: one parameter name standing for any number of arguments (with the types of the template pack).',
    example: 'template <typename... Rest>\nint total(int first, Rest... rest);',
    link: lang('parameter_pack'),
  },
  'parameter_pack_expansion/...': {
    kind: 'syntax',
    title: 'pattern... (pack expansion)',
    summary: 'Expands a parameter pack: the pattern before `...` is repeated for each element, separated by commas.',
    example: 'f(args...);                         // f(a1, a2, a3)\ng(std::forward<Args>(args)...);',
    link: lang('parameter_pack'),
  },
  'fold_expression/...': {
    kind: 'syntax',
    title: '(... op ...) (fold expression)',
    summary: 'A **fold expression**: combines all elements of a parameter pack with an operator, e.g. `(first + ... + rest)` adds them all up.',
    link: lang('fold'),
  },
  'sizeof_expression/...': {
    kind: 'operator',
    title: 'sizeof... (pack size)',
    summary: 'The **number of elements** in a parameter pack (not a size in bytes).',
    example: 'template <typename... Args>\nconstexpr std::size_t count(Args...) { return sizeof...(Args); }',
    link: lang('sizeof...'),
  },
  'parameter_list/...': {
    kind: 'syntax',
    title: '... (catch-all / C variadic)',
    summary: 'In `catch (...)`: catches **any** exception. In a function\'s parameter list: C-style variadic arguments, as in `printf` (prefer variadic templates in C++).',
    link: lang('try'),
  },
  'template_parameter_list/<': {
    kind: 'syntax',
    title: 'template <...> (template parameters)',
    summary: 'The template\'s parameters: types (`typename T`), constrained types (`Numeric T`), packs (`typename... Ts`) or compile-time values (`int N`).',
    link: lang('template_parameters'),
  },
  'template_argument_list/<': {
    kind: 'syntax',
    title: '<...> (template arguments)',
    summary: 'Fills in a template\'s parameters, e.g. `std::vector<int>` is a vector of `int`s. Often the compiler can deduce them for function templates.',
    link: lang('template_parameters') + '#Template_arguments',
  },
  concept: {
    kind: 'keyword',
    summary: 'C++20: declares a **concept**, a named compile-time requirement on types. Use it to constrain templates: `template <Numeric T>`.',
    details: 'Constrained templates give much clearer error messages when used with an unsuitable type.',
    example: 'template <typename T>\nconcept Numeric = std::is_arithmetic_v<T>;',
    link: lang('constraints'),
  },
  requires: {
    kind: 'keyword',
    summary: 'C++20: adds a **constraint** to a template (`requires std::integral<T>`), or starts a `requires (T a) { a + a; }` expression that checks some code compiles.',
    link: lang('constraints'),
  },

  // ------------------------------------------------------- namespaces
  namespace: {
    kind: 'keyword',
    summary: 'Declares a **namespace**: a named scope that groups declarations so their names don\'t clash. Refer to its members as `geo::Rect`.',
    details: 'A namespace can be reopened and extended in several files. An unnamed `namespace { }` makes its contents private to this file.',
    example: 'namespace geo {\n    class Rect { };\n}\ngeo::Rect r;',
    link: lang('namespace'),
  },
  'namespace_definition/inline': {
    kind: 'keyword',
    title: 'inline namespace',
    summary: 'Its members are also accessible as members of the enclosing namespace. Used for library versioning.',
    link: lang('namespace#Inline_namespaces'),
  },
  'using_declaration/using': {
    kind: 'keyword',
    title: 'using',
    summary: '`using std::cout;` makes one name usable without its prefix. `using namespace std;` makes **all** names of a namespace usable unqualified.',
    details: 'Avoid `using namespace` in headers (and at file scope in bigger programs): it pulls in many names and can cause clashes.',
    example: 'using geo::Rect;          // Rect now means geo::Rect\nusing namespace std::string_literals;',
    link: lang('namespace#Using-directives'),
  },
  'using_declaration/namespace': {
    kind: 'keyword',
    title: 'using namespace (using-directive)',
    summary: 'Makes every name from that namespace usable without the `ns::` prefix, from here to the end of the enclosing scope.',
    link: lang('namespace#Using-directives'),
  },
  'alias_declaration/using': {
    kind: 'keyword',
    title: 'using X = Y (type alias)',
    summary: 'Declares a **type alias**: a new name for an existing type, the modern form of `typedef`. Can also be a template.',
    example: 'using Ages = std::map<std::string, int>;\ntemplate <typename T> using Vec = std::vector<T>;',
    link: lang('type_alias'),
  },
  '::': {
    kind: 'operator',
    title: ':: (scope resolution)',
    summary: 'Names something inside a namespace, class or enum: `std::cout`, `geo::Rect`, `Level::Low`, `Rect::area`. A leading `::name` means the global one.',
    link: lang('identifiers#Qualified_identifiers'),
  },
  'linkage_specification/extern': {
    kind: 'keyword',
    title: 'extern "C"',
    summary: 'Gives these functions C linkage (no C++ name mangling), so they can be called from C or found in a C library.',
    example: 'extern "C" int legacy_sum(int, int);',
    link: lang('language_linkage'),
  },

  // ------------------------------------------------------- memory
  new: {
    kind: 'keyword',
    summary: 'Creates an object on the **heap** and returns a pointer to it. Every `new` needs a matching `delete` (and `new T[n]` a `delete[]`).',
    details: 'Modern C++ rarely uses `new` directly: prefer `std::make_unique` / `std::make_shared` or containers, which free memory automatically.',
    example: 'Rect *raw = new Rect(1.0);\ndelete raw;\nauto owned = std::make_unique<Rect>(1.0); // no delete needed',
    link: lang('new'),
  },
  delete: {
    kind: 'keyword',
    summary: 'Destroys an object created with `new` (running its destructor) and frees its memory. Use `delete[]` for arrays from `new T[n]`.',
    details: 'Deleting twice, or using the object afterwards, is undefined behaviour. Smart pointers avoid manual `delete`.',
    link: lang('delete'),
  },
  'delete_expression/[': {
    kind: 'syntax',
    title: 'delete[] (array delete)',
    summary: 'Frees an array allocated with `new T[n]`. Plain `delete` on such an array is a bug.',
    link: lang('delete'),
  },
  'new_declarator/[': {
    kind: 'syntax',
    title: 'new T[n] (array new)',
    summary: 'Allocates an array of `n` objects on the heap. Free it with `delete[]`, or better, use `std::vector`.',
    link: lang('new'),
  },
  nullptr: {
    kind: 'value',
    summary: 'The **null pointer** literal: a pointer that points to nothing. Use it instead of `NULL` or `0`; it has its own type (`std::nullptr_t`) so it can\'t be confused with an integer.',
    link: lang('nullptr'),
  },

  // ------------------------------------------------------- types & inference
  auto: {
    kind: 'keyword',
    summary: 'Lets the compiler **deduce the type** from the initializer: `auto x = 1.5;` makes `x` a `double`.',
    details: '`auto` drops references and top-level `const`: write `const auto &` to avoid copying. As a parameter type (`[](auto v)`, C++20 functions), it makes a template.',
    example: 'auto it = ages.find("ada");     // std::map<...>::iterator\nfor (const auto &item : items) { }',
    link: lang('auto'),
  },
  decltype: {
    kind: 'keyword',
    summary: 'The **declared type** of an expression or variable, computed at compile time. `decltype(auto)` deduces like `auto` but keeps references.',
    example: 'decltype(factor) copy = factor;  // same type as factor',
    link: lang('decltype'),
  },
  typeid: {
    kind: 'keyword',
    summary: 'Gives run-time type information (`std::type_info`) about an expression or type, e.g. `typeid(x).name()`. Needs `<typeinfo>`.',
    link: lang('typeid'),
  },
  constexpr: {
    kind: 'keyword',
    summary: 'Can be evaluated at **compile time**. A `constexpr` variable is a true constant; a `constexpr` function may run at compile time when its arguments are constants (and at run time otherwise).',
    example: 'constexpr int N = 16;\nconstexpr int square(int x) { return x * x; }\nstd::array<int, square(4)> a;',
    link: lang('constexpr'),
  },
  'if_statement/constexpr': {
    kind: 'keyword',
    title: 'if constexpr',
    summary: 'A compile-time `if`: the condition must be a constant, and the branch not taken is discarded (not even instantiated in a template).',
    example: 'if constexpr (std::is_integral_v<T>) { /* only for integers */ }',
    link: lang('if#Constexpr_if'),
  },
  consteval: {
    kind: 'keyword',
    summary: 'C++20: an *immediate function*: every call **must** be evaluated at compile time (unlike `constexpr`, which only may be).',
    example: 'consteval int square(int x) { return x * x; }\nint a = square(3);    // ok: 9 at compile time',
    link: lang('consteval'),
  },
  constinit: {
    kind: 'keyword',
    summary: 'C++20: requires a static/global variable to be initialized at compile time (it stays mutable). Prevents initialization-order surprises.',
    link: lang('constinit'),
  },
  inline: {
    kind: 'keyword',
    summary: 'Allows the same function (or, since C++17, variable) to be defined in several translation units, e.g. in a header. The name suggests inlining, but that\'s up to the compiler.',
    details: 'Functions defined inside a class body are implicitly `inline`. `static inline int count_ = 0;` defines a static member right in the class.',
    link: lang('inline'),
  },
  static_assert: {
    kind: 'keyword',
    summary: 'Checks a condition at **compile time**; the build fails with the message if it is false.',
    example: 'static_assert(sizeof(int) == 4, "need 32-bit int");',
    link: lang('static_assert'),
  },
  bool: { kind: 'type', summary: 'The boolean type: `true` or `false`. Numbers and pointers convert to it (0/`nullptr` is false).', link: lang('types') },
  wchar_t: { kind: 'type', summary: 'A wide character (16 bits on Windows, 32 elsewhere).', link: lang('types') },
  char8_t: { kind: 'type', summary: 'A UTF-8 code unit (C++20), the type of `u8"..."` literals.', link: lang('types') },
  char16_t: { kind: 'type', summary: 'A UTF-16 code unit, the type of `u"..."` literals.', link: lang('types') },
  char32_t: { kind: 'type', summary: 'A UTF-32 code unit (a whole Unicode code point), the type of `U"..."` literals.', link: lang('types') },

  // ------------------------------------------------------- casts
  static_cast: {
    kind: 'keyword',
    summary: 'The everyday explicit conversion, checked at compile time: numbers between types, enum to int, base pointer to derived pointer (unchecked!).',
    example: 'int n = static_cast<int>(3.7);   // 3\nauto *base = static_cast<Shape *>(raw);',
    link: lang('static_cast'),
  },
  dynamic_cast: {
    kind: 'keyword',
    summary: 'A **checked** conversion down a class hierarchy at run time: gives `nullptr` (for pointers) or throws `std::bad_cast` (for references) if the object isn\'t really of that type. Needs a virtual function in the base.',
    example: 'if (auto *r = dynamic_cast<Rect *>(shape)) { /* it is a Rect */ }',
    link: lang('dynamic_cast'),
  },
  const_cast: {
    kind: 'keyword',
    summary: 'Adds or removes `const`. Modifying an object that was really declared `const` through the result is undefined behaviour; it\'s meant for calling old APIs that forgot `const`.',
    link: lang('const_cast'),
  },
  reinterpret_cast: {
    kind: 'keyword',
    summary: 'Reinterprets the bits of a pointer (or integer) as a different, unrelated type. Low-level and unsafe; rarely needed.',
    link: lang('reinterpret_cast'),
  },

  // ------------------------------------------------------- exceptions
  try: {
    kind: 'keyword',
    summary: 'Runs the block; if an exception is **thrown** inside (even deep in called functions), control jumps to the first `catch` whose type matches.',
    details: 'While the exception travels up, local objects are destroyed properly (their destructors run), which is how RAII cleans up.',
    example: 'try {\n    parse(input);\n} catch (const std::exception &e) {\n    std::cerr << e.what() << \'\\n\';\n}',
    link: lang('try'),
  },
  catch: {
    kind: 'keyword',
    summary: 'Handles exceptions of the given type thrown in the preceding `try` block. Catch by `const &` to avoid copying and slicing. `catch (...)` catches everything.',
    details: 'Handlers are tried in order, so put more specific types first.',
    link: lang('catch'),
  },
  throw: {
    kind: 'keyword',
    summary: 'Throws an **exception**: stops the current code and jumps to the nearest matching `catch`, possibly in a caller. A bare `throw;` inside a `catch` rethrows the current exception.',
    details: 'Throw objects derived from `std::exception` (e.g. `std::runtime_error`), by value. If nothing catches it, the program terminates.',
    example: 'if (items.empty()) {\n    throw std::invalid_argument("empty");\n}',
    link: lang('throw'),
  },
  noexcept: {
    kind: 'keyword',
    summary: 'Promises that this function never throws. If an exception escapes anyway, the program terminates. As an operator, `noexcept(expr)` checks at compile time whether `expr` can throw.',
    details: 'Move constructors should be `noexcept`, so containers like `std::vector` can use them when growing.',
    link: lang('noexcept_spec'),
  },

  // ------------------------------------------------------- coroutines
  co_await: {
    kind: 'keyword',
    summary: 'C++20 coroutines: **suspends** this coroutine until the awaited operation is ready, then resumes with its result. Using it makes the function a coroutine.',
    link: lang('coroutines'),
  },
  co_yield: {
    kind: 'keyword',
    summary: 'C++20 coroutines: produces a value for the caller and **suspends** until the next value is requested (e.g. in a `std::generator`).',
    example: 'std::generator<int> count_to(int n) {\n    for (int i = 0; i < n; ++i) co_yield i;\n}',
    link: lang('coroutines'),
  },
  co_return: {
    kind: 'keyword',
    summary: 'C++20 coroutines: finishes the coroutine, optionally with a result. A coroutine can\'t use plain `return`.',
    link: lang('coroutines'),
  },

  // ------------------------------------------------------- lambdas & loops
  'lambda_capture_specifier/[': {
    kind: 'syntax',
    title: '[captures](params) { } (lambda)',
    summary: 'A **lambda**: an unnamed function written inline. The brackets list which local variables it **captures**: `[x]` by copy, `[&x]` by reference, `[=]` / `[&]` everything used, `[this]` the current object.',
    details: 'A by-reference capture must not outlive the variable it refers to (e.g. a lambda stored and run later).',
    example: 'auto scale = [factor](int n) { return n * factor; };\nstd::sort(v.begin(), v.end(), [](int a, int b) { return a > b; });',
    link: lang('lambda'),
  },
  'lambda_default_capture/=': {
    kind: 'syntax',
    title: '[=] (capture by copy)',
    summary: 'The lambda captures every local variable it uses **by copy**, at the moment the lambda is created.',
    link: lang('lambda#Lambda_capture'),
  },
  'lambda_default_capture/&': {
    kind: 'syntax',
    title: '[&] (capture by reference)',
    summary: 'The lambda captures every local variable it uses **by reference**: it sees later changes and can modify them, but must not outlive them.',
    link: lang('lambda#Lambda_capture'),
  },
  'lambda_capture_specifier/&': {
    kind: 'syntax',
    title: '[&x] (capture by reference)',
    summary: 'Captures this variable **by reference**: the lambda uses (and can modify) the original.',
    link: lang('lambda#Lambda_capture'),
  },
  'for_range_loop/for': {
    kind: 'keyword',
    title: 'for (x : range) (range-based for)',
    summary: 'Loops over every element of a container, array or range. Use `const auto &x` to avoid copies, `auto &x` to modify elements.',
    example: 'for (const auto &item : items) { }\nfor (int &n : nums) n *= 2;',
    link: lang('range-for'),
  },
  'for_range_loop/:': {
    kind: 'syntax',
    title: ': (range-based for)',
    summary: 'Separates the loop variable from the range being looped over.',
    link: lang('range-for'),
  },
  'structured_binding_declarator/[': {
    kind: 'syntax',
    title: 'auto [a, b] (structured binding)',
    summary: 'Unpacks a pair, tuple, struct or array into separate named variables.',
    example: 'for (const auto &[name, age] : ages) { }\nauto [q, r] = std::div(7, 2);',
    link: lang('structured_binding'),
  },
  'trailing_return_type/->': {
    kind: 'syntax',
    title: '-> T (trailing return type)',
    summary: 'The function\'s return type written after the parameters (with `auto` in front). Needed when it depends on the parameters, and the usual form for lambdas.',
    example: 'auto add(int a, int b) -> int;\n[](int x) -> double { return x / 2.0; }',
    link: lang('function'),
  },

  // ------------------------------------------------------- operators (C++ meanings)
  'reference_declarator/&': {
    kind: 'operator',
    title: '& (reference)',
    summary: 'Declares a **reference**: another name for an existing object. No copy is made, and it can never be null or re-seated.',
    details: '`const T &` parameters pass big objects cheaply without allowing changes; `T &` lets the function modify the caller\'s object. Never return a reference to a local variable.',
    example: 'void grow(std::vector<int> &v) { v.push_back(0); }  // modifies the caller\'s vector\nfor (int &n : nums) n *= 2;',
    link: lang('reference'),
  },
  'reference_declarator/&&': {
    kind: 'operator',
    title: '&& (rvalue reference)',
    summary: 'An **rvalue reference**: binds to temporaries and to objects you `std::move`, so the function may steal their contents (move semantics).',
    details: 'In a template, `T&&` (with `T` deduced) is a *forwarding reference* instead: it accepts anything and is passed on with `std::forward<T>`.',
    example: 'void consume(std::string &&text);\nconsume(std::move(s));  // s may be empty afterwards',
    link: lang('reference#Rvalue_references'),
  },
  'abstract_reference_declarator/&': { kind: 'operator', title: 'T & (reference type)', summary: 'A reference type without a name, as in a cast `static_cast<int &>(x)` or a parameter in a declaration.', link: lang('reference') },
  'abstract_reference_declarator/&&': { kind: 'operator', title: 'T && (rvalue reference type)', summary: 'An rvalue reference type without a name.', link: lang('reference#Rvalue_references') },


  'binary_expression/<=>': {
    kind: 'operator',
    title: '<=> (three-way comparison)',
    summary: 'C++20 "spaceship" operator: tells whether `a` is less than, equal to, or greater than `b` in one go. Defaulting it gives you `<`, `<=`, `>`, `>=` for free.',
    link: lang('operator_comparison#Three-way_comparison'),
  },
  'field_expression/->': {
    kind: 'operator',
    title: '-> (member through pointer)',
    summary: '`p->member` accesses a member of the object `p` points to, short for `(*p).member`. Also works on smart pointers (`std::unique_ptr`) and iterators.',
    example: 'shape->area();       // shape is a pointer or smart pointer\nit->second;          // map iterator: the value',
    link: lang('operator_member_access'),
  },
  'field_expression/.': {
    kind: 'operator',
    title: '. (member access)',
    summary: '`obj.member` accesses a data member or calls a member function of an object (or reference). Through a pointer, use `->`.',
    link: lang('operator_member_access'),
  },
  'subscript_argument_list/[': {
    kind: 'operator',
    title: 'a[i] (subscript)',
    summary: 'The element at index `i`. For `std::vector` and arrays there is **no bounds check** (use `.at(i)` for a checked version). For `std::map`, `m[key]` inserts a default value if the key is missing!',
    link: lang('operator_member_access#Built-in_subscript_operator'),
  },
  'initializer_list/{': {
    kind: 'syntax',
    title: '{ ... } (brace initialization)',
    summary: '**Uniform initialization**: works for every type, e.g. `std::vector<int> v{1, 2, 3}` or `Point p{1, 2}`. Unlike `( )`, it rejects narrowing conversions such as `int{2.5}`.',
    details: 'For containers, `{ }` means "these elements": `std::vector<int>(3, 0)` is three zeros, but `std::vector<int>{3, 0}` holds 3 and 0.',
    link: lang('list_initialization'),
  },

  // ------------------------------------------------------- literals
  '#raw_string_literal': {
    kind: 'literal',
    title: 'R"(...)" (raw string)',
    summary: 'A **raw string literal**: backslashes and quotes are taken literally, nothing is escaped. Handy for regexes, Windows paths and JSON.',
    details: 'If the text contains `)"`, add a delimiter: `R"x(...)x"`.',
    example: 'std::regex re(R"(\\d+\\.\\d+)");\nauto path = R"(C:\\temp\\file.txt)";',
    link: lang('string_literal'),
  },
  '#user_defined_literal': {
    kind: 'literal',
    title: 'literal with suffix (user-defined literal)',
    summary: 'A literal with a suffix that turns it into a library type: `"hi"s` is a `std::string`, `"hi"sv` a `std::string_view`, `10ms` a `std::chrono` duration.',
    details: 'Standard suffixes need a `using namespace std::string_literals;` (or `std::literals`) first.',
    example: 'using namespace std::string_literals;\nauto s = "héllo"s;  // std::string, not const char*',
    link: lang('user_literal'),
  },
};

// ------------------------------------------------------------ standard library

const STD = 'https://en.cppreference.com/w/cpp/';

/** Standard library names: only documented where they really refer to `std::` (qualified, or imported by `using`). */
const stdDocs: DocTable = {
  std: {
    kind: 'value',
    title: 'std (standard library namespace)',
    summary: 'The namespace of the C++ standard library: `std::string`, `std::vector`, `std::cout`, ...',
    link: `${STD}standard_library`,
  },
  cout: { kind: 'value', summary: 'The standard output stream (console). Write to it with `<<`. Needs `<iostream>`.', example: 'std::cout << "x = " << x << \'\\n\';', link: `${STD}io/cout` },
  cin: { kind: 'value', summary: 'The standard input stream. Read from it with `>>`, or whole lines with `std::getline(std::cin, line)`.', example: 'int n;\nstd::cin >> n;', link: `${STD}io/cin` },
  cerr: { kind: 'value', summary: 'The standard error stream, for error messages. Unbuffered, so output appears immediately.', link: `${STD}io/cerr` },
  clog: { kind: 'value', summary: 'A buffered stream to standard error, for logging.', link: `${STD}io/clog` },
  endl: {
    kind: 'value',
    summary: 'Writes a newline **and flushes** the stream. Flushing is slow when done a lot; `\'\\n\'` alone is usually enough.',
    link: `${STD}io/manip/endl`,
  },
  string: {
    kind: 'type',
    summary: '`std::string`: a growable, owning string of `char`s that manages its own memory. Copy with `=`, compare with `==`, join with `+`.',
    details: '`.size()` counts **bytes**, not characters: "héllo" has size 6 in UTF-8. `.c_str()` gives a C string for C APIs.',
    example: 'std::string name = "ada";\nname += " lovelace";\nif (name == "ada lovelace") { }',
    link: `${STD}string/basic_string`,
  },
  string_view: { kind: 'type', summary: '`std::string_view`: a cheap, non-owning view of characters owned by someone else. Great for parameters; the text must outlive the view.', link: `${STD}string/basic_string_view` },
  vector: {
    kind: 'type',
    summary: '`std::vector<T>`: a dynamic array that grows as needed. The default container: elements are stored contiguously.',
    details: '`push_back` adds to the end; `v[i]` is unchecked, `v.at(i)` checks bounds. Growing may move the elements, invalidating pointers, references and iterators into it.',
    example: 'std::vector<int> nums{3, 1, 4};\nnums.push_back(1);\nfor (int n : nums) { }',
    link: `${STD}container/vector`,
  },
  array: { kind: 'type', summary: '`std::array<T, N>`: a fixed-size array that knows its size and can be copied, unlike a C array.', link: `${STD}container/array` },
  map: {
    kind: 'type',
    summary: '`std::map<K, V>`: a sorted key → value dictionary (a balanced tree). Iterating visits keys in order.',
    details: '`m[key]` **inserts** a default value if the key is missing; use `find` or `contains` (C++20) to just look. Elements are `std::pair<const K, V>`: `.first` is the key, `.second` the value.',
    example: 'std::map<std::string, int> ages{{"ada", 36}};\nages["alan"] = 41;\nif (auto it = ages.find("ada"); it != ages.end()) { }',
    link: `${STD}container/map`,
  },
  unordered_map: { kind: 'type', summary: '`std::unordered_map<K, V>`: a hash table from keys to values. Faster lookups than `std::map` on average, but in no particular order.', link: `${STD}container/unordered_map` },
  set: { kind: 'type', summary: '`std::set<T>`: a sorted collection of unique values.', link: `${STD}container/set` },
  unordered_set: { kind: 'type', summary: '`std::unordered_set<T>`: a hash set of unique values, in no particular order.', link: `${STD}container/unordered_set` },
  deque: { kind: 'type', summary: '`std::deque<T>`: a double-ended queue with fast insertion at both ends.', link: `${STD}container/deque` },
  list: { kind: 'type', summary: '`std::list<T>`: a doubly linked list. Rarely faster than `std::vector` in practice.', link: `${STD}container/list` },
  pair: { kind: 'type', summary: '`std::pair<A, B>`: two values together, accessed as `.first` and `.second`.', link: `${STD}utility/pair` },
  tuple: { kind: 'type', summary: '`std::tuple<Ts...>`: a fixed group of values of different types. Unpack with `auto [a, b] = t;` or `std::get<0>(t)`.', link: `${STD}utility/tuple` },
  optional: {
    kind: 'type',
    summary: '`std::optional<T>`: either holds a `T` or holds nothing (`std::nullopt`). A clear way to say "there may be no result".',
    example: 'std::optional<int> age = find(ages, "ada");\nif (age) std::cout << *age;\nint a = age.value_or(0);',
    link: `${STD}utility/optional`,
  },
  nullopt: { kind: 'value', summary: '`std::nullopt`: the "empty" value for a `std::optional`.', link: `${STD}utility/optional/nullopt` },
  variant: { kind: 'type', summary: '`std::variant<A, B, ...>`: holds exactly one value of one of the listed types (a type-safe union).', link: `${STD}utility/variant` },
  function: { kind: 'type', summary: '`std::function<R(Args...)>`: holds any callable (function, lambda, functor) with that signature.', link: `${STD}utility/functional/function` },
  unique_ptr: {
    kind: 'type',
    summary: '`std::unique_ptr<T>`: a smart pointer that is the **sole owner** of a heap object and deletes it automatically when it goes out of scope.',
    details: 'It can\'t be copied, only moved (`std::move`), which transfers ownership. Create it with `std::make_unique<T>(args...)`.',
    example: 'auto shape = std::make_unique<Rect>(2.0, 3.0);\nshape->area();  // deleted automatically',
    link: `${STD}memory/unique_ptr`,
  },
  shared_ptr: {
    kind: 'type',
    summary: '`std::shared_ptr<T>`: a reference-counted smart pointer: many owners share the object, which is deleted when the last one goes away.',
    details: 'More overhead than `unique_ptr`; cycles of `shared_ptr`s leak (break them with `std::weak_ptr`).',
    link: `${STD}memory/shared_ptr`,
  },
  weak_ptr: { kind: 'type', summary: '`std::weak_ptr<T>`: a non-owning observer of a `shared_ptr` object; `lock()` gives a `shared_ptr` if it still exists.', link: `${STD}memory/weak_ptr` },
  make_unique: { kind: 'function', summary: 'Creates an object on the heap and returns a `std::unique_ptr` owning it. The preferred replacement for `new`.', example: 'auto r = std::make_unique<Rect>(2.0, 3.0);', link: `${STD}memory/unique_ptr/make_unique` },
  make_shared: { kind: 'function', summary: 'Creates an object on the heap and returns a `std::shared_ptr` owning it (one allocation for object and counter).', link: `${STD}memory/shared_ptr/make_shared` },
  move: {
    kind: 'function',
    summary: '`std::move(x)` doesn\'t move anything by itself: it marks `x` as "may be moved from", so a move constructor/assignment can **steal** its contents instead of copying.',
    details: 'After moving, `x` is valid but unspecified (a string is typically empty): only assign to it or destroy it.',
    example: 'std::string owned = std::move(text);',
    link: `${STD}utility/move`,
  },
  forward: { kind: 'function', summary: '`std::forward<T>(x)` passes a forwarding reference on with its original value category (moving temporaries, not lvalues). Used in generic wrappers.', link: `${STD}utility/forward` },
  swap: { kind: 'function', summary: 'Exchanges the values of two objects.', link: `${STD}algorithm/swap` },
  sort: { kind: 'function', summary: 'Sorts a range in place, ascending by default. Pass a comparison (often a lambda) for another order.', example: 'std::sort(v.begin(), v.end());\nstd::sort(v.begin(), v.end(), std::greater<>());', link: `${STD}algorithm/sort` },
  find: { kind: 'function', summary: 'Searches a range for a value; returns an iterator to it, or the end iterator if not found.', link: `${STD}algorithm/find` },
  max: { kind: 'function', summary: 'The larger of two values (or of an initializer list).', link: `${STD}algorithm/max` },
  min: { kind: 'function', summary: 'The smaller of two values (or of an initializer list).', link: `${STD}algorithm/min` },
  to_string: { kind: 'function', summary: 'Converts a number to a `std::string`.', link: `${STD}string/basic_string/to_string` },
  getline: { kind: 'function', summary: 'Reads a whole line from a stream into a `std::string` (without the newline).', example: 'std::string line;\nwhile (std::getline(std::cin, line)) { }', link: `${STD}string/basic_string/getline` },
  make_pair: { kind: 'function', summary: 'Creates a `std::pair`, deducing the types.', link: `${STD}utility/pair/make_pair` },
  format: { kind: 'function', summary: 'C++20: formats values into a `std::string` with `{}` placeholders, type-safe: `std::format("{} is {}", name, age)`.', link: `${STD}utility/format/format` },
  print: { kind: 'function', summary: 'C++23: prints formatted text like `std::format`, straight to stdout.', link: `${STD}io/print` },
  exception: { kind: 'type', summary: '`std::exception`: the base class of all standard exceptions. Its `what()` returns the message.', link: `${STD}error/exception` },
  runtime_error: { kind: 'type', summary: '`std::runtime_error`: an exception for errors only detectable at run time (bad input, I/O failures).', link: `${STD}error/runtime_error` },
  invalid_argument: { kind: 'type', summary: '`std::invalid_argument`: an exception meaning an argument had an unacceptable value.', link: `${STD}error/invalid_argument` },
  out_of_range: { kind: 'type', summary: '`std::out_of_range`: thrown e.g. by `vector::at` and `map::at` for an index or key that doesn\'t exist.', link: `${STD}error/out_of_range` },
  logic_error: { kind: 'type', summary: '`std::logic_error`: an exception for bugs in the program logic.', link: `${STD}error/logic_error` },
  ostream: { kind: 'type', summary: '`std::ostream`: an output stream (`std::cout`, files, string streams). Overload `operator<<` taking `std::ostream &` to make your type printable.', link: `${STD}io/basic_ostream` },
  istream: { kind: 'type', summary: '`std::istream`: an input stream (`std::cin`, files, string streams).', link: `${STD}io/basic_istream` },
  ifstream: { kind: 'type', summary: '`std::ifstream`: reads from a file. The file closes automatically when the object is destroyed.', link: `${STD}io/basic_ifstream` },
  ofstream: { kind: 'type', summary: '`std::ofstream`: writes to a file. The file closes automatically when the object is destroyed.', link: `${STD}io/basic_ofstream` },
  stringstream: { kind: 'type', summary: '`std::stringstream`: a stream reading from / writing to a string in memory.', link: `${STD}io/basic_stringstream` },
  size_t: { kind: 'type', summary: 'Unsigned integer type for sizes and counts: what `sizeof` and `.size()` return.', link: `${STD}types/size_t` },
  is_arithmetic_v: { kind: 'value', summary: '`std::is_arithmetic_v<T>`: `true` if `T` is an integer or floating-point type (a compile-time type trait from `<type_traits>`).', link: `${STD}types/is_arithmetic` },
};

const STD_NAMES = new Set(Object.keys(stdDocs).filter((k) => k !== 'std'));
for (const name of STD_NAMES) stdDocs[name] = { title: `std::${name}`, ...stdDocs[name] };

/** Keywords the grammar parses as ordinary identifiers. */
const CPP_IDENT_KEYWORDS = new Set(['static_cast', 'dynamic_cast', 'const_cast', 'reinterpret_cast', 'typeid', 'throw', 'noexcept', 'offsetof']);

const docs: DocTable = { ...buildCDocs('cpp'), ...cppDocs, ...stdDocs };
// C-only node types (C++ uses subscript_argument_list / parameter_list instead).
delete docs['subscript_expression/['];
delete docs['variadic_parameter/...'];

// ---------------------------------------------------------------- std names

interface Imports {
  all: boolean;
  names: Set<string>;
}
const importCache = new WeakMap<Tree, Imports>();

/** What `using namespace std;` / `using std::x;` make available unqualified in this file. */
function stdImports(node: Node): Imports {
  const tree = node.tree;
  const cached = importCache.get(tree);
  if (cached) return cached;
  const result: Imports = { all: false, names: new Set() };
  for (const u of tree.rootNode.descendantsOfType('using_declaration')) {
    if (!u) continue;
    const target = u.namedChildren.at(-1);
    if (!target) continue;
    if (u.children.some((c) => c?.type === 'namespace')) {
      if (target.text === 'std') result.all = true;
    } else if (target.type === 'qualified_identifier' && target.childForFieldName('scope')?.text === 'std') {
      const name = target.childForFieldName('name')?.text;
      if (name) result.names.add(name);
    }
  }
  importCache.set(tree, result);
  return result;
}

/** `std::x` → true, `geo::x` → false, plain `x` → undefined. Looks through `x<T>`. */
function stdQualified(node: Node): boolean | undefined {
  let n = node;
  if (n.parent && (n.parent.type === 'template_function' || n.parent.type === 'template_type') && fieldOf(n) === 'name') n = n.parent;
  const q = n.parent;
  if (q?.type === 'qualified_identifier' && fieldOf(n) === 'name') return q.childForFieldName('scope')?.text === 'std';
  return undefined;
}

/** Climbs from a (possibly qualified/templated) name to the expression it forms. */
function nameExpression(node: Node): Node {
  let n = node;
  while (n.parent && (n.parent.type === 'template_function' || n.parent.type === 'template_type' || n.parent.type === 'qualified_identifier') && fieldOf(n) === 'name') n = n.parent;
  return n;
}

function acceptIdentifierDoc(node: Node, field: string | null, entry: DocEntry): boolean {
  const name = node.text;
  if (name === 'std') return node.type === 'namespace_identifier';
  if (node.type === 'primitive_type') return true;
  if (CPP_IDENT_KEYWORDS.has(name)) {
    if (name === 'throw') return node.type === 'identifier';
    const p = node.parent;
    return (p?.type === 'template_function' && fieldOf(node) === 'name') || (p?.type === 'call_expression' && field === 'function');
  }
  if (STD_NAMES.has(name)) {
    if (node.type === 'field_identifier' || node.type === 'namespace_identifier') return false;
    const q = stdQualified(node);
    if (q === false) return false;
    if (q === undefined) {
      const imports = stdImports(node);
      if (!imports.all && !imports.names.has(name)) return false;
    }
    // Types may also appear as identifiers when constructed: `throw std::runtime_error("...")`.
    if (entry.kind === 'type') return node.type === 'type_identifier' || (q === true && node.type === 'identifier');
    if (node.type !== 'identifier') return false;
    if (entry.kind === 'function' && q !== true) {
      // Unqualified (via `using`): only when it's really called, not a variable named `max`.
      const e = nameExpression(node);
      return e.parent?.type === 'call_expression' && fieldOf(e) === 'function';
    }
    return true;
  }
  // C library names: unqualified or as `std::printf`.
  const q = stdQualified(node);
  if (q === false) return false;
  if (q === true) {
    if (entry.kind === 'function' || entry.kind === 'macro') {
      const e = nameExpression(node);
      return e.parent?.type === 'call_expression' && fieldOf(e) === 'function';
    }
    return entry.kind === 'type' ? node.type === 'type_identifier' : node.type === 'identifier';
  }
  return acceptBuiltin(node, field, entry);
}

// ---------------------------------------------------------------- roles

const FUNCTIONS = new Set(['function_definition', 'lambda_expression']);
const TEMPLATED = new Set(['function_definition', 'class_specifier', 'struct_specifier', 'union_specifier', 'concept_definition', 'declaration', 'alias_declaration', 'field_declaration']);

function templateOf(n: Node): Node {
  return n.parent?.type === 'template_declaration' ? n.parent : n;
}

function role(node: Node, field: string | null): Role | undefined {
  const parent = node.parent;
  if (!parent) return undefined;
  const name = `\`${node.text}\``;
  switch (`${parent.type}.${field ?? ''}`) {
    case 'namespace_definition.name':
      return { title: 'Namespace', summary: `Opens the namespace ${name}: declarations inside are referred to as \`${node.text}::name\` from outside.`, scope: parent };
    case 'nested_namespace_specifier.':
      return { title: 'Namespace', summary: `Part of a nested namespace definition (\`a::b\` opens \`b\` inside \`a\`).`, scope: parent.parent ?? undefined };
    case 'type_parameter_declaration.':
    case 'optional_type_parameter_declaration.name':
      return { title: 'Template parameter', summary: `${name} stands for a type, chosen (or deduced) each time the template is used.`, scope: parent.parent?.parent ?? undefined };
    case 'variadic_type_parameter_declaration.':
      return { title: 'Template parameter pack', summary: `${name} stands for any number of types.`, scope: parent.parent?.parent ?? undefined };
    case 'concept_definition.name':
      return { title: 'Concept', summary: `Declares the concept ${name}: a named requirement, used like \`template <${node.text} T>\`.`, scope: templateOf(parent) };
    case 'alias_declaration.name':
      return { title: 'Type alias', summary: `${name} becomes another name for \`${parent.childForFieldName('type')?.text ?? 'the type'}\`.`, scope: templateOf(parent) };
    case 'lambda_capture_specifier.': {
      const byRef = node.previousSibling?.type === '&';
      const lambda = parent.parent ?? undefined;
      return {
        title: 'Captured variable',
        summary: byRef
          ? `The lambda captures ${name} **by reference**: it uses the original variable.`
          : `The lambda captures ${name} **by copy**: it gets its own copy, made when the lambda is created.`,
        scope: lambda,
      };
    }
    case 'lambda_capture_initializer.left':
      return { title: 'Init capture', summary: `Creates the variable ${name} inside the lambda, initialized here.`, scope: parent.parent?.parent ?? undefined };
    case 'structured_binding_declarator.': {
      const owner = ancestor(node, (n) => n.type === 'declaration' || n.type === 'for_range_loop');
      return { title: 'Structured binding', summary: `${name} is bound to one element of the unpacked value (pair, tuple, struct or array).`, scope: owner };
    }
    case 'field_initializer.': {
      const cls = ancestor(node, (n) => n.type === 'class_specifier' || n.type === 'struct_specifier');
      if (cls?.childForFieldName('name')?.text === node.text) {
        return { title: 'Delegating constructor', summary: `Runs another constructor of ${name} first, to do the initialization.` };
      }
      return { title: 'Member initializer', summary: `Initializes the member ${name} with the value in parentheses, before the constructor body runs.` };
    }
  }
  if (parent.type === 'qualified_identifier' && field === 'name' && parent.parent?.type === 'using_declaration') {
    return { title: 'Using declaration', summary: `Makes \`${parent.text}\` usable as just ${name} in this scope.` };
  }
  return cRole(node, field, 'cpp');
}

// ---------------------------------------------------------------- streams

const STREAM_DOCS: Record<'<<' | '>>', DocEntry> = {
  '<<': {
    kind: 'operator',
    title: '<< (stream output)',
    summary: 'Writes the value on the right **to the stream** on the left (`std::cout`, a file, an `std::ostream &`). It returns the stream, so writes chain: `cout << a << b`.',
    details: 'Make your own type printable by overloading `std::ostream &operator<<(std::ostream &, const T &)`. Precedence trap: parenthesize expressions like `cout << (a & b)`.',
    example: 'std::cout << "total: " << total << \'\\n\';',
    link: ref('io/basic_ostream/operator_ltlt'),
  },
  '>>': {
    kind: 'operator',
    title: '>> (stream input)',
    summary: 'Reads a value from the stream on the left **into** the variable on the right, skipping whitespace. The stream converts to `false` when reading fails.',
    example: 'int n;\nif (std::cin >> n) { /* got a number */ }',
    link: ref('io/basic_istream/operator_gtgt'),
  },
};
const SHIFT_DOCS: Record<'<<' | '>>', DocEntry> = {
  '<<': { kind: 'operator', title: '<< (left shift)', summary: 'Shifts the bits left: `x << n` is `x` times 2ⁿ. (On streams, `<<` means output instead.)', link: lang('operator_arithmetic') },
  '>>': { kind: 'operator', title: '>> (right shift)', summary: 'Shifts the bits right: `x >> n` divides an unsigned value by 2ⁿ. (On streams, `>>` means input instead.)', link: lang('operator_arithmetic') },
};

const STREAM_NAME = /^(std::)?w?(cout|cerr|clog|cin)$|^(os|out|is|in|ss|oss|iss|stream|file|log)$|(stream|_os|_out)$/;

/** Heuristic: is this `<<`/`>>` used on a stream rather than as a bit shift? */
function isStreamOp(expr: Node, op: string): boolean {
  // Leftmost operand of a chain like `cout << a << b`.
  let left: Node | null = expr;
  while (left?.type === 'binary_expression' && left.childForFieldName('operator')?.type === op) left = left.childForFieldName('left');
  if (left && STREAM_NAME.test(left.text)) return true;
  // Strings, characters and manipulators are never shifted.
  for (let e: Node | null = expr; e?.type === 'binary_expression' && e.childForFieldName('operator')?.type === op; e = e.childForFieldName('left')) {
    const right = e.childForFieldName('right');
    if (right && /^(string_literal|raw_string_literal|char_literal|concatenated_string|user_defined_literal)$/.test(right.type)) return true;
    if (right && /^(std::)?(endl|flush|ws|setw|setprecision|hex|dec|fixed)\b/.test(right.text)) return true;
  }
  return false;
}

const cppStatic = buildStaticDocs('cpp');

function docFor(token: Node): DocEntry | undefined {
  const op = token.type;
  if ((op === '<<' || op === '>>') && token.parent?.type === 'binary_expression') {
    return isStreamOp(token.parent, op) ? STREAM_DOCS[op] : SHIFT_DOCS[op];
  }
  return staticDoc(token, cppStatic);
}

// ---------------------------------------------------------------- jumps

function jumpTarget(token: Node): JumpTarget | undefined {
  switch (token.type) {
    case 'throw': {
      const rethrow = token.parent?.type === 'throw_statement' && token.parent.namedChildCount === 0;
      for (let n = token.parent; n; n = n.parent) {
        if (FUNCTIONS.has(n.type)) return { node: n, verb: rethrow ? 'rethrows the current exception out of' : 'throws out of' };
        if (n.parent?.type === 'try_statement' && fieldOf(n) === 'body') {
          return { node: n.parent, verb: rethrow ? 'rethrows to the handlers of' : 'is caught by a matching `catch` of' };
        }
      }
      return undefined;
    }
    case 'co_return':
    case 'co_yield':
    case 'co_await': {
      const fn = ancestor(token, (n) => FUNCTIONS.has(n.type));
      const verb = token.type === 'co_return' ? 'finishes the coroutine' : token.type === 'co_yield' ? 'hands a value to the caller and suspends' : 'may suspend';
      return fn && { node: fn, verb };
    }
  }
  return cJumpTarget(token);
}

export const cpp: LanguageSpec = {
  comments: cppComments,
  id: 'cpp',
  languageIds: ['cpp'],
  displayName: 'C++',
  wasm: 'tree-sitter-cpp.wasm',
  fence: 'cpp',
  docs,
  identifierTypes: new Set(['identifier', 'type_identifier', 'field_identifier', 'primitive_type', 'statement_identifier', 'namespace_identifier']),
  keywordNodeTypes: new Set(['preproc_directive']),
  wrapperTypes: new Set([
    ...C_WRAPPERS,
    'virtual_specifier',
    'explicit_function_specifier',
    'placeholder_type_specifier',
    'noexcept',
    'operator_name',
    'operator_cast',
    'catch_clause',
    'default_method_clause',
    'delete_method_clause',
    'lambda_default_capture',
    'access_specifier',
    'requires_clause',
    'trailing_return_type',
  ]),
  noScopeTokens: new Set([',', ';', '.', '"', "'", ':', '=', 'L"', 'u"', 'U"', 'u8"', 'R"', "L'", "u'", "U'", "u8'"]),
  role,
  jumpTarget,
  promote(scope) {
    // The capture list and `mutable`/`-> T` of a lambda describe the whole lambda.
    if ((scope.type === 'lambda_capture_specifier' || scope.type === 'abstract_function_declarator') && scope.parent?.type === 'lambda_expression') return scope.parent;
    const s = cPromote(scope);
    return TEMPLATED.has(s.type) ? templateOf(s) : s;
  },
  isDeclarationName,
  docFor,
  acceptIdentifierDoc,
};
