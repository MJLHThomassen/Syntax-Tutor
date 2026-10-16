import type { Node } from 'web-tree-sitter';
import type { DocEntry, DocTable, LanguageSpec, Role } from '../core/model';
import { ancestor, fieldOf } from '../core/nodes';
import { csharpComments } from './comments';

const REF = 'https://learn.microsoft.com/en-us/dotnet/csharp/language-reference';
const KW = `${REF}/keywords`;
const OP = `${REF}/operators`;
const ST = `${REF}/statements`;
const BT = `${REF}/builtin-types`;
const TOK = `${REF}/tokens`;
const API = 'https://learn.microsoft.com/en-us/dotnet/api';
const GUIDE = 'https://learn.microsoft.com/en-us/dotnet/csharp';

const kw = (page: string) => `${KW}/${page}`;
const op = (page: string) => `${OP}/${page}`;
const st = (page: string) => `${ST}/${page}`;
const api = (name: string) => `${API}/${name.toLowerCase()}`;

const ACCESS = kw('access-modifiers');
const NUMERIC = `${BT}/integral-numeric-types`;
const FLOATING = `${BT}/floating-point-numeric-types`;
const LINQ = `${GUIDE}/linq/get-started/query-expression-basics`;

/** Builds an entry for one of the many built-in numeric types. */
const num = (summary: string, link = NUMERIC): DocEntry => ({ kind: 'type', summary, link });

const docs: DocTable = {
  // ------------------------------------------------- types and declarations
  class: {
    kind: 'keyword',
    summary: 'Declares a **class**: a reference type with fields, properties, methods and constructors. Variables hold a *reference* to the object, so copies share the same instance.',
    details: 'A class can inherit from **one** base class and implement any number of interfaces (`class Dog : Animal, IComparable<Dog>`). Classes are `null` by default when not initialized.',
    example: 'public class Person\n{\n    public string Name { get; set; } = "";\n    public void Greet() => Console.WriteLine($"Hi, {Name}");\n}',
    link: kw('class'),
  },
  'type_parameter_constraint/class': {
    kind: 'keyword',
    title: 'class (constraint)',
    summary: 'Generic constraint: the type argument must be a **reference type** (a class, interface, delegate or array). `class?` also allows nullable reference types.',
    example: 'void Reset<T>(ref T? x) where T : class => x = null;',
    link: kw('where-generic-type-constraint'),
  },
  'record_declaration/class': {
    kind: 'keyword',
    title: 'record class',
    summary: '`record class` is the same as plain `record`: a reference type with value-based equality. The word `class` just makes that explicit.',
    link: `${BT}/record`,
  },
  struct: {
    kind: 'keyword',
    summary: 'Declares a **struct**: a *value type*. Assigning or passing a struct copies all its data, so the copy is independent.',
    details: 'Good for small, immutable data (`Point`, `Size`). Structs cannot inherit from other structs/classes, and a struct variable can never be `null` (use `Size?` for that). Mark it `readonly struct` to forbid mutation.',
    example: 'public readonly struct Point\n{\n    public Point(int x, int y) { X = x; Y = y; }\n    public int X { get; }\n    public int Y { get; }\n}',
    link: `${BT}/struct`,
  },
  'type_parameter_constraint/struct': {
    kind: 'keyword',
    title: 'struct (constraint)',
    summary: 'Generic constraint: the type argument must be a non-nullable **value type** (`int`, `DateTime`, your own structs...).',
    example: 'T? Find<T>(T[] xs) where T : struct => xs.Length > 0 ? xs[0] : null;',
    link: kw('where-generic-type-constraint'),
  },
  'record_declaration/struct': {
    kind: 'keyword',
    title: 'record struct',
    summary: 'A **value-type record**: a struct that gets generated equality, `ToString`, deconstruction and `with` support.',
    example: 'public record struct Range(int Start, int End);',
    link: `${BT}/record`,
  },
  record: {
    kind: 'keyword',
    summary: 'Declares a **record**: a type meant for data. The compiler generates value-based `==`, `GetHashCode`, a readable `ToString()`, deconstruction and support for `with` copies.',
    details: 'With a parameter list (`record Point(int X, int Y)`) you get public init-only properties and a constructor for free. Plain `record` is a reference type; `record struct` is a value type.',
    example: 'public record Point(int X, int Y);\n\nvar a = new Point(1, 2);\nvar b = a with { Y = 5 };\nConsole.WriteLine(a == new Point(1, 2)); // True',
    link: `${BT}/record`,
  },
  interface: {
    kind: 'keyword',
    summary: 'Declares an **interface**: a contract listing members that implementing types must provide. A class or struct implements it with `: IName`.',
    details: 'By convention interface names start with `I`. Members may have a default implementation (C# 8+). A type can implement many interfaces.',
    example: 'public interface IShape\n{\n    double Area();\n}\n\npublic class Square : IShape\n{\n    public double Side;\n    public double Area() => Side * Side;\n}',
    link: kw('interface'),
  },
  enum: {
    kind: 'keyword',
    summary: 'Declares an **enum**: a set of named integer constants. Values are `0, 1, 2, ...` unless you assign them.',
    details: 'Enums are value types and can hold *any* integer of their underlying type, not just the named ones; check with `Enum.IsDefined`. Use `[Flags]` for bit combinations.',
    example: 'public enum Color { Red, Green = 2, Blue }\n\nColor c = Color.Blue; // (int)c == 3',
    link: `${BT}/enum`,
  },
  delegate: {
    kind: 'keyword',
    summary: 'Declares a **delegate type**: a type-safe reference to a method with a given signature. Like a function pointer, but it can also capture an object.',
    details: 'Most code uses the built-in `Func<...>` and `Action<...>` instead of declaring its own delegate types.',
    example: 'public delegate int Combine(int a, int b);\n\nCombine add = (a, b) => a + b;\nConsole.WriteLine(add(2, 3));',
    link: `${BT}/reference-types#the-delegate-type`,
  },
  'anonymous_method_expression/delegate': {
    kind: 'keyword',
    title: 'delegate (anonymous method)',
    summary: 'An inline, unnamed method (older syntax). Today you would usually write a lambda `() => { ... }` instead.',
    example: 'Action hello = delegate { Console.WriteLine("hi"); };',
    link: op('delegate-operator'),
  },
  event: {
    kind: 'keyword',
    summary: 'Declares an **event**: a delegate that outside code can only subscribe to (`+=`) or unsubscribe from (`-=`). Only the declaring class can raise it.',
    example: 'public event EventHandler? Changed;\n\nprotected void OnChanged() => Changed?.Invoke(this, EventArgs.Empty);',
    link: kw('event'),
  },
  namespace: {
    kind: 'keyword',
    summary: 'Declares a **namespace**: a named group of types, used to organize code and avoid name clashes. Types inside are referred to as `Namespace.Type`, or imported with `using`.',
    example: 'namespace MyApp.Models\n{\n    public class User { }\n}',
    link: kw('namespace'),
  },
  'file_scoped_namespace_declaration/namespace': {
    kind: 'keyword',
    title: 'namespace (file-scoped)',
    summary: '`namespace Name;` (with a semicolon) puts **everything in this file** into the namespace, without an extra level of braces and indentation. C# 10+.',
    example: 'namespace MyApp.Models;\n\npublic class User { }',
    link: kw('namespace'),
  },
  using: {
    kind: 'keyword',
    title: 'using (directive)',
    summary: 'Imports a namespace so you can write `Console` instead of `System.Console`. It only affects this file (unless marked `global`).',
    details: 'Modern projects have *implicit usings* (`System`, `System.Linq`, `System.Collections.Generic`, ...) turned on, so you often don\'t see them. `using Alias = Some.Long.Name;` creates an alias.',
    example: 'using System.Text;\nusing Json = System.Text.Json.JsonSerializer;',
    link: kw('using-directive'),
  },
  'using_statement/using': {
    kind: 'keyword',
    title: 'using (statement)',
    summary: 'Uses a disposable resource (file, connection, ...) and **guarantees** that its `Dispose()` runs when the block ends, even if an exception is thrown.',
    details: 'It is shorthand for `try { ... } finally { resource.Dispose(); }`. The resource must implement `IDisposable` (or `IAsyncDisposable` with `await using`).',
    example: 'using (var reader = new StreamReader("data.txt"))\n{\n    Console.WriteLine(reader.ReadLine());\n} // reader.Dispose() runs here',
    link: st('using'),
  },
  'local_declaration_statement/using': {
    kind: 'keyword',
    title: 'using (declaration)',
    summary: 'A `using` *declaration*: the variable is disposed automatically at the end of the **enclosing block** (no extra braces needed). C# 8+.',
    example: 'using var file = File.OpenRead("data.bin");\n// ... use file ...\n// file.Dispose() runs when the enclosing block ends',
    link: st('using'),
  },
  'using_directive/static': {
    kind: 'keyword',
    title: 'using static',
    summary: 'Imports the **static members** of a type, so you can call them without the type name: `Sqrt(2)` instead of `Math.Sqrt(2)`.',
    example: 'using static System.Math;\n\ndouble r = Sqrt(PI);',
    link: kw('using-directive#the-static-modifier'),
  },
  'using_directive/global': {
    kind: 'keyword',
    title: 'global using',
    summary: 'Makes this `using` directive apply to **every file** in the project, not just this one. Usually kept in one file such as `GlobalUsings.cs`.',
    example: 'global using System.Text.Json;',
    link: kw('using-directive#the-global-modifier'),
  },
  global: {
    kind: 'keyword',
    title: 'global::',
    summary: '`global::` means "start at the root namespace". It avoids picking up a nested namespace or type that happens to have the same name.',
    example: 'var list = new global::System.Collections.Generic.List<int>();',
    link: op('namespace-alias-qualifier'),
  },

  // -------------------------------------------------------------- modifiers
  public: {
    kind: 'keyword',
    summary: 'Access modifier: accessible from **any** code, in this assembly or others.',
    details: 'Defaults when you write nothing: `private` for members, `internal` for top-level types.',
    link: kw('public'),
  },
  private: {
    kind: 'keyword',
    summary: 'Access modifier: accessible only **inside the containing type**. This is the default for class and struct members.',
    details: '`private protected` means: derived types, but only in this assembly.',
    link: kw('private'),
  },
  protected: {
    kind: 'keyword',
    summary: 'Access modifier: accessible inside the containing class **and classes derived from it**.',
    details: '`protected internal` means: derived types *or* anything in this assembly.',
    link: kw('protected'),
  },
  internal: {
    kind: 'keyword',
    summary: 'Access modifier: accessible from anywhere **in the same assembly** (project), but not from other assemblies. The default for top-level types.',
    link: kw('internal'),
  },
  file: {
    kind: 'keyword',
    summary: 'Access modifier for types: the type is visible **only in this source file**. Mostly used by source generators. C# 11+.',
    link: kw('file'),
  },
  static: {
    kind: 'keyword',
    summary: 'The member belongs to the **type itself**, not to an instance: call it as `TypeName.Member`. A `static class` can only contain static members and cannot be instantiated.',
    details: 'Static fields are shared by all instances. `Main` is static because it runs before any object exists.',
    example: 'public static class MathUtil\n{\n    public static int Square(int x) => x * x;\n}\n\nint nine = MathUtil.Square(3);',
    link: kw('static'),
  },
  'lambda_expression/static': {
    kind: 'keyword',
    title: 'static (lambda)',
    summary: 'A `static` lambda may not capture local variables or `this`. The compiler checks this, which avoids hidden allocations.',
    example: 'Func<int, int> twice = static x => x * 2;',
    link: op('lambda-expressions'),
  },
  readonly: {
    kind: 'keyword',
    summary: 'A `readonly` field can only be assigned in its declaration or in a constructor. On a struct, `readonly struct` makes the whole struct immutable.',
    details: 'Unlike `const`, the value is computed at run time, and can be any type. A `readonly` field holding a list still lets you modify the list\'s *contents*.',
    example: 'private readonly HttpClient client = new();',
    link: kw('readonly'),
  },
  const: {
    kind: 'keyword',
    summary: 'Declares a **compile-time constant**. The value must be known when compiling (numbers, strings, `bool`, enums, `null`) and is copied into every place that uses it.',
    details: 'Constants are implicitly `static`. For values computed at run time, use `static readonly` instead.',
    example: 'const int MaxUsers = 100;\nconst string Greeting = "Hello";',
    link: kw('const'),
  },
  abstract: {
    kind: 'keyword',
    summary: 'An `abstract` class cannot be instantiated; it is meant as a base class. An `abstract` member has **no body**: every non-abstract derived class must `override` it.',
    example: 'public abstract class Shape\n{\n    public abstract double Area();\n}',
    link: kw('abstract'),
  },
  virtual: {
    kind: 'keyword',
    summary: 'Allows derived classes to `override` this method or property. Unlike Java, C# methods are **not** virtual by default.',
    example: 'public virtual string Describe() => "a shape";',
    link: kw('virtual'),
  },
  override: {
    kind: 'keyword',
    summary: 'Replaces the implementation of an inherited `virtual` or `abstract` member. Calls through a base-class reference run this version.',
    details: 'Call the base version with `base.Method()`.',
    example: 'public override string ToString() => $"Circle r={Radius}";',
    link: kw('override'),
  },
  sealed: {
    kind: 'keyword',
    summary: 'A `sealed` class cannot be inherited from. On an `override`, `sealed` stops further overriding in derived classes.',
    link: kw('sealed'),
  },
  partial: {
    kind: 'keyword',
    summary: 'The type (or method) is split over **several declarations**, often in different files. The compiler merges them; commonly used with generated code.',
    link: kw('partial-type'),
  },
  'modifier/new': {
    kind: 'keyword',
    title: 'new (modifier)',
    summary: 'Explicitly **hides** an inherited member with the same name. Unlike `override`, calls through a base-class reference still use the base version.',
    details: 'Usually a sign to rethink the design: hiding is rarely what you want. The modifier mainly silences the compiler warning.',
    example: 'public new string ToString() => "hidden";',
    link: kw('new-modifier'),
  },
  async: {
    kind: 'keyword',
    summary: 'Marks a method or lambda as **asynchronous**, which allows `await` inside it. It usually returns `Task`, `Task<T>` or `ValueTask<T>`.',
    details: 'Avoid `async void` except for event handlers: exceptions from it cannot be caught by the caller. By convention async method names end in `Async`.',
    example: 'async Task<string> LoadAsync(string url)\n{\n    using var http = new HttpClient();\n    return await http.GetStringAsync(url);\n}',
    link: kw('async'),
  },
  extern: {
    kind: 'keyword',
    summary: 'The method is implemented **outside** C#, typically in a native library imported with `[DllImport]`.',
    link: kw('extern'),
  },
  volatile: {
    kind: 'keyword',
    summary: 'The field may be changed by other threads; the compiler and CPU must not cache or reorder reads/writes of it. Prefer `lock` or `Interlocked` for real synchronization.',
    link: kw('volatile'),
  },
  unsafe: {
    kind: 'keyword',
    summary: 'Allows **pointers** and other unchecked memory operations inside this type, member or block. Requires `<AllowUnsafeBlocks>` in the project.',
    example: 'unsafe\n{\n    int x = 5;\n    int* p = &x;\n    *p = 6;\n}',
    link: kw('unsafe'),
  },
  required: {
    kind: 'keyword',
    summary: 'Callers **must** set this property or field in an object initializer when creating the object; otherwise it is a compile error. C# 11+.',
    example: 'public required string Name { get; init; }\n\nvar u = new User { Name = "Ann" }; // OK\n// var bad = new User(); // error',
    link: kw('required'),
  },
  params: {
    kind: 'keyword',
    summary: 'The last parameter accepts **any number of arguments**, which the method receives as an array (or other collection).',
    example: 'int Sum(params int[] xs) => xs.Sum();\n\nSum(1, 2, 3);\nSum();',
    link: kw('method-parameters#params-modifier'),
  },
  ref: {
    kind: 'keyword',
    summary: '`ref` passes or stores a **reference to a variable** instead of a copy of its value, so changes are visible to the other side.',
    link: kw('ref'),
  },
  'parameter/ref': {
    kind: 'keyword',
    title: 'ref (parameter)',
    summary: 'A `ref` parameter is an **alias for the caller\'s variable**: assigning to it changes the caller\'s variable. The caller must write `ref` too, and the variable must be initialized.',
    example: 'void Bump(ref int n) => n++;\n\nint count = 0;\nBump(ref count); // count == 1',
    link: kw('ref'),
  },
  'argument/ref': {
    kind: 'keyword',
    title: 'ref (argument)',
    summary: 'Passes this variable **by reference** to a `ref` parameter: the method can change it.',
    link: kw('ref'),
  },
  'ref_type/ref': {
    kind: 'keyword',
    title: 'ref local / ref return',
    summary: 'A `ref` variable or return value **refers to another storage location** (like an alias) instead of holding a copy.',
    example: 'ref int first = ref numbers[0];\nfirst = 42; // changes numbers[0]',
    link: kw('ref'),
  },
  'ref_expression/ref': {
    kind: 'keyword',
    title: 'ref (expression)',
    summary: 'Takes a reference to a variable, to initialize a `ref` local or return by reference.',
    link: kw('ref'),
  },
  out: {
    kind: 'keyword',
    title: 'out',
    summary: 'Marks an argument passed to an `out` parameter: the method **will assign** this variable. `out var x` declares the variable right there.',
    example: 'if (int.TryParse("42", out var n))\n    Console.WriteLine(n);',
    link: kw('method-parameters#out-parameter-modifier'),
  },
  'parameter/out': {
    kind: 'keyword',
    title: 'out (parameter)',
    summary: 'An **output parameter**: the method must assign it before returning, and the caller sees the value. Common in `TryXxx` methods that return `bool`.',
    details: 'For several results, a tuple return `(int, string)` is often nicer.',
    example: 'bool TryHalve(int n, out int half)\n{\n    half = n / 2;\n    return n % 2 == 0;\n}',
    link: kw('method-parameters#out-parameter-modifier'),
  },
  'type_parameter/out': {
    kind: 'keyword',
    title: 'out (covariance)',
    summary: 'The type parameter is **covariant**: it only appears in outputs, so an `IEnumerable<string>` can be used where an `IEnumerable<object>` is expected.',
    link: kw('out-generic-modifier'),
  },
  'parameter/in': {
    kind: 'keyword',
    title: 'in (parameter)',
    summary: 'A **read-only reference** parameter: the argument is passed by reference (no copy) but the method may not modify it. Mostly useful for large structs.',
    example: 'double Length(in Vector3 v) => Math.Sqrt(v.X * v.X + v.Y * v.Y + v.Z * v.Z);',
    link: kw('method-parameters#in-parameter-modifier'),
  },
  'type_parameter/in': {
    kind: 'keyword',
    title: 'in (contravariance)',
    summary: 'The type parameter is **contravariant**: it only appears in inputs, so an `IComparer<object>` can be used where an `IComparer<string>` is expected.',
    link: kw('in-generic-modifier'),
  },
  'parameter/this': {
    kind: 'keyword',
    title: 'this (extension method)',
    summary: '`this` on the first parameter makes this an **extension method**: it can be called as if it were a method of that type, e.g. `5.Twice()`.',
    details: 'Extension methods must be `static` and live in a `static` class. LINQ (`Where`, `Select`, ...) is built from them.',
    example: 'public static class IntExtensions\n{\n    public static int Twice(this int n) => n * 2;\n}',
    link: `${GUIDE}/programming-guide/classes-and-structs/extension-methods`,
  },

  // ----------------------------------------------------------- members
  this: {
    kind: 'keyword',
    summary: 'The **current instance** of the class or struct. Often used to tell a field apart from a parameter with the same name: `this.radius = radius`.',
    link: kw('this'),
  },
  'constructor_initializer/this': {
    kind: 'keyword',
    title: ': this(...)',
    summary: 'Calls **another constructor** of the same type first, so shared setup code lives in one place.',
    example: 'public Point() : this(0, 0) { }',
    link: kw('this'),
  },
  'indexer_declaration/this': {
    kind: 'keyword',
    title: 'this[...] (indexer)',
    summary: 'Declares an **indexer**, so instances can be used with square brackets like an array: `obj[i]`.',
    example: 'public int this[int i]\n{\n    get => items[i];\n    set => items[i] = value;\n}',
    link: `${GUIDE}/programming-guide/indexers/`,
  },
  base: {
    kind: 'keyword',
    summary: 'Accesses members of the **base class**, e.g. `base.ToString()` to call the version you are overriding.',
    link: kw('base'),
  },
  'constructor_initializer/base': {
    kind: 'keyword',
    title: ': base(...)',
    summary: 'Calls a **base-class constructor** before this constructor\'s body runs. Without it, the base class\'s parameterless constructor is called.',
    example: 'public Circle(double r) : base("circle") { Radius = r; }',
    link: kw('base'),
  },
  get: {
    kind: 'keyword',
    summary: 'The **getter** of a property or indexer: runs when the value is read. `{ get; }` alone makes an auto-property that can only be set in a constructor.',
    example: 'public int Count { get; private set; }\npublic bool IsEmpty => Count == 0; // getter-only shorthand',
    link: kw('get'),
  },
  set: {
    kind: 'keyword',
    summary: 'The **setter** of a property or indexer: runs on assignment. Inside it, `value` is the new value.',
    example: 'public double Radius\n{\n    get => radius;\n    set => radius = value < 0 ? 0 : value;\n}',
    link: kw('set'),
  },
  init: {
    kind: 'keyword',
    summary: 'An **init-only setter**: the property can be set in a constructor or object initializer (`new T { X = 1 }`), but not changed afterwards. C# 9+.',
    example: 'public int Width { get; init; }\n\nvar s = new Size { Width = 3 };\n// s.Width = 4; // error',
    link: kw('init'),
  },
  add: {
    kind: 'keyword',
    summary: 'Custom code that runs when someone subscribes to the event with `+=`.',
    link: kw('add'),
  },
  remove: {
    kind: 'keyword',
    summary: 'Custom code that runs when someone unsubscribes from the event with `-=`.',
    link: kw('remove'),
  },
  value: {
    kind: 'keyword',
    summary: 'Inside a `set` or `init` accessor, `value` is the **new value being assigned**. (Outside accessors it is an ordinary name.)',
    example: 'set { if (value < 0) throw new ArgumentOutOfRangeException(); radius = value; }',
    link: kw('value'),
  },
  operator: {
    kind: 'keyword',
    summary: 'Declares an **operator overload**: what `+`, `==`, `<` etc. do for your type. Operator methods are always `public static`.',
    details: 'Some come in pairs: if you define `==` you must also define `!=` (and should override `Equals`/`GetHashCode`).',
    example: 'public static Money operator +(Money a, Money b) => new(a.Cents + b.Cents);',
    link: op('operator-overloading'),
  },
  implicit: {
    kind: 'keyword',
    summary: 'Declares an **implicit conversion**: the compiler converts automatically, without a cast. Only use it when the conversion can never fail or lose information.',
    example: 'public static implicit operator double(Circle c) => c.Radius;\n\ndouble d = circle; // no cast needed',
    link: op('user-defined-conversion-operators'),
  },
  explicit: {
    kind: 'keyword',
    summary: 'Declares an **explicit conversion**: callers must write a cast, `(int)value`. Use it when the conversion might fail or lose information.',
    example: 'public static explicit operator int(Celsius c) => (int)c.Degrees;',
    link: op('user-defined-conversion-operators'),
  },
  where: {
    kind: 'keyword',
    title: 'where (generic constraint)',
    summary: 'Restricts what type arguments a generic type or method accepts, which lets you use their members: `where T : IComparable<T>` allows calling `CompareTo`.',
    details: 'Common constraints: `class`, `struct`, `notnull`, `new()` (has a parameterless constructor), `unmanaged`, a base class or interfaces.',
    example: 'T Max<T>(T a, T b) where T : IComparable<T>\n    => a.CompareTo(b) >= 0 ? a : b;',
    link: kw('where-generic-type-constraint'),
  },
  notnull: {
    kind: 'keyword',
    title: 'notnull (constraint)',
    summary: 'Generic constraint: the type argument must be a **non-nullable** type (value type or non-nullable reference type).',
    link: kw('where-generic-type-constraint'),
  },
  'constructor_constraint/new': {
    kind: 'keyword',
    title: 'new() (constraint)',
    summary: 'Generic constraint: the type must have a **public parameterless constructor**, so the code may write `new T()`. Must come last in the list.',
    example: 'T Create<T>() where T : new() => new T();',
    link: kw('new-constraint'),
  },

  // -------------------------------------------------- objects and creation
  new: {
    kind: 'keyword',
    title: 'new (operator)',
    summary: 'Creates a new object by calling a constructor. For reference types this allocates on the heap; the garbage collector frees it later.',
    details: 'You can follow it with an *object initializer* to set properties: `new Person { Name = "Ann" }`, or a *collection initializer*: `new List<int> { 1, 2 }`.',
    example: 'var people = new List<Person>();\nvar ann = new Person("Ann") { Age = 31 };',
    link: op('new-operator'),
  },
  'implicit_object_creation_expression/new': {
    kind: 'keyword',
    title: 'new(...) (target-typed)',
    summary: 'A **target-typed** `new`: the type is left out because the compiler knows it from the context (the variable type, parameter type, return type...). C# 9+.',
    example: 'Point p = new(1, 2);\nList<string> names = new();',
    link: op('new-operator#target-typed-new'),
  },
  'anonymous_object_creation_expression/new': {
    kind: 'keyword',
    title: 'new { ... } (anonymous type)',
    summary: 'Creates an object of an **anonymous type** with read-only properties. Handy in LINQ `select` clauses; the type has no name you can write, so use `var`.',
    example: 'var item = new { Name = "pen", Price = 1.5 };\nConsole.WriteLine(item.Name);',
    link: `${GUIDE}/programming-guide/classes-and-structs/anonymous-types`,
  },
  'array_creation_expression/new': {
    kind: 'keyword',
    title: 'new T[...] (array)',
    summary: 'Creates an **array** of fixed length. Elements start as their default value (`0`, `null`, `false`...).',
    example: 'var squares = new int[10];\nvar names = new string[] { "a", "b" };',
    link: `${GUIDE}/language-reference/builtin-types/arrays`,
  },
  'implicit_array_creation_expression/new': {
    kind: 'keyword',
    title: 'new[] { ... }',
    summary: 'Creates an array whose element type is **inferred** from the values in braces.',
    example: 'var primes = new[] { 2, 3, 5, 7 }; // int[]',
    link: `${BT}/arrays`,
  },
  with: {
    kind: 'keyword',
    summary: 'Creates a **copy** of a record (or struct / anonymous object) with some properties changed. The original is untouched.',
    example: 'var older = person with { Age = person.Age + 1 };',
    link: op('with-expression'),
  },
  stackalloc: {
    kind: 'keyword',
    summary: 'Allocates a block of memory **on the stack** (freed automatically when the method returns). Usually assigned to a `Span<T>`.',
    example: 'Span<int> buffer = stackalloc int[16];',
    link: op('stackalloc'),
  },

  // ------------------------------------------------------- control flow
  if: {
    kind: 'keyword',
    summary: 'Runs the following statement or block only if the condition (a `bool`) is `true`. Parentheses around the condition are required.',
    details: 'Unlike C, integers are not conditions: `if (count)` is an error; write `if (count != 0)`.',
    example: 'if (age >= 18)\n{\n    Console.WriteLine("adult");\n}\nelse if (age > 12) { ... }\nelse { ... }',
    link: st('selection-statements#the-if-statement'),
  },
  else: {
    kind: 'keyword',
    summary: 'The branch of an `if` that runs when the condition is `false`. `else if` chains further conditions.',
    link: st('selection-statements#the-if-statement'),
  },
  switch: {
    kind: 'keyword',
    title: 'switch (statement)',
    summary: 'Picks a `case` section to run by matching a value against constants or **patterns**. A `default:` section runs when nothing matches.',
    details: 'Unlike C, control may **not fall through** from one non-empty section to the next: end each section with `break`, `return`, `throw` or `goto case`. Empty sections stacked together share one body.',
    example: 'switch (day)\n{\n    case DayOfWeek.Saturday:\n    case DayOfWeek.Sunday:\n        Console.WriteLine("weekend");\n        break;\n    default:\n        Console.WriteLine("workday");\n        break;\n}',
    link: st('selection-statements#the-switch-statement'),
  },
  'switch_expression/switch': {
    kind: 'keyword',
    title: 'switch (expression)',
    summary: 'A **switch expression**: `value switch { pattern => result, ... }` produces a value. The arms are tried top to bottom; `_` matches anything.',
    details: 'If no arm matches at run time, it throws `SwitchExpressionException`; the compiler warns when the arms are not exhaustive.',
    example: 'string size = n switch\n{\n    < 10 => "small",\n    < 100 => "medium",\n    _ => "large",\n};',
    link: op('switch-expression'),
  },
  case: {
    kind: 'keyword',
    summary: 'Starts a section of a `switch` statement: the code below it runs when the value matches this constant or pattern.',
    example: 'case 0:\ncase int n when n < 0:\n    Console.WriteLine("not positive");\n    break;',
    link: st('selection-statements#the-switch-statement'),
  },
  'goto_statement/case': {
    kind: 'keyword',
    title: 'goto case',
    summary: 'Jumps to another `case` section of the same `switch`. This is how C# does an explicit "fall through".',
    link: st('jump-statements#the-goto-statement'),
  },
  default: {
    kind: 'keyword',
    title: 'default (value)',
    summary: 'The **default value** of a type: `0` for numbers, `false` for `bool`, `null` for reference types, all-zero for structs. `default(T)` names the type; plain `default` infers it.',
    example: 'int zero = default;\nT empty = default(T);',
    link: op('default'),
  },
  'switch_section/default': {
    kind: 'keyword',
    title: 'default (switch)',
    summary: 'The section of a `switch` that runs when **no `case` matches**. It may appear anywhere in the list, but is usually last.',
    link: st('selection-statements#the-switch-statement'),
  },
  'goto_statement/default': {
    kind: 'keyword',
    title: 'goto default',
    summary: 'Jumps to the `default:` section of the enclosing `switch`.',
    link: st('jump-statements#the-goto-statement'),
  },
  when: {
    kind: 'keyword',
    title: 'when (case guard)',
    summary: 'An extra condition on a `case` or switch-expression arm: it only matches if the pattern matches **and** this condition is true.',
    example: 'case int n when n > 100:\n    ...\n// or in a switch expression:\nint n when n < 0 => "negative",',
    link: st('selection-statements#case-guards'),
  },
  'catch_filter_clause/when': {
    kind: 'keyword',
    title: 'when (exception filter)',
    summary: 'An **exception filter**: this `catch` only handles the exception if the condition is true. Otherwise the exception keeps going up as if this catch weren\'t there.',
    example: 'catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)\n{\n    return null;\n}',
    link: st('exception-handling-statements#a-when-exception-filter'),
  },
  for: {
    kind: 'keyword',
    summary: 'A loop with three parts: `for (initializer; condition; iterator)`. Any part may be empty; `for (;;)` loops forever.',
    example: 'for (int i = 0; i < 10; i++)\n{\n    Console.WriteLine(i);\n}',
    link: st('iteration-statements#the-for-statement'),
  },
  foreach: {
    kind: 'keyword',
    summary: 'Loops over every element of a collection (anything with `GetEnumerator()`, such as arrays, `List<T>`, `IEnumerable<T>`).',
    details: 'The loop variable is read-only, and you must not add or remove items of a `List` while looping over it (that throws).',
    example: 'foreach (var name in names)\n{\n    Console.WriteLine(name);\n}',
    link: st('iteration-statements#the-foreach-statement'),
  },
  'foreach_statement/await': {
    kind: 'keyword',
    title: 'await foreach',
    summary: 'Loops over an **async stream** (`IAsyncEnumerable<T>`), awaiting each next element.',
    example: 'await foreach (var line in ReadLinesAsync(path))\n    Console.WriteLine(line);',
    link: st('iteration-statements#await-foreach'),
  },
  in: {
    kind: 'keyword',
    title: 'in (foreach)',
    summary: 'Separates the loop variable from the collection being looped over.',
    example: 'foreach (var item in items) { }',
    link: st('iteration-statements#the-foreach-statement'),
  },
  'from_clause/in': {
    kind: 'keyword',
    title: 'in (LINQ)',
    summary: 'In `from x in source`, separates the range variable from the sequence the query reads from.',
    link: kw('from-clause'),
  },
  'join_clause/in': {
    kind: 'keyword',
    title: 'in (LINQ join)',
    summary: 'In `join y in other`, separates the new range variable from the second sequence being joined.',
    link: kw('join-clause'),
  },
  while: {
    kind: 'keyword',
    summary: 'Repeats the body **while** the condition is `true`. The condition is checked before each iteration, so the body may run zero times.',
    example: 'while (queue.Count > 0)\n{\n    Process(queue.Dequeue());\n}',
    link: st('iteration-statements#the-while-statement'),
  },
  'do_statement/while': {
    kind: 'keyword',
    title: 'while (do ... while)',
    summary: 'The condition of a `do` loop, checked **after** each iteration. Note the semicolon after it.',
    link: st('iteration-statements#the-do-statement'),
  },
  do: {
    kind: 'keyword',
    summary: 'A `do { ... } while (condition);` loop: the body runs **at least once**, and the condition is checked after each iteration.',
    example: 'string? input;\ndo\n{\n    input = Console.ReadLine();\n} while (string.IsNullOrEmpty(input));',
    link: st('iteration-statements#the-do-statement'),
  },
  break: {
    kind: 'keyword',
    summary: 'Leaves the innermost `for`, `foreach`, `while`, `do` loop or `switch` statement immediately.',
    details: 'C# has no labelled `break`; to leave several loops at once, use `return` from a helper method or `goto`.',
    link: st('jump-statements#the-break-statement'),
  },
  continue: {
    kind: 'keyword',
    summary: 'Skips the rest of this iteration and continues with the **next iteration** of the innermost loop.',
    link: st('jump-statements#the-continue-statement'),
  },
  goto: {
    kind: 'keyword',
    summary: 'Jumps to a labelled statement (`label:`) in the same method, or to a `case`/`default` in a `switch`. Rarely needed; often a sign the code could be restructured.',
    example: 'goto done;\n// ...\ndone:\nConsole.WriteLine("finished");',
    link: st('jump-statements#the-goto-statement'),
  },
  return: {
    kind: 'keyword',
    summary: 'Ends the current method (or lambda, local function, accessor) and gives back a value, unless the method returns `void`.',
    link: st('jump-statements#the-return-statement'),
  },
  yield: {
    kind: 'keyword',
    summary: 'Makes this method an **iterator**: `yield return x` produces the next element and pauses the method until the caller asks for another; `yield break` ends the sequence.',
    details: 'Iterators are **lazy**: nothing in the body runs until someone starts looping over the result. The method must return `IEnumerable<T>` or `IEnumerator<T>` (or `IAsyncEnumerable<T>`).',
    example: 'IEnumerable<int> Countdown(int from)\n{\n    for (int i = from; i > 0; i--)\n        yield return i;\n}',
    link: st('yield'),
  },
  'yield_statement/return': {
    kind: 'keyword',
    title: 'yield return',
    summary: 'Produces the **next element** of this iterator and pauses here until the caller asks for the next one.',
    link: st('yield'),
  },
  'yield_statement/break': {
    kind: 'keyword',
    title: 'yield break',
    summary: '**Ends the sequence** this iterator produces: the caller\'s loop finishes.',
    link: st('yield'),
  },

  // -------------------------------------------------------- exceptions
  try: {
    kind: 'keyword',
    summary: 'Runs a block of code that might throw an **exception**. `catch` clauses handle exceptions; a `finally` block always runs, whether or not one was thrown.',
    example: 'try\n{\n    var text = File.ReadAllText(path);\n}\ncatch (FileNotFoundException ex)\n{\n    Console.WriteLine(ex.Message);\n}\nfinally\n{\n    Console.WriteLine("done");\n}',
    link: st('exception-handling-statements#the-try-statement'),
  },
  catch: {
    kind: 'keyword',
    summary: 'Handles exceptions of the given type (and types derived from it) thrown in the `try` block. The first matching `catch` wins, so put specific types before general ones.',
    details: '`catch (Exception ex)` catches nearly everything; prefer catching only what you can actually handle.',
    link: st('exception-handling-statements#the-try-catch-statement'),
  },
  finally: {
    kind: 'keyword',
    summary: 'Code that **always runs** after the `try` (and any `catch`), even after `return` or an unhandled exception. Used for cleanup.',
    link: st('exception-handling-statements#the-try-finally-statement'),
  },
  throw: {
    kind: 'keyword',
    summary: 'Throws an **exception**, which unwinds the call stack until a matching `catch` handles it. Inside a `catch`, a bare `throw;` re-throws the current exception and keeps its stack trace.',
    details: 'Prefer `throw;` over `throw ex;` when re-throwing: the latter resets the stack trace.',
    example: 'if (age < 0)\n    throw new ArgumentOutOfRangeException(nameof(age));',
    link: st('exception-handling-statements#the-throw-statement'),
  },
  'throw_expression/throw': {
    kind: 'keyword',
    title: 'throw (expression)',
    summary: 'A `throw` used as an **expression**, e.g. after `??` or in a `?:` branch, for a compact "value or fail".',
    example: 'Name = name ?? throw new ArgumentNullException(nameof(name));',
    link: st('exception-handling-statements#the-throw-expression'),
  },
  await: {
    kind: 'keyword',
    summary: 'Waits for a `Task` to finish **without blocking the thread**, then gives its result. The rest of the method continues later. Only allowed in `async` methods.',
    details: 'Avoid `.Result` and `.Wait()` on tasks: they block and can deadlock. `await` also re-throws the task\'s exception.',
    example: 'string html = await http.GetStringAsync(url);',
    link: op('await'),
  },
  lock: {
    kind: 'keyword',
    summary: 'Lets only **one thread at a time** run the block, using the given object as the lock. Other threads wait until it is released.',
    details: 'Lock on a private object (`private readonly object gate = new();`), never on `this` or a string.',
    example: 'lock (gate)\n{\n    balance += amount;\n}',
    link: st('lock'),
  },
  checked: {
    kind: 'keyword',
    summary: 'Integer arithmetic inside is **checked for overflow**: it throws `OverflowException` instead of silently wrapping around.',
    example: 'int big = int.MaxValue;\nchecked { big++; } // throws',
    link: st('checked-and-unchecked'),
  },
  unchecked: {
    kind: 'keyword',
    summary: 'Integer arithmetic inside **wraps around** on overflow, with no error (the default for non-constant expressions).',
    example: 'int wrapped = unchecked(int.MaxValue + 1); // int.MinValue',
    link: st('checked-and-unchecked'),
  },
  fixed: {
    kind: 'keyword',
    summary: 'Pins an object in memory in `unsafe` code, so the garbage collector does not move it while you use a pointer to it.',
    example: 'fixed (int* p = array)\n{\n    *p = 1;\n}',
    link: st('fixed'),
  },

  // -------------------------------------------- types, tests and casts
  var: {
    kind: 'keyword',
    summary: 'Declares a local variable whose type is **inferred** from the initializer. It is still statically typed: `var x = 5;` makes `x` an `int` forever.',
    details: 'You must initialize it, and you cannot assign `null` without a type (`var x = null;` is an error).',
    example: 'var names = new List<string>(); // List<string>\nforeach (var n in names) { }',
    link: st('declarations#implicitly-typed-local-variables'),
  },
  dynamic: {
    kind: 'keyword',
    summary: 'A **dynamic** value: the compiler skips type checking, and member lookups happen at run time. Errors show up as exceptions while running instead of compile errors.',
    details: 'Mostly for interop (COM, dynamic languages, JSON). Prefer real types when you can.',
    example: 'dynamic d = GetSomething();\nd.Anything(); // checked only at run time',
    link: `${BT}/reference-types#the-dynamic-type`,
  },
  is: {
    kind: 'keyword',
    summary: 'Tests a value against a **type or pattern**, giving a `bool`. With a name, it also declares a variable holding the converted value: `if (o is string s)`.',
    details: '`x is null` / `x is not null` are the safest null checks (they can\'t be changed by operator overloads).',
    example: 'if (shape is Circle { Radius: > 0 } c)\n    Console.WriteLine(c.Radius);',
    link: op('is'),
  },
  as: {
    kind: 'keyword',
    summary: 'Converts to a reference or nullable type, giving **`null` instead of throwing** if the value is not of that type.',
    details: 'Usually `if (x is T t)` is nicer, because it also checks the result.',
    example: 'var shape = obj as Shape;\nif (shape != null) { ... }',
    link: op('type-testing-and-cast#the-as-operator'),
  },
  typeof: {
    kind: 'keyword',
    summary: 'Gets the `System.Type` object for a type name, known at compile time. For the run-time type of a value use `value.GetType()`.',
    example: 'Type t = typeof(List<int>);',
    link: op('type-testing-and-cast#the-typeof-operator'),
  },
  nameof: {
    kind: 'keyword',
    summary: 'Gives the **name** of a variable, type or member as a string constant, e.g. `nameof(age)` is `"age"`. Renaming the variable updates it too.',
    example: 'throw new ArgumentNullException(nameof(customer));',
    link: op('nameof'),
  },
  sizeof: {
    kind: 'keyword',
    summary: 'The size in **bytes** of a value type, e.g. `sizeof(int)` is `4`.',
    link: op('sizeof'),
  },

  // ---------------------------------------------------------- patterns
  and: {
    kind: 'keyword',
    title: 'and (pattern)',
    summary: 'Pattern combinator: matches when **both** patterns match.',
    example: 'if (c is >= \'a\' and <= \'z\') { }',
    link: op('patterns#logical-patterns'),
  },
  or: {
    kind: 'keyword',
    title: 'or (pattern)',
    summary: 'Pattern combinator: matches when **either** pattern matches.',
    example: 'bool weekend = day is DayOfWeek.Saturday or DayOfWeek.Sunday;',
    link: op('patterns#logical-patterns'),
  },
  not: {
    kind: 'keyword',
    title: 'not (pattern)',
    summary: 'Pattern negation: matches when the pattern does **not** match. `is not null` is the idiomatic non-null check.',
    example: 'if (input is not null) { }',
    link: op('patterns#logical-patterns'),
  },
  '#discard': {
    kind: 'syntax',
    title: '_ (discard)',
    summary: 'A **discard**: a placeholder for a value you don\'t need. In a pattern or switch arm, `_` matches anything.',
    example: '_ = DoSomething();          // ignore the result\nvar label = n switch { 0 => "zero", _ => "other" };',
    link: `${GUIDE}/fundamentals/patterns/discards`,
  },

  // ------------------------------------------------------------- LINQ
  from: {
    kind: 'keyword',
    summary: 'Starts a **LINQ query expression**: `from x in source` introduces a range variable `x` that stands for each element in turn.',
    details: 'Query syntax is translated to method calls (`Where`, `Select`, `OrderBy`, ...). Queries are **lazy**: they run when you iterate them or call `ToList()`.',
    example: 'var adults = from p in people\n             where p.Age >= 18\n             orderby p.Name\n             select p.Name;',
    link: kw('from-clause'),
  },
  'where_clause/where': {
    kind: 'keyword',
    title: 'where (LINQ)',
    summary: 'Filters a LINQ query: keeps only elements for which the condition is true. Same as `.Where(x => ...)`.',
    link: kw('where-clause'),
  },
  select: {
    kind: 'keyword',
    summary: 'Ends a LINQ query: says what each result element is. Same as `.Select(x => ...)`.',
    link: kw('select-clause'),
  },
  orderby: {
    kind: 'keyword',
    summary: 'Sorts a LINQ query by one or more keys (`orderby a, b descending`). Same as `.OrderBy(...)` / `.ThenBy(...)`.',
    link: kw('orderby-clause'),
  },
  ascending: { kind: 'keyword', summary: 'Sort from smallest to largest (the default) in an `orderby` clause.', link: kw('ascending') },
  descending: { kind: 'keyword', summary: 'Sort from largest to smallest in an `orderby` clause.', link: kw('descending') },
  group: {
    kind: 'keyword',
    summary: 'Groups LINQ elements by a key: `group x by key`. Each result is an `IGrouping` with a `.Key` that you can loop over.',
    example: 'var byCity = from p in people\n             group p by p.City;',
    link: kw('group-clause'),
  },
  by: { kind: 'keyword', summary: 'Gives the key in a `group ... by key` clause.', link: kw('group-clause') },
  join: {
    kind: 'keyword',
    summary: 'Combines two sequences in a LINQ query by matching keys: `join o in orders on c.Id equals o.CustomerId`.',
    link: kw('join-clause'),
  },
  on: { kind: 'keyword', summary: 'Introduces the key comparison of a LINQ `join`.', link: kw('on') },
  equals: { kind: 'keyword', summary: 'Compares the two keys of a LINQ `join` (`==` is not allowed there).', link: kw('equals') },
  let: {
    kind: 'keyword',
    summary: 'Stores an intermediate result in a new range variable inside a LINQ query, so you don\'t have to compute it twice.',
    example: 'from w in words\nlet lower = w.ToLower()\nwhere lower.StartsWith("a")\nselect lower',
    link: kw('let-clause'),
  },
  into: {
    kind: 'keyword',
    summary: 'Gives the result of a `group`, `join` or `select` a name so the query can **continue** from it.',
    link: kw('into'),
  },

  // ------------------------------------------------------ values/literals
  '#null_literal': {
    kind: 'value',
    title: 'null',
    summary: 'The **null reference**: "no object". Reference types and nullable value types (`int?`) can be `null`; using a member of `null` throws `NullReferenceException`.',
    details: 'With nullable reference types enabled, `string` means "never null" and `string?` means "may be null"; the compiler warns about mistakes.',
    link: kw('null'),
  },
  true: { kind: 'value', summary: 'The `bool` value true.', link: `${BT}/bool` },
  false: { kind: 'value', summary: 'The `bool` value false.', link: `${BT}/bool` },
  '#verbatim_string_literal': {
    kind: 'literal',
    title: '@"..." (verbatim string)',
    summary: 'A **verbatim string**: backslashes are not escapes and the string may span lines. Write `""` for a double quote. Handy for Windows paths and regexes.',
    example: 'string path = @"C:\\temp\\file.txt";',
    link: `${TOK}/verbatim`,
  },
  '#raw_string_literal': {
    kind: 'literal',
    title: '""" (raw string)',
    summary: 'A **raw string literal**: no escapes at all, and quotes can appear freely inside. Multi-line raw strings strip the indentation of the closing `"""`. C# 11+.',
    example: 'string json = """\n    { "name": "Ann" }\n    """;',
    link: `${TOK}/raw-string`,
  },
  '#interpolated_string_expression': {
    kind: 'literal',
    title: '$"..." (interpolated string)',
    summary: 'An **interpolated string**: expressions in `{braces}` are evaluated and inserted. Add a format after a colon: `{price:C}`, `{ratio:F2}`.',
    details: 'Combine with `@` (`$@"..."`) for a verbatim interpolated string, or with `"""` for a raw one. Write `{{` for a literal brace.',
    example: 'var msg = $"Hello {name}, you are {age} years old";',
    link: `${TOK}/interpolated`,
  },
  '#interpolation_brace': {
    kind: 'syntax',
    title: '{ } (interpolation hole)',
    summary: 'Inside `$"..."`, braces hold a C# expression whose value is inserted into the string.',
    example: '$"{a} + {b} = {a + b}"',
    link: `${TOK}/interpolated`,
  },
  'interpolation_format_clause/:': {
    kind: 'syntax',
    title: ': (format string)',
    summary: 'In an interpolation hole, text after the colon is a **format string**, e.g. `F2` (2 decimals), `C` (currency), `yyyy-MM-dd` (dates).',
    example: '$"{price:C} on {date:yyyy-MM-dd}"',
    link: `${TOK}/interpolated#structure-of-an-interpolated-string`,
  },
  '#character_literal': {
    kind: 'literal',
    title: "'x' (char literal)",
    summary: 'A single UTF-16 `char` in single quotes. Strings use double quotes.',
    example: "char c = 'a';\nchar newline = '\\n';",
    link: `${BT}/char`,
  },

  // --------------------------------------------------------- operators
  'nullable_type/?': {
    kind: 'operator',
    title: 'T? (nullable type)',
    summary: 'On a value type, `int?` is `Nullable<int>`: an `int` that can also be `null`. On a reference type, `string?` tells the compiler the value **may be null**, so it can warn when you forget to check.',
    example: 'int? age = null;\nif (age.HasValue) Console.WriteLine(age.Value);\nstring? name = Console.ReadLine();',
    link: `${BT}/nullable-value-types`,
  },
  'conditional_expression/?': {
    kind: 'operator',
    title: '?: (conditional operator)',
    summary: 'The **ternary operator**: `condition ? a : b` is `a` if the condition is true, otherwise `b`.',
    example: 'string label = count == 1 ? "item" : "items";',
    link: op('conditional-operator'),
  },
  'conditional_expression/:': {
    kind: 'operator',
    title: '?: (conditional operator)',
    summary: 'Separates the two results of `condition ? whenTrue : whenFalse`.',
    link: op('conditional-operator'),
  },
  'conditional_access_expression/?': {
    kind: 'operator',
    title: '?. and ?[] (null-conditional)',
    summary: '**Null-conditional access**: if the left side is `null`, the whole expression becomes `null` instead of throwing `NullReferenceException`.',
    details: 'The result is nullable: `name?.Length` is an `int?`. Combine with `??` for a fallback: `name?.Length ?? 0`.',
    example: 'int? len = customer?.Address?.Street?.Length;\nchar? first = args?[0][0];\nhandler?.Invoke(this, e);',
    link: op('member-access-operators#null-conditional-operators--and-'),
  },
  '??': {
    kind: 'operator',
    title: '?? (null-coalescing)',
    summary: '`a ?? b` is `a` if it is not `null`, otherwise `b`. A short way to give a default value.',
    example: 'string display = name ?? "anonymous";',
    link: op('null-coalescing-operator'),
  },
  '??=': {
    kind: 'operator',
    title: '??= (null-coalescing assignment)',
    summary: '`a ??= b` assigns `b` to `a` **only if `a` is null**.',
    example: 'cache ??= new Dictionary<string, int>();',
    link: op('null-coalescing-operator'),
  },
  'postfix_unary_expression/!': {
    kind: 'operator',
    title: 'x! (null-forgiving)',
    summary: 'The **null-forgiving** operator: tells the compiler "trust me, this is not null" to silence a nullable warning. It does nothing at run time; if you are wrong you still get a `NullReferenceException`.',
    example: 'string name = FindName()!;',
    link: op('null-forgiving'),
  },
  '!': {
    kind: 'operator',
    title: '! (logical not)',
    summary: 'Logical negation: `!true` is `false`.',
    link: op('boolean-logical-operators#logical-negation-operator-'),
  },
  'lambda_expression/=>': {
    kind: 'operator',
    title: '=> (lambda)',
    summary: 'Separates a **lambda**\'s parameters from its body: `x => x * 2` is an anonymous function. Lambdas can capture local variables.',
    details: 'A lambda gets its type from where it is used: `Func<int, int>`, `Action`, a custom delegate, or an `Expression<...>` tree (in LINQ to databases).',
    example: 'Func<int, int> square = x => x * x;\nvar evens = nums.Where(n => n % 2 == 0);\nAction hello = () => Console.WriteLine("hi");',
    link: op('lambda-expressions'),
  },
  'arrow_expression_clause/=>': {
    kind: 'operator',
    title: '=> (expression-bodied member)',
    summary: 'An **expression-bodied member**: a method, property or accessor whose body is a single expression. `=> expr` is short for `{ return expr; }`.',
    details: 'For a property, `int Count => items.Count;` is a getter-only property computed on every read. Compare `int Count { get; } = items.Count;`, which is computed once.',
    example: 'public double Area() => Width * Height;\npublic string Name => $"{First} {Last}";',
    link: `${REF}/operators/lambda-operator`,
  },
  'switch_expression_arm/=>': {
    kind: 'operator',
    title: '=> (switch arm)',
    summary: 'In a switch expression, separates a **pattern** (left) from the **result** for that case (right).',
    link: op('switch-expression'),
  },
  'range_expression/..': {
    kind: 'operator',
    title: '.. (range)',
    summary: 'A **range** `start..end`: the end is *exclusive*. Either side may be left out: `..3` (first three), `2..` (from index 2), `^2..` (last two).',
    example: 'int[] middle = nums[1..3]; // elements 1 and 2\nstring tail = text[^3..];',
    link: op('member-access-operators#range-operator-'),
  },
  'spread_element/..': {
    kind: 'operator',
    title: '.. (spread)',
    summary: 'In a collection expression `[...]`, `..xs` inserts **all elements** of `xs`.',
    example: 'int[] all = [0, ..first, ..second];',
    link: op('collection-expressions#spread-element'),
  },
  'prefix_unary_expression/^': {
    kind: 'operator',
    title: '^ (index from end)',
    summary: '`^n` counts **from the end**: `xs[^1]` is the last element, `xs[^2]` the one before it. (`^0` is one past the end.)',
    example: 'var last = names[^1];',
    link: op('member-access-operators#index-from-end-operator-'),
  },
  '^': {
    kind: 'operator',
    title: '^ (exclusive or)',
    summary: 'Bitwise / logical **XOR**: true where exactly one side is true. (Not a power operator; use `Math.Pow`.)',
    link: op('bitwise-and-shift-operators#logical-exclusive-or-operator-'),
  },
  'alias_qualified_name/::': {
    kind: 'operator',
    title: ':: (namespace alias qualifier)',
    summary: '`alias::Name` looks up `Name` in the namespace alias on the left. Mostly seen as `global::`, meaning the root namespace.',
    link: op('namespace-alias-qualifier'),
  },
  'type_parameter_list/<': {
    kind: 'syntax',
    title: '<T> (type parameters)',
    summary: 'Declares **generic type parameters**: placeholders for types the caller fills in, like `List<T>`. Each use with a concrete type is fully type-checked.',
    example: 'T First<T>(List<T> items) => items[0];',
    link: `${GUIDE}/fundamentals/types/generics`,
  },
  'type_parameter_list/>': {
    kind: 'syntax',
    title: '<T> (type parameters)',
    summary: 'Closes the list of **generic type parameters**.',
    link: `${GUIDE}/fundamentals/types/generics`,
  },
  'type_argument_list/<': {
    kind: 'syntax',
    title: '<...> (type arguments)',
    summary: 'Supplies **type arguments** to a generic type or method, e.g. `List<string>` is a list of strings. Often they can be inferred and left out for method calls.',
    link: `${GUIDE}/fundamentals/types/generics`,
  },
  'type_argument_list/>': {
    kind: 'syntax',
    title: '<...> (type arguments)',
    summary: 'Closes the list of **type arguments** of a generic type or method.',
    link: `${GUIDE}/fundamentals/types/generics`,
  },
  'base_list/:': {
    kind: 'syntax',
    title: ': (base types)',
    summary: 'Lists the **base class** (at most one, first) and the **interfaces** this type implements. For an enum it gives the underlying integer type.',
    example: 'class Circle : Shape, IComparable<Circle> { }',
    link: `${GUIDE}/fundamentals/object-oriented/inheritance`,
  },
  'constructor_initializer/:': {
    kind: 'syntax',
    title: ': base(...) / : this(...)',
    summary: 'Calls another constructor (of the base class, or of this type) before this constructor\'s body.',
    link: kw('base'),
  },
  'attribute_list/[': {
    kind: 'syntax',
    title: '[...] (attribute)',
    summary: 'An **attribute**: metadata attached to the declaration below it, read by the compiler, frameworks or tools (e.g. `[Obsolete]`, `[Test]`, `[JsonPropertyName("id")]`).',
    link: `${GUIDE}/advanced-topics/reflection-and-attributes/`,
  },
  'pointer_type/*': {
    kind: 'operator',
    title: 'T* (pointer type)',
    summary: 'A raw **pointer** to a `T`, only allowed in `unsafe` code.',
    link: `${GUIDE}/language-reference/unsafe-code`,
  },
  'prefix_unary_expression/*': {
    kind: 'operator',
    title: '*p (dereference)',
    summary: 'Reads or writes the value a pointer points to (`unsafe` code only).',
    link: `${OP}/pointer-related-operators`,
  },
  'prefix_unary_expression/&': {
    kind: 'operator',
    title: '&x (address-of)',
    summary: 'Takes the address of a variable, giving a pointer (`unsafe` code only).',
    link: `${OP}/pointer-related-operators`,
  },
  '->': {
    kind: 'operator',
    title: '-> (pointer member access)',
    summary: '`p->X` is `(*p).X`: member access through a pointer (`unsafe` code only).',
    link: `${OP}/pointer-related-operators`,
  },
  'destructor_declaration/~': {
    kind: 'syntax',
    title: '~Name() (finalizer)',
    summary: 'Declares a **finalizer**: code the garbage collector runs at some unknown time before freeing the object. Rarely needed; use `IDisposable` for cleanup.',
    link: `${GUIDE}/programming-guide/classes-and-structs/finalizers`,
  },
  '~': {
    kind: 'operator',
    title: '~ (bitwise complement)',
    summary: 'Flips every bit of an integer: `~0` is `-1`.',
    link: op('bitwise-and-shift-operators#bitwise-complement-operator-'),
  },
  '>>>': {
    kind: 'operator',
    title: '>>> (unsigned right shift)',
    summary: 'Shifts right, always filling with zero bits, even for negative numbers (`>>` keeps the sign). C# 11+.',
    link: op('bitwise-and-shift-operators#unsigned-right-shift-operator-'),
  },
  '==': {
    kind: 'operator',
    title: '== (equality)',
    summary: 'Equality. For value types and `string` it compares values; for other classes it compares **references** (same object?) unless the type overloads `==`, as records do.',
    link: op('equality-operators'),
  },
  '+=': {
    kind: 'operator',
    title: '+= (add and assign)',
    summary: '`a += b` is `a = a + b`. On an **event**, `+=` subscribes a handler.',
    example: 'total += price;\nbutton.Click += OnClick;',
    link: op('addition-operator#addition-assignment-operator-'),
  },
  '-=': {
    kind: 'operator',
    title: '-= (subtract and assign)',
    summary: '`a -= b` is `a = a - b`. On an **event**, `-=` unsubscribes a handler.',
    link: op('subtraction-operator#subtraction-assignment-operator--'),
  },
  '#interpolation_start': {
    kind: 'literal',
    title: '$ (interpolated string)',
    summary: 'The `$` prefix makes this an **interpolated string**: `{expression}` holes inside are filled in with values.',
    example: 'var msg = $"Hello {name}!";',
    link: `${TOK}/interpolated`,
  },

  // ---------------------------------------------------------- preprocessor
  '#region': { kind: 'syntax', summary: 'Starts a collapsible region in the editor; ignored by the compiler. Ends at `#endregion`.', link: `${REF}/preprocessor-directives#defining-regions` },
  '#endregion': { kind: 'syntax', summary: 'Ends a `#region`.', link: `${REF}/preprocessor-directives#defining-regions` },
  '#nullable': { kind: 'syntax', summary: 'Turns nullable reference type checking on or off (`enable`, `disable`, `restore`) from here on in this file.', link: `${REF}/preprocessor-directives#nullable-context` },
  '#if': { kind: 'syntax', summary: 'Conditional compilation: the code up to `#else`/`#endif` is only compiled if the symbol (e.g. `DEBUG`) is defined.', link: `${REF}/preprocessor-directives#conditional-compilation` },

  // ------------------------------------------------------ predefined types
  int: num('32-bit signed integer (about ±2.1 billion), alias for `System.Int32`. The default type for integer literals.'),
  uint: num('32-bit unsigned integer (0 to about 4.3 billion). Literal suffix `u`.'),
  long: num('64-bit signed integer, alias for `System.Int64`. Literal suffix `L`.'),
  ulong: num('64-bit unsigned integer. Literal suffix `ul`.'),
  short: num('16-bit signed integer (-32768 to 32767).'),
  ushort: num('16-bit unsigned integer (0 to 65535).'),
  byte: num('8-bit **unsigned** integer (0 to 255). `byte[]` is how binary data is usually handled.'),
  sbyte: num('8-bit signed integer (-128 to 127).'),
  nint: num('Native-sized signed integer: 32 or 64 bits depending on the platform.'),
  nuint: num('Native-sized unsigned integer.'),
  double: num('64-bit floating-point number (about 15–17 significant digits). The default for literals like `1.5`. Not exact: `0.1 + 0.2 != 0.3`.', FLOATING),
  float: num('32-bit floating-point number. Literal suffix `f`: `1.5f`.', FLOATING),
  decimal: num('128-bit **decimal** number: exact for decimal fractions, so use it for money. Slower than `double`. Literal suffix `m`: `9.99m`.', FLOATING),
  bool: { kind: 'type', summary: '`true` or `false`, alias for `System.Boolean`. Numbers do not convert to `bool`.', link: `${BT}/bool` },
  char: { kind: 'type', summary: 'One UTF-16 code unit, alias for `System.Char`. Some characters (like many emoji) need **two** `char`s.', link: `${BT}/char` },
  string: {
    kind: 'type',
    summary: 'Immutable sequence of UTF-16 characters, alias for `System.String`. Every "change" creates a new string; use `StringBuilder` when building large strings in a loop.',
    details: 'Unlike most classes, `==` compares string **contents**. `string.IsNullOrEmpty(s)` checks both cases.',
    example: 'string name = "Ann";\nstring upper = name.ToUpper();\nint len = name.Length;',
    link: `${BT}/reference-types#the-string-type`,
  },
  object: {
    kind: 'type',
    summary: 'The base type of **all** types, alias for `System.Object`. Storing a value type in an `object` *boxes* it (copies it to the heap).',
    link: `${BT}/reference-types#the-object-type`,
  },
  void: { kind: 'type', summary: 'Used as a return type: the method returns **no value**.', link: `${BT}/void` },

  // ----------------------------------------------- standard library types
  Console: {
    kind: 'type',
    summary: '`System.Console`: reads from and writes to the terminal. `Console.WriteLine(x)` prints a line, `Console.ReadLine()` reads one (or `null` at end of input).',
    example: 'Console.Write("Name? ");\nstring? name = Console.ReadLine();\nConsole.WriteLine($"Hi {name}");',
    link: api('System.Console'),
  },
  Task: {
    kind: 'type',
    summary: '`Task` / `Task<T>`: an operation that finishes later, possibly with a result of type `T`. `await` it inside an `async` method to get the result.',
    example: 'async Task<int> GetCountAsync() { await Task.Delay(100); return 42; }',
    link: api('System.Threading.Tasks.Task'),
  },
  ValueTask: { kind: 'type', summary: '`ValueTask<T>`: like `Task<T>`, but avoids an allocation when the result is often available immediately. Await it only once.', link: api('System.Threading.Tasks.ValueTask-1') },
  List: {
    kind: 'type',
    summary: '`List<T>`: a growable list (like an array that resizes). Add with `.Add(x)`, read with `list[i]`, size is `.Count` (not `.Length`).',
    example: 'var names = new List<string> { "Ann", "Bob" };\nnames.Add("Cy");\nConsole.WriteLine(names.Count); // 3',
    link: api('System.Collections.Generic.List-1'),
  },
  Dictionary: {
    kind: 'type',
    summary: '`Dictionary<TKey, TValue>`: a hash map from keys to values. `dict[key]` throws if the key is missing; use `TryGetValue` to check safely.',
    example: 'var ages = new Dictionary<string, int> { ["Ann"] = 31 };\nif (ages.TryGetValue("Bob", out var age)) { }',
    link: api('System.Collections.Generic.Dictionary-2'),
  },
  HashSet: { kind: 'type', summary: '`HashSet<T>`: an unordered collection without duplicates, with fast `Contains`.', link: api('System.Collections.Generic.HashSet-1') },
  IEnumerable: {
    kind: 'type',
    summary: '`IEnumerable<T>`: anything you can loop over with `foreach`. The common type for sequences; all LINQ methods work on it.',
    details: 'An `IEnumerable` may be **lazy** (computed while you iterate). Iterating it twice may do the work twice; call `.ToList()` to materialize it.',
    link: api('System.Collections.Generic.IEnumerable-1'),
  },
  IList: { kind: 'type', summary: '`IList<T>`: a collection with indexing (`list[i]`), `Add` and `Remove`. Implemented by `List<T>` and arrays.', link: api('System.Collections.Generic.IList-1') },
  IReadOnlyList: { kind: 'type', summary: '`IReadOnlyList<T>`: a list you can index and count but not modify through this reference.', link: api('System.Collections.Generic.IReadOnlyList-1') },
  IComparable: { kind: 'type', summary: '`IComparable<T>`: types with a natural order. `a.CompareTo(b)` is negative, zero or positive. Used by sorting.', link: api('System.IComparable-1') },
  IDisposable: { kind: 'type', summary: '`IDisposable`: types holding resources that must be released with `Dispose()`. Use them in a `using` statement or declaration.', link: api('System.IDisposable') },
  Exception: {
    kind: 'type',
    summary: '`System.Exception`: the base class of all exceptions. Has a `Message`, a `StackTrace` and an optional `InnerException`.',
    details: 'Derive your own exception classes from `Exception` and name them `...Exception`.',
    link: api('System.Exception'),
  },
  InvalidOperationException: { kind: 'type', summary: 'Thrown when a method call is not valid for the object\'s current state (e.g. reading an empty queue).', link: api('System.InvalidOperationException') },
  ArgumentException: { kind: 'type', summary: 'Thrown when an argument is invalid. Subclasses: `ArgumentNullException`, `ArgumentOutOfRangeException`.', link: api('System.ArgumentException') },
  ArgumentNullException: { kind: 'type', summary: 'Thrown when an argument is `null` but must not be. `ArgumentNullException.ThrowIfNull(x)` does the check for you.', link: api('System.ArgumentNullException') },
  ArgumentOutOfRangeException: { kind: 'type', summary: 'Thrown when an argument is outside the allowed range.', link: api('System.ArgumentOutOfRangeException') },
  NullReferenceException: { kind: 'type', summary: 'Thrown when you use a member of a `null` reference. Usually a bug; nullable reference types help prevent it.', link: api('System.NullReferenceException') },
  NotImplementedException: { kind: 'type', summary: 'Placeholder for code that is not written yet.', link: api('System.NotImplementedException') },
  Math: {
    kind: 'type',
    summary: '`System.Math`: static math functions and constants: `Math.Max`, `Math.Abs`, `Math.Sqrt`, `Math.Round`, `Math.PI`...',
    details: '`Math.Round` uses *banker\'s rounding* by default: `Math.Round(2.5)` is `2`.',
    link: api('System.Math'),
  },
  DateTime: {
    kind: 'type',
    summary: '`System.DateTime`: a date and time of day. `DateTime.Now` is local time, `DateTime.UtcNow` is UTC. It is an immutable struct.',
    details: 'For a moment in time with a time-zone offset, `DateTimeOffset` is often the better choice.',
    link: api('System.DateTime'),
  },
  TimeSpan: { kind: 'type', summary: '`System.TimeSpan`: a duration, like `TimeSpan.FromSeconds(5)`. Subtracting two `DateTime`s gives one.', link: api('System.TimeSpan') },
  Nullable: { kind: 'type', summary: '`Nullable<T>`, usually written `T?`: a value type that can also be `null`. Check `.HasValue`, read `.Value` or use `??`.', link: api('System.Nullable-1') },
  String: { kind: 'type', summary: '`System.String`, the same type as `string`. Static helpers: `String.Join`, `String.IsNullOrEmpty`, `String.Format`...', link: api('System.String') },
  StringBuilder: { kind: 'type', summary: '`StringBuilder`: a mutable string buffer for building text efficiently piece by piece; call `.ToString()` at the end.', link: api('System.Text.StringBuilder') },
  Func: { kind: 'type', summary: '`Func<T1, ..., TResult>`: the built-in delegate type for a function that returns a value. The **last** type argument is the return type.', example: 'Func<int, int, int> add = (a, b) => a + b;', link: api('System.Func-1') },
  Action: { kind: 'type', summary: '`Action<T1, ...>`: the built-in delegate type for a function that returns nothing (`void`).', example: 'Action<string> log = msg => Console.WriteLine(msg);', link: api('System.Action') },
  EventHandler: { kind: 'type', summary: '`EventHandler`: the standard delegate type for events: `void (object? sender, EventArgs e)`.', link: api('System.EventHandler') },
  Span: { kind: 'type', summary: '`Span<T>`: a view of contiguous memory (part of an array, stack memory...) without copying. Stack-only: cannot be stored in fields of classes.', link: api('System.Span-1') },
  Enumerable: { kind: 'type', summary: '`System.Linq.Enumerable`: home of the LINQ extension methods (`Where`, `Select`, `OrderBy`, `ToList`...) and helpers like `Enumerable.Range`.', link: api('System.Linq.Enumerable') },
  Guid: { kind: 'type', summary: '`System.Guid`: a 128-bit globally unique identifier. `Guid.NewGuid()` creates a random one.', link: api('System.Guid') },
  Random: { kind: 'type', summary: '`System.Random`: pseudo-random numbers. `Random.Shared.Next(1, 7)` gives 1–6 (the upper bound is exclusive).', link: api('System.Random') },
  Environment: { kind: 'type', summary: '`System.Environment`: information about the process and machine (`Environment.NewLine`, `Environment.GetEnvironmentVariable`...).', link: api('System.Environment') },
  Array: { kind: 'type', summary: '`System.Array`: the base class of all arrays, with static helpers like `Array.Sort` and `Array.Empty<T>()`.', link: api('System.Array') },
  StringReader: { kind: 'type', summary: '`System.IO.StringReader`: reads text from a string as if it were a file or stream (`ReadLine`, `ReadToEnd`). Dispose it when done.', link: api('System.IO.StringReader') },
  DayOfWeek: { kind: 'type', summary: '`System.DayOfWeek`: an enum from `Sunday` (0) to `Saturday` (6).', link: api('System.DayOfWeek') },
};

// ------------------------------------------------------------------ helpers

/** Things a `return` returns from (and the boundary for loops, labels, try). */
const FUNCTION_SCOPES = new Set([
  'method_declaration',
  'local_function_statement',
  'lambda_expression',
  'anonymous_method_expression',
  'accessor_declaration',
  'constructor_declaration',
  'destructor_declaration',
  'operator_declaration',
  'conversion_operator_declaration',
]);
const LOOPS = new Set(['for_statement', 'foreach_statement', 'while_statement', 'do_statement']);
const BREAKABLE = new Set([...LOOPS, 'switch_statement']);
const TYPE_DECLS: Record<string, string> = {
  class_declaration: 'Class',
  struct_declaration: 'Struct',
  interface_declaration: 'Interface',
  enum_declaration: 'Enum',
  record_declaration: 'Record',
};

const isFunction = (n: Node) => FUNCTION_SCOPES.has(n.type);

/** Modifier keywords of a declaration, e.g. ["public", "static"]. */
function modifiers(decl: Node): string[] {
  return decl.children.filter((c) => c?.type === 'modifier').map((c) => c!.text);
}

function withModifiers(decl: Node): string {
  const mods = modifiers(decl);
  return mods.length ? ` Modifiers: ${mods.map((m) => `\`${m}\``).join(' ')}.` : '';
}

/** The labelled statement called `name` in the method around `from`. */
function labelled(name: string, from: Node): Node | undefined {
  const fn = ancestor(from, isFunction);
  if (!fn) return undefined;
  for (const l of fn.descendantsOfType('labeled_statement')) {
    if (l?.namedChild(0)?.text === name) return l;
  }
  return undefined;
}

/** For `goto case X` / `goto default`: the switch section it jumps to. */
function switchSection(gotoStmt: Node): Node | undefined {
  const sw = ancestor(gotoStmt, (n) => n.type === 'switch_statement', isFunction);
  const body = sw?.childForFieldName('body');
  if (!body) return undefined;
  const isDefault = gotoStmt.children.some((c) => c?.type === 'default');
  const value = gotoStmt.namedChildren.at(-1)?.text;
  for (const section of body.namedChildren) {
    if (!section) continue;
    const kids = section.children;
    for (let i = 0; i < kids.length; i++) {
      if (isDefault ? kids[i]?.type === 'default' : kids[i]?.type === 'case' && kids[i + 1]?.text === value) return section;
    }
  }
  return undefined;
}

/** The `try` whose catch clauses would see an exception thrown at `token`. */
function catchingTry(token: Node): Node | undefined {
  let prev: Node = token;
  for (let n = token.parent; n; prev = n, n = n.parent) {
    if (isFunction(n)) return undefined;
    if (n.type === 'try_statement' && n.childForFieldName('body')?.equals(prev) && n.children.some((c) => c?.type === 'catch_clause')) return n;
  }
  return undefined;
}

/** The statement or declaration a `variable_declarator` name lives in. */
function variableRole(node: Node, declarator: Node): Role | undefined {
  const declaration = declarator.parent;
  const owner = declaration?.parent;
  if (!declaration || !owner) return undefined;
  const name = `\`${node.text}\``;
  const inferred = declaration.childForFieldName('type')?.type === 'implicit_type' ? ' Its type is inferred from the initializer (`var`).' : '';
  const isConst = modifiers(owner).includes('const');
  switch (owner.type) {
    case 'field_declaration':
      return isConst
        ? { title: 'Constant', summary: `Declares the constant ${name}.${withModifiers(owner)}`, scope: owner }
        : { title: 'Field', summary: `Declares the field ${name}: data stored in each instance (or once, if \`static\`).${withModifiers(owner)}`, scope: owner };
    case 'event_field_declaration':
      return { title: 'Event', summary: `Declares the event ${name}. Others subscribe with \`+=\`.${withModifiers(owner)}`, scope: owner };
    case 'local_declaration_statement': {
      if (isConst) return { title: 'Local constant', summary: `Declares the local constant ${name}.`, scope: owner };
      const using = owner.children.some((c) => c?.type === 'using');
      return {
        title: 'Local variable',
        summary: `Declares the local variable ${name}.${inferred}${using ? ' It is disposed at the end of the enclosing block (`using`).' : ''}`,
        scope: owner,
      };
    }
    case 'using_statement':
      return { title: 'Local variable', summary: `Declares ${name}, which is disposed when the \`using\` block ends.${inferred}`, scope: owner };
    case 'for_statement':
      return { title: 'Loop variable', summary: `Declares ${name}, which exists only inside this \`for\` loop.${inferred}`, scope: owner };
    case 'fixed_statement':
      return { title: 'Pinned pointer', summary: `Declares the pointer ${name}, valid inside this \`fixed\` block.`, scope: owner };
  }
  return { title: 'Variable', summary: `Declares the variable ${name}.${inferred}`, scope: declarator };
}

function parameterRole(node: Node, parameter: Node): Role {
  const name = `\`${node.text}\``;
  const owner = parameter.parent?.parent;
  const mods = parameter.children.filter((c) => c?.type === 'modifier').map((c) => c!.text);
  const notes: Record<string, string> = {
    ref: ' It is passed by `ref`: assigning to it changes the caller\'s variable.',
    out: ' It is an `out` parameter: the method must assign it, and the caller receives the value.',
    in: ' It is an `in` parameter: passed by reference, but read-only.',
    this: ' The `this` modifier makes this an extension method on its type.',
  };
  const extra = mods.map((m) => notes[m] ?? '').join('');
  if (owner?.type === 'record_declaration') {
    return { title: 'Record parameter', summary: `${name} becomes a public init-only property **and** a constructor parameter of the record.`, scope: parameter };
  }
  if (owner?.type === 'lambda_expression') {
    return { title: 'Lambda parameter', summary: `${name} is a parameter of this lambda.`, scope: owner };
  }
  return { title: 'Parameter', summary: `${name} is a parameter: a local variable set by the caller.${extra}`, scope: parameter };
}

function role(node: Node, field: string | null): Role | undefined {
  const parent = node.parent;
  if (!parent) return undefined;
  const name = `\`${node.text}\``;
  if (node.type === 'implicit_parameter') {
    return { title: 'Lambda parameter', summary: `${name} is the parameter of this lambda; its type is inferred.`, scope: parent };
  }
  const key = `${parent.type}.${field ?? ''}`;
  if (field === 'name' && TYPE_DECLS[parent.type]) {
    let kind = TYPE_DECLS[parent.type];
    if (parent.type === 'record_declaration' && parent.children.some((c) => c?.type === 'struct')) kind = 'Record struct';
    return { title: `${kind} name`, summary: `Declares the ${kind.toLowerCase()} ${name}.${withModifiers(parent)}`, scope: parent };
  }
  switch (key) {
    case 'method_declaration.name': {
      const mods = modifiers(parent);
      const firstParam = parent.childForFieldName('parameters')?.namedChild(0);
      const extension = firstParam?.children.some((c) => c?.type === 'modifier' && c.text === 'this');
      const title = extension ? 'Extension method' : parent.parent?.parent?.type === 'interface_declaration' ? 'Interface method' : 'Method name';
      const kind = mods.includes('static') ? 'static method' : 'method';
      return { title, summary: `Declares the ${kind} ${name}.${withModifiers(parent)}`, scope: parent };
    }
    case 'local_function_statement.name':
      return { title: 'Local function', summary: `Declares ${name}, a function only visible inside the enclosing method.`, scope: parent };
    case 'constructor_declaration.name':
      return { title: 'Constructor', summary: `Declares a constructor: it runs when you write \`new ${node.text}(...)\`.${withModifiers(parent)}`, scope: parent };
    case 'destructor_declaration.name':
      return { title: 'Finalizer', summary: `Declares the finalizer of ${name}, run by the garbage collector.`, scope: parent };
    case 'property_declaration.name': {
      const accessors = parent.childForFieldName('accessors')?.namedChildren ?? [];
      const auto = accessors.length > 0 && accessors.every((a) => a && !a.childForFieldName('body'));
      return {
        title: 'Property',
        summary: `Declares the property ${name}${auto ? ', an *auto-property*: the compiler adds a hidden backing field' : ''}. Callers use it like a field, but it runs accessor code.${withModifiers(parent)}`,
        scope: parent,
      };
    }
    case 'event_declaration.name':
      return { title: 'Event', summary: `Declares the event ${name} with custom \`add\`/\`remove\` accessors.`, scope: parent };
    case 'delegate_declaration.name':
      return { title: 'Delegate type', summary: `Declares the delegate type ${name}: variables of this type hold methods with this signature.`, scope: parent };
    case 'enum_member_declaration.name':
      return { title: 'Enum member', summary: `Declares the enum member ${name}.`, scope: parent };
    case 'variable_declarator.name':
      return variableRole(node, parent);
    case 'parameter.name':
      return parameterRole(node, parent);
    case 'parameter_list.name':
      // The grammar puts a `params` parameter's name directly on the parameter list.
      return { title: 'Parameter', summary: `${name} is a \`params\` parameter: the caller may pass any number of arguments, which arrive as one array.` };
    case 'type_parameter.name': {
      const variance = parent.children.find((c) => c?.type === 'in' || c?.type === 'out')?.type;
      const decl = parent.parent?.parent ?? parent;
      return {
        title: 'Type parameter',
        summary: `${name} is a generic type placeholder, filled in by the caller.${variance ? ` It is \`${variance}\` (${variance === 'out' ? 'covariant' : 'contravariant'}).` : ''}`,
        scope: decl,
      };
    }
    case 'catch_declaration.name':
      return { title: 'Exception variable', summary: `${name} holds the caught exception inside this \`catch\` block.`, scope: parent.parent ?? parent };
    case 'declaration_pattern.name': {
      const owner = ancestor(node, (n) => n.type === 'switch_expression_arm' || n.type === 'switch_section' || n.type === 'if_statement', isFunction);
      return { title: 'Pattern variable', summary: `${name} is set to the matched value, but only when the pattern matches.`, scope: owner ?? parent };
    }
    case 'declaration_expression.name':
      return { title: 'Out variable', summary: `Declares ${name} right in the argument list; the method assigns it.`, scope: parent };
    case 'foreach_statement.left':
      return { title: 'Loop variable', summary: `${name} holds the current element in each iteration. It is read-only.`, scope: parent };
    case 'tuple_pattern.name':
      return { title: 'Deconstructed variable', summary: `${name} receives one part of the deconstructed value.`, scope: parent.parent ?? parent };
    case 'from_clause.name':
      return { title: 'Range variable', summary: `${name} stands for each element of the source in this LINQ query.`, scope: ancestor(node, (n) => n.type === 'query_expression') };
    case 'using_directive.name':
      return { title: 'Using alias', summary: `${name} is a short alias for the namespace or type on the right.`, scope: parent };
    case 'argument.name':
      return { title: 'Named argument', summary: `Passes this argument to the parameter called ${name}, regardless of position.` };
    case 'file_scoped_namespace_declaration.name':
    case 'namespace_declaration.name':
      return { title: 'Namespace', summary: `Declares the namespace ${name}.`, scope: parent };
    case 'labeled_statement.':
      if (parent.namedChild(0)?.equals(node)) {
        return { title: 'Label', summary: `${name} names the statement after it, so \`goto ${node.text};\` can jump here.`, scope: parent };
      }
      break;
    case 'goto_statement.':
      return { title: 'Label reference', summary: `Jumps to the statement labelled ${name}.`, scope: labelled(node.text, node) };
    case 'base_list.':
      return { title: 'Base type', summary: `${name} is a base class or interface of this type.` };
  }
  // LINQ range variables introduced by `join x`, `let x`, `into x`.
  const prev = node.previousSibling?.type;
  if ((prev === 'join' || prev === 'let' || prev === 'into') && /^(join_clause|let_clause|join_into_clause|query_expression)$/.test(parent.type)) {
    return { title: 'Range variable', summary: `\`${prev}\` introduces the range variable ${name} in this LINQ query.`, scope: ancestor(node, (n) => n.type === 'query_expression') ?? parent };
  }
  // Namespaces in `namespace A.B` (qualified names).
  if (parent.type === 'qualified_name') {
    let q: Node = parent;
    while (q.parent?.type === 'qualified_name') q = q.parent;
    if (q.parent && /namespace_declaration$/.test(q.parent.type) && fieldOf(q) === 'name') {
      return { title: 'Namespace', summary: `Part of the namespace \`${q.text}\` declared here.`, scope: q.parent };
    }
  }
  return undefined;
}

/** Whether a `dynamic` identifier sits where a type is expected. */
function isTypePosition(node: Node, field: string | null): boolean {
  return field === 'type' || field === 'returns' || node.parent?.type === 'type_argument_list';
}

export const csharp: LanguageSpec = {
  comments: csharpComments,
  id: 'csharp',
  languageIds: ['csharp'],
  displayName: 'C#',
  wasm: 'tree-sitter-c_sharp.wasm',
  fence: 'csharp',
  docs,
  identifierTypes: new Set(['identifier', 'implicit_parameter']),
  // `out`/`ref`/`in`/`this` on parameters and `async`/`static` on lambdas are named `modifier` leaves;
  // `int`, `string`, ... are named `predefined_type` leaves.
  keywordNodeTypes: new Set(['modifier', 'predefined_type']),
  wrapperTypes: new Set([
    'modifier',
    'when_clause',
    'catch_filter_clause',
    'type_parameter_constraint',
    'constructor_constraint',
    'join_into_clause',
    'from_clause',
  ]),
  noScopeTokens: new Set([',', ';', '.', '"', "'", ':', '=', '::']),
  role,
  jumpTarget(token) {
    const parent = token.parent;
    if (!parent) return undefined;
    if (parent.type === 'yield_statement') {
      const fn = ancestor(token, isFunction);
      const isBreak = parent.children.some((c) => c?.type === 'break');
      return fn && { node: fn, verb: isBreak ? 'ends the sequence of' : 'produces the next value of' };
    }
    switch (token.type) {
      case 'return': {
        const fn = ancestor(token, isFunction);
        return fn && { node: fn, verb: 'returns from' };
      }
      case 'break':
      case 'continue': {
        const kinds = token.type === 'break' ? BREAKABLE : LOOPS;
        const target = ancestor(token, (n) => kinds.has(n.type), isFunction);
        return target && { node: target, verb: token.type === 'break' ? 'breaks out of' : 'continues' };
      }
      case 'goto': {
        const label = parent.namedChildren.find((c) => c?.type === 'identifier');
        const isSwitchJump = parent.children.some((c) => c?.type === 'case' || c?.type === 'default');
        const target = isSwitchJump ? switchSection(parent) : label && labelled(label.text, token);
        return target ? { node: target, verb: 'jumps to' } : undefined;
      }
      case 'throw': {
        const tryStmt = catchingTry(token);
        if (tryStmt) return { node: tryStmt, verb: 'throws to the `catch` clauses of' };
        const fn = ancestor(token, isFunction);
        return fn && { node: fn, verb: 'throws out of' };
      }
    }
    return undefined;
  },
  promote(scope) {
    // `var` → the whole declaration it types.
    let s = scope;
    if (s.type === 'implicit_type' && s.parent) s = s.parent;
    if (s.type === 'variable_declaration' && s.parent && /^(local_declaration_statement|field_declaration|event_field_declaration)$/.test(s.parent.type)) {
      s = s.parent;
    }
    return s;
  },
  isDeclarationName(node, field) {
    if (field !== 'name') return false;
    const parent = node.parent;
    if (parent?.type === 'alias_qualified_name') return false;
    if (parent?.type !== 'qualified_name') return true;
    // `System.IO.StringReader`: a reference, unless it is part of `namespace A.B` being declared.
    let q: Node = parent;
    while (q.parent?.type === 'qualified_name') q = q.parent;
    return !!q.parent && /namespace_declaration$/.test(q.parent.type);
  },
  acceptIdentifierDoc(node, field, entry) {
    const parent = node.parent;
    if (parent?.type === 'member_access_expression' && field === 'name') return false;
    if (parent?.type === 'member_binding_expression') return false;
    switch (node.text) {
      case 'nameof':
        return parent?.type === 'invocation_expression' && field === 'function';
      case 'dynamic':
        return isTypePosition(node, field);
      case 'global':
        // `global::Name`; the grammar wraps the keyword in an identifier.
        return parent?.type === 'alias_qualified_name' && field === 'alias';
      case 'value': {
        const accessor = ancestor(node, (n) => n.type === 'accessor_declaration');
        const kind = accessor?.childForFieldName('name')?.text;
        return kind === 'set' || kind === 'init' || kind === 'add' || kind === 'remove';
      }
    }
    // Contextual keywords (`from`, `select`, `async`, ...) used as plain names are just names.
    return entry.kind === 'type' || entry.kind === 'function' || entry.kind === 'value';
  },
};
