import type { Node } from 'web-tree-sitter';
import type { DocEntry, DocTable, LanguageSpec, Role } from '../core/model';
import { ancestor } from '../core/nodes';
import {
  IDENTIFIER_TYPES,
  NO_SCOPE_TOKENS,
  WRAPPER_TYPES,
  acceptGlobal,
  docFor as jsDocFor,
  isDeclarationName,
  javascript,
  jumpTarget,
  promote,
  role as jsRole,
  javascriptOwnDocs,
} from './javascript';
import { typescriptComments } from './comments';
import { operatorDocs } from './operators';

const HB = 'https://www.typescriptlang.org/docs/handbook';
const h2 = (page: string) => `${HB}/2/${page}`;
const UTIL = `${HB}/utility-types.html`;
const UTIL_ANCHORS: Record<string, string> = {
  Record: 'recordkeys-type',
  Pick: 'picktype-keys',
  Omit: 'omittype-keys',
  Exclude: 'excludeuniontype-excludedmembers',
  Extract: 'extracttype-union',
};
const util = (name: string) => `${UTIL}#${UTIL_ANCHORS[name] ?? `${name.toLowerCase()}type`}`;

const VISIBILITY = 'Only checked by the compiler: at runtime the member is an ordinary property. For real runtime privacy use JavaScript `#private` fields.';

const tsOnly: DocTable = {
  // ------------------------------------------------------- type declarations
  type: {
    kind: 'keyword',
    title: 'type (type alias)',
    summary: 'Declares a **type alias**: a name for any type, e.g. a union, an object shape or a function type. It creates no runtime value.',
    details: 'Unlike `interface`, a type alias can name unions and other non-object types, but it cannot be re-opened to add members.',
    example: 'type ID = string | number;\ntype Point = { x: number; y: number };',
    link: h2('everyday-types.html#type-aliases'),
  },
  'import_statement/type': {
    kind: 'keyword',
    title: 'import type',
    summary: 'Imports **only types**: the import is removed entirely from the compiled JavaScript.',
    example: 'import type { User } from "./models";',
    link: h2('modules.html'),
  },
  interface: {
    kind: 'keyword',
    summary: 'Declares an **interface**: the shape an object must have (properties and methods). Only used for type checking; nothing exists at runtime.',
    details: 'TypeScript is *structural*: any object with the right members fits, it doesn\'t have to say `implements`. Interfaces with the same name merge.',
    example: 'interface User {\n  name: string;\n  age?: number;\n}',
    link: h2('objects.html'),
  },
  'extends_type_clause/extends': {
    kind: 'keyword',
    title: 'extends (interface)',
    summary: 'This interface **includes all members** of the listed interface(s) and adds its own.',
    example: 'interface Admin extends User {\n  permissions: string[];\n}',
    link: h2('objects.html#extending-types'),
  },
  'extends_clause/extends': javascript.docs['class_heritage/extends'],
  'constraint/extends': {
    kind: 'keyword',
    title: 'extends (generic constraint)',
    summary: 'A **constraint** on a type parameter: `T extends X` means only types assignable to `X` may be used for `T`, so the body may use `X`\'s members.',
    example: 'function longest<T extends { length: number }>(a: T, b: T) {\n  return a.length >= b.length ? a : b;\n}',
    link: h2('generics.html#generic-constraints'),
  },
  'conditional_type/extends': {
    kind: 'keyword',
    title: 'extends (conditional type)',
    summary: 'A **conditional type**: `A extends B ? X : Y` is `X` if type `A` is assignable to `B`, otherwise `Y`. An `if` for types.',
    example: 'type IsString<T> = T extends string ? true : false;',
    link: h2('conditional-types.html'),
  },
  'conditional_type/?': {
    kind: 'operator',
    title: 'A extends B ? X : Y',
    summary: 'The result of the **conditional type** when the `extends` check succeeds; the part after `:` is used otherwise.',
    link: h2('conditional-types.html'),
  },
  implements: {
    kind: 'keyword',
    summary: 'Promises that the class has all members of the interface; the compiler checks it. It doesn\'t inherit any code (that is `extends`).',
    example: 'class Square implements Shape {\n  area() { return this.side ** 2; }\n}',
    link: h2('classes.html#implements-clauses'),
  },
  enum: {
    kind: 'keyword',
    summary: 'Declares an **enum**: a set of named constants. Members are numbered from 0 unless you give values (strings are common).',
    details: 'Unlike most TS features, an enum produces a real object at runtime. `const enum` is inlined instead. Many codebases prefer a union of string literals (`"red" | "green"`).',
    example: 'enum Direction {\n  Up,\n  Down,\n}\nenum Color {\n  Red = "RED",\n}',
    link: `${HB}/enums.html`,
  },
  'enum_declaration/const': {
    kind: 'keyword',
    title: 'const enum',
    summary: 'An enum whose members are **inlined** as plain values at compile time; no enum object exists at runtime.',
    link: `${HB}/enums.html#const-enums`,
  },
  namespace: {
    kind: 'keyword',
    summary: 'Groups declarations under one name (`Geometry.ORIGIN`). An older way to organize code; in modern code, ES modules (one file = one module) are preferred.',
    example: 'namespace Validation {\n  export const zip = /^\\d{5}$/;\n}',
    link: `${HB}/namespaces.html`,
  },
  module: {
    kind: 'keyword',
    title: 'declare module',
    summary: 'Describes the types of a module (often a JavaScript package without types), or adds to an existing module\'s types.',
    link: `${HB}/declaration-files/templates/module-d-ts.html`,
  },
  declare: {
    kind: 'keyword',
    summary: 'States that something **exists at runtime** (defined elsewhere, e.g. by a script or the environment) and tells the compiler its type. Emits no JavaScript.',
    example: 'declare const VERSION: string; // injected by the bundler',
    link: `${HB}/declaration-files/by-example.html`,
  },
  'public_field_definition/declare': {
    kind: 'keyword',
    title: 'declare (field)',
    summary: 'Declares the type of a field without emitting any code for it, e.g. when a parent class or decorator sets it.',
    link: h2('classes.html'),
  },
  global: {
    kind: 'keyword',
    title: 'declare global',
    summary: 'Adds declarations to the **global** scope from inside a module, e.g. new properties on `Window`.',
    link: `${HB}/declaration-files/templates/global-modifying-module-d-ts.html`,
  },
  'export_statement/=': {
    kind: 'keyword',
    title: 'export =',
    summary: 'Sets the whole **CommonJS** export of the module (like `module.exports = ...`). Import it with `import x = require("...")`.',
    link: `${HB}/modules/reference.html`,
  },
  'import_require_clause/require': {
    kind: 'keyword',
    title: 'import x = require()',
    summary: 'TypeScript\'s syntax for importing a **CommonJS** module with types. Pairs with `export =`.',
    link: `${HB}/modules/reference.html`,
  },

  // ------------------------------------------------------------ classes
  abstract: {
    kind: 'keyword',
    summary: 'An **abstract** class can\'t be instantiated with `new`; it is a base for subclasses. An abstract method has no body and must be implemented by every subclass.',
    example: 'abstract class Shape {\n  abstract area(): number;\n  describe() { return `area ${this.area()}`; }\n}',
    link: h2('classes.html#abstract-classes-and-members'),
  },
  'abstract_class_declaration/class': javascript.docs.class,
  private: {
    kind: 'keyword',
    summary: 'The member is only accessible **inside this class**. In a constructor parameter, it also declares and assigns a field with that name.',
    details: VISIBILITY,
    example: 'class Account {\n  private balance = 0;\n  constructor(private owner: string) {} // creates this.owner\n}',
    link: h2('classes.html#member-visibility'),
  },
  protected: {
    kind: 'keyword',
    summary: 'The member is accessible inside this class **and its subclasses**, but not from outside.',
    details: VISIBILITY,
    link: h2('classes.html#protected'),
  },
  public: {
    kind: 'keyword',
    summary: 'The member is accessible from anywhere. This is the default, so `public` is mostly written for clarity or to create a **parameter property** in a constructor.',
    example: 'constructor(public name: string) {} // declares and sets this.name',
    link: h2('classes.html#public'),
  },
  readonly: {
    kind: 'keyword',
    summary: 'The property can be set when the object is created (or in the constructor) but **not reassigned** afterwards. Checked at compile time only.',
    example: 'interface Point {\n  readonly x: number;\n}\np.x = 5; // error',
    link: h2('objects.html#readonly-properties'),
  },
  'readonly_type/readonly': {
    kind: 'keyword',
    title: 'readonly T[] (read-only array)',
    summary: 'An array (or tuple) type without mutating methods: no `push`, `sort`, or index assignment.',
    link: h2('objects.html#the-readonlyarray-type'),
  },
  override: {
    kind: 'keyword',
    summary: 'Marks a method as replacing one from the parent class. The compiler errors if the parent has no such method (e.g. after a rename).',
    link: h2('classes.html#overriding-methods'),
  },
  '@': {
    kind: 'syntax',
    title: '@decorator',
    summary: 'A **decorator**: a function applied to the class, method or field below it, to wrap or annotate it. Common in frameworks like Angular and NestJS.',
    example: '@Component({ selector: "app-root" })\nclass AppComponent {}',
    link: `${HB}/decorators.html`,
  },

  // ----------------------------------------------------------- type operators
  'type_annotation/:': {
    kind: 'syntax',
    title: ': Type (type annotation)',
    summary: 'A **type annotation**: declares the type of the variable, parameter, property or return value before it. Removed when compiling to JavaScript.',
    details: 'You often don\'t need it: TypeScript infers types from values (`let n = 5` is a `number`). Annotate parameters and public APIs.',
    example: 'let name: string = "Ann";\nfunction add(a: number, b: number): number { return a + b; }',
    link: h2('everyday-types.html#type-annotations-on-variables'),
  },
  'type_predicate_annotation/:': {
    kind: 'syntax',
    title: ': x is T (type predicate)',
    summary: 'The return type of a **type guard** function: see `is`.',
    link: h2('narrowing.html#using-type-predicates'),
  },
  'type_predicate/is': {
    kind: 'keyword',
    title: 'x is T (type predicate)',
    summary: 'Makes this function a **type guard**: when it returns `true`, the compiler treats the argument as type `T` in the calling code.',
    example: 'function isString(v: unknown): v is string {\n  return typeof v === "string";\n}\nif (isString(x)) x.toUpperCase();',
    link: h2('narrowing.html#using-type-predicates'),
  },
  asserts: {
    kind: 'keyword',
    title: 'asserts (assertion function)',
    summary: 'The function **throws** unless the condition holds; after calling it, the compiler assumes the condition (or type) is true.',
    example: 'function assert(c: unknown): asserts c {\n  if (!c) throw new Error("assertion failed");\n}',
    link: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions',
  },
  'as_expression/as': {
    kind: 'operator',
    title: 'as (type assertion)',
    summary: 'A **type assertion**: tells the compiler to treat the value as another type. No conversion or check happens at runtime, so a wrong assertion leads to bugs.',
    details: 'Prefer narrowing (`typeof`, `instanceof`, type guards) or `satisfies` when possible.',
    example: 'const input = document.querySelector("#q") as HTMLInputElement;',
    link: h2('everyday-types.html#type-assertions'),
  },
  'as_expression/const': {
    kind: 'keyword',
    title: 'as const',
    summary: 'A **const assertion**: infers the narrowest, read-only type: literals stay literal (`"dark"`, not `string`) and objects/arrays become `readonly`.',
    example: 'const sizes = ["s", "m", "l"] as const;\ntype Size = (typeof sizes)[number]; // "s" | "m" | "l"',
    link: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions',
  },
  satisfies: {
    kind: 'operator',
    summary: 'Checks that the value **matches** a type, while keeping the more precise type the compiler inferred (unlike an annotation or `as`).',
    example: 'const colors = {\n  red: [255, 0, 0],\n} satisfies Record<string, number[]>;\ncolors.red; // still known to exist',
    link: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator',
  },
  'non_null_expression/!': {
    kind: 'operator',
    title: '! (non-null assertion)',
    summary: 'Postfix `!` tells the compiler "this is not `null` or `undefined`". It is removed at runtime, so if you are wrong you get an error later.',
    details: 'Not the same as prefix `!x` (logical NOT). Prefer a real check or `?.` when unsure.',
    example: 'const el = document.getElementById("app")!;',
    link: h2('everyday-types.html#non-null-assertion-operator-postfix-'),
  },
  'variable_declarator/!': {
    kind: 'operator',
    title: '! (definite assignment)',
    summary: '`let x!: T` tells the compiler the variable will be assigned before use, even though it can\'t see where.',
    link: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-7.html#definite-assignment-assertions',
  },
  'index_type_query/keyof': {
    kind: 'operator',
    title: 'keyof',
    summary: 'The **union of the property names** of a type: `keyof { x: number; y: number }` is `"x" | "y"`.',
    example: 'function get<T, K extends keyof T>(obj: T, key: K): T[K] {\n  return obj[key];\n}',
    link: h2('keyof-types.html'),
  },
  'type_query/typeof': {
    kind: 'operator',
    title: 'typeof (in a type)',
    summary: 'In a type position, `typeof x` means "the **type** of the variable `x`", as inferred by the compiler. (In normal code, `typeof` is the runtime operator giving a string.)',
    example: 'const defaults = { retries: 3, verbose: false };\ntype Options = typeof defaults;',
    link: h2('typeof-types.html'),
  },
  infer: {
    kind: 'keyword',
    summary: 'Inside the `extends` part of a conditional type, `infer X` **captures** part of the matched type into a new type variable `X`.',
    example: 'type ElementOf<A> = A extends (infer E)[] ? E : never;\ntype N = ElementOf<number[]>; // number',
    link: h2('conditional-types.html#inferring-within-conditional-types'),
  },
  'mapped_type_clause/in': {
    kind: 'keyword',
    title: 'in (mapped type)',
    summary: 'A **mapped type**: `[K in Keys]` builds an object type with one property per member of the union `Keys`.',
    example: 'type Flags<T> = { [K in keyof T]: boolean };',
    link: h2('mapped-types.html'),
  },
  'index_signature/[': {
    kind: 'syntax',
    title: '[key: K]: V (index signature)',
    summary: 'An **index signature**: the object may have any number of properties whose keys have type `K`, all with values of type `V`. Like a dictionary type.',
    details: 'Reading a key that isn\'t there still gives `undefined` at runtime; enable `noUncheckedIndexedAccess` to make the compiler remind you.',
    example: 'interface Scores {\n  [player: string]: number;\n}',
    link: h2('objects.html#index-signatures'),
  },
  'opting_type_annotation/?:': {
    kind: 'operator',
    title: '?: (optional, in mapped type)',
    summary: 'Makes every mapped property **optional**. `-?:` does the opposite (makes them required).',
    link: h2('mapped-types.html#mapping-modifiers'),
  },
  'omitting_type_annotation/-?:': {
    kind: 'operator',
    title: '-?: (required, in mapped type)',
    summary: 'Removes the optional `?` from every mapped property, making them all **required**.',
    link: h2('mapped-types.html#mapping-modifiers'),
  },
  'lookup_type/[': {
    kind: 'syntax',
    title: 'T[K] (indexed access type)',
    summary: 'The type of property `K` of type `T`, like reading a property but for types.',
    example: 'type Age = User["age"];',
    link: h2('indexed-access-types.html'),
  },
  'array_type/[': {
    kind: 'syntax',
    title: 'T[] (array type)',
    summary: 'An array whose elements are all of type `T`. Same as `Array<T>`.',
    link: h2('everyday-types.html#arrays'),
  },
  'tuple_type/[': {
    kind: 'syntax',
    title: '[A, B] (tuple type)',
    summary: 'A **tuple**: an array of fixed length where each position has its own type.',
    example: 'const entry: [string, number] = ["age", 31];',
    link: h2('objects.html#tuple-types'),
  },
  'object_type/{': {
    kind: 'syntax',
    title: '{ } (object type)',
    summary: 'An inline **object type**: lists the properties (and their types) an object must have. Separate members with `;` or `,`.',
    link: h2('objects.html'),
  },
  'union_type/|': {
    kind: 'operator',
    title: '| (union type)',
    summary: 'A **union**: the value is **one of** these types. Before using type-specific members, *narrow* it with `typeof`, `in`, `===` or a type guard.',
    example: 'function show(id: string | number) {\n  if (typeof id === "string") id.toUpperCase();\n}',
    link: h2('everyday-types.html#union-types'),
  },
  'intersection_type/&': {
    kind: 'operator',
    title: '& (intersection type)',
    summary: 'An **intersection**: the value has **all** members of both types at once. Used to combine object types.',
    example: 'type Admin = User & { permissions: string[] };',
    link: h2('objects.html#intersection-types'),
  },
  'type_parameters/<': {
    kind: 'syntax',
    title: '<T> (type parameters)',
    summary: 'Declares **generic** type parameters: placeholders the caller fills in (often inferred), so one function or type works for many types while staying type-safe.',
    example: 'function first<T>(items: T[]): T | undefined {\n  return items[0];\n}\nfirst([1, 2]); // T = number',
    link: h2('generics.html'),
  },
  'type_arguments/<': {
    kind: 'syntax',
    title: '<Type> (type arguments)',
    summary: 'Fills in a generic\'s type parameters explicitly, e.g. `Array<string>` or `useState<boolean>(false)`.',
    link: h2('generics.html'),
  },
  'function_type/=>': {
    kind: 'operator',
    title: '(args) => R (function type)',
    summary: 'A **function type**: a function taking these parameters and returning `R`. The parameter names are just documentation.',
    example: 'let onChange: (value: string) => void;',
    link: h2('functions.html#function-type-expressions'),
  },
  'constructor_type/new': {
    kind: 'keyword',
    title: 'new () => T (constructor type)',
    summary: 'The type of a class (or constructor function) that creates `T` instances when called with `new`.',
    link: h2('generics.html#using-class-types-in-generics'),
  },
  'property_signature/?': {
    kind: 'operator',
    title: '? (optional property)',
    summary: 'The property is **optional**: it may be missing. Its type automatically includes `undefined`, so check before use (`obj.label?.trim()`).',
    example: 'interface Options {\n  verbose?: boolean;\n}',
    link: h2('objects.html#optional-properties'),
  },
  'optional_parameter/?': {
    kind: 'operator',
    title: '? (optional parameter)',
    summary: 'The parameter is **optional**: callers may leave it out, and then it is `undefined`. Optional parameters come after required ones.',
    example: 'function greet(name?: string) {\n  return `Hi ${name ?? "there"}`;\n}',
    link: h2('functions.html#optional-parameters'),
  },
  'method_definition/?': {
    kind: 'operator',
    title: '? (optional method)',
    summary: 'The method is **optional**: it may be missing, so call it with `obj.method?.()`.',
    link: h2('objects.html#optional-properties'),
  },
  'method_signature/?': {
    kind: 'operator',
    title: '? (optional method)',
    summary: 'The method is **optional**: implementations may leave it out.',
    link: h2('objects.html#optional-properties'),
  },
  'public_field_definition/?': {
    kind: 'operator',
    title: '? (optional field)',
    summary: 'The field is **optional**: it may be `undefined`.',
    link: h2('classes.html#fields'),
  },
  'function_signature/function': {
    kind: 'keyword',
    title: 'function (signature / overload)',
    summary: 'A function **signature without a body**: either an *overload* (one of several ways to call the function that follows) or a declaration of a function defined elsewhere.',
    example: 'function len(s: string): number;\nfunction len(a: unknown[]): number;\nfunction len(x: any) { return x.length; }',
    link: h2('functions.html#function-overloads'),
  },
  '#template_literal_type': {
    kind: 'literal',
    title: '`...` (template literal type)',
    summary: 'A **template literal type**: a string type built from other types, e.g. `` `on${string}` `` matches any string starting with "on".',
    link: h2('template-literal-types.html'),
  },
  '#this_type': {
    kind: 'type',
    title: 'this (type)',
    summary: 'In a type: the type of the current instance, which is the subclass when called on a subclass. Useful for chaining methods.',
    link: h2('classes.html#this-types'),
  },

  // ---------------------------------------------------------- predefined types
  string: { kind: 'type', summary: 'Any text value.', link: h2('everyday-types.html#the-primitives-string-number-and-boolean') },
  number: { kind: 'type', summary: 'Any number: integers and decimals are the same type (64-bit floating point), including `NaN` and `Infinity`.', link: h2('everyday-types.html#the-primitives-string-number-and-boolean') },
  boolean: { kind: 'type', summary: '`true` or `false`.', link: h2('everyday-types.html#the-primitives-string-number-and-boolean') },
  symbol: { kind: 'type', summary: 'A unique `Symbol()` value.', link: h2('everyday-types.html#less-common-primitives') },
  bigint: { kind: 'type', summary: 'An arbitrarily large integer such as `10n`.', link: h2('everyday-types.html#less-common-primitives') },
  object: { kind: 'type', summary: 'Any non-primitive value (objects, arrays, functions). Not the same as `Object` or `{}`.', link: h2('functions.html#object') },
  any: {
    kind: 'type',
    summary: '**Turns off type checking** for this value: anything is allowed and nothing is checked. Errors then only show up at runtime.',
    details: 'Prefer `unknown` when you don\'t know the type yet: it forces you to check before use.',
    link: h2('everyday-types.html#any'),
  },
  unknown: {
    kind: 'type',
    summary: 'A value of **any** type, but, unlike `any`, you must narrow it (with `typeof`, `instanceof`, a type guard...) before you can use it. The safe "don\'t know yet" type.',
    example: 'function parse(json: string): unknown { return JSON.parse(json); }',
    link: h2('functions.html#unknown'),
  },
  never: {
    kind: 'type',
    summary: 'The type with **no values**: a function returning `never` never returns normally (it always throws or loops). Also what a union narrows to when every case is handled.',
    example: 'function fail(msg: string): never {\n  throw new Error(msg);\n}',
    link: h2('narrowing.html#the-never-type'),
  },
  'predefined_type/void': {
    kind: 'type',
    title: 'void',
    summary: 'The return type of a function that **doesn\'t return a value**.',
    link: h2('functions.html#void'),
  },
  'literal_type/undefined': { kind: 'type', title: 'undefined (type)', summary: 'The type of the value `undefined`. `T | undefined` means "a `T` or nothing"; that is also what an optional `?` adds.', link: h2('everyday-types.html#null-and-undefined') },
  'literal_type/null': { kind: 'type', title: 'null (type)', summary: 'The type of the value `null`. With `strictNullChecks`, values can only be `null` if the type says so.', link: h2('everyday-types.html#null-and-undefined') },

  // ------------------------------------------------------------ utility types
  Partial: { kind: 'type', summary: '`Partial<T>`: the type `T` with **all properties optional**. Handy for update functions.', example: 'function update(user: User, changes: Partial<User>) {}', link: util('Partial') },
  Required: { kind: 'type', summary: '`Required<T>`: the type `T` with **all properties required** (removes `?`).', link: util('Required') },
  Readonly: { kind: 'type', summary: '`Readonly<T>`: the type `T` with **all properties readonly**.', link: util('Readonly') },
  Record: { kind: 'type', summary: '`Record<K, V>`: an object type whose keys are `K` and values are `V`, e.g. `Record<string, number>` for a dictionary.', link: util('Record') },
  Pick: { kind: 'type', summary: '`Pick<T, Keys>`: a type with **only** the listed properties of `T`.', example: 'type Preview = Pick<User, "id" | "name">;', link: util('Pick') },
  Omit: { kind: 'type', summary: '`Omit<T, Keys>`: the type `T` **without** the listed properties.', example: 'type PublicUser = Omit<User, "password">;', link: util('Omit') },
  ReturnType: { kind: 'type', summary: '`ReturnType<F>`: the return type of function type `F`. Often used as `ReturnType<typeof fn>`.', link: util('ReturnType') },
  Parameters: { kind: 'type', summary: '`Parameters<F>`: the parameter types of function type `F`, as a tuple.', link: util('Parameters') },
  Awaited: { kind: 'type', summary: '`Awaited<T>`: the type you get after `await`ing a `T` (unwraps promises).', link: util('Awaited') },
  NonNullable: { kind: 'type', summary: '`NonNullable<T>`: `T` without `null` and `undefined`.', link: util('NonNullable') },
  Exclude: { kind: 'type', summary: '`Exclude<U, X>`: the members of union `U` that are not assignable to `X`.', link: util('Exclude') },
  Extract: { kind: 'type', summary: '`Extract<U, X>`: the members of union `U` that are assignable to `X`.', link: util('Extract') },
  Function: { kind: 'type', summary: 'The type of any function. Too loose for most uses: prefer a function type like `(x: number) => void`.', link: h2('functions.html#function') },
};

const MAPPED_TYPE: DocEntry = {
  kind: 'syntax',
  title: '[K in Keys]: T (mapped type)',
  summary: 'A **mapped type**: builds an object type with one property for each member `K` of the union `Keys`, typically `keyof` another type.',
  details: 'Add `?`/`readonly` (or remove them with `-?`/`-readonly`) to change every property at once; that is how `Partial` and `Readonly` are built.',
  example: 'type Flags<T> = { [K in keyof T]: boolean };',
  link: h2('mapped-types.html'),
};

const TYPE_ASSERTION: DocEntry = {
  kind: 'operator',
  title: '<Type>value (type assertion)',
  summary: 'An old-style **type assertion**: the same as `value as Type`. Nothing is checked at runtime.',
  details: 'Not allowed in `.tsx` files (it looks like JSX), so most code uses `as` instead.',
  link: h2('everyday-types.html#type-assertions'),
};

const PARAMETER_PROPERTY: DocEntry = {
  kind: 'keyword',
  title: 'parameter property',
  summary: 'A visibility modifier (or `readonly`) on a **constructor parameter** declares a class field with that name and assigns the argument to it, saving the `this.x = x` line.',
  example: 'class User {\n  constructor(private id: string, public name: string) {}\n}',
  link: h2('classes.html#parameter-properties'),
};

function tsDocFor(token: Node): DocEntry | undefined {
  const parent = token.parent;
  if (!parent) return undefined;
  switch (`${parent.type}/${token.type}`) {
    case 'index_signature/[':
      return parent.namedChildren.some((c) => c?.type === 'mapped_type_clause') ? MAPPED_TYPE : undefined;
    case 'type_arguments/<':
      return parent.parent?.type === 'type_assertion' ? TYPE_ASSERTION : undefined;
  }
  if (parent.type === 'accessibility_modifier' && /^(required|optional)_parameter$/.test(parent.parent?.type ?? '')) {
    const modifier = tsOnly[token.type];
    return modifier && { ...PARAMETER_PROPERTY, title: `${token.type} (parameter property)`, details: modifier.summary };
  }
  if (token.type === 'readonly' && /^(required|optional)_parameter$/.test(parent.type)) {
    return { ...PARAMETER_PROPERTY, title: 'readonly (parameter property)' };
  }
  return undefined;
}

const UTILITY_TYPES = new Set(['Partial', 'Required', 'Readonly', 'Record', 'Pick', 'Omit', 'ReturnType', 'Parameters', 'Awaited', 'NonNullable', 'Exclude', 'Extract']);
const PRIMITIVE_TYPE_NAMES = new Set(['string', 'number', 'boolean', 'symbol', 'bigint', 'object', 'any', 'unknown', 'never']);

function tsRole(node: Node, field: string | null): Role | undefined {
  const parent = node.parent;
  if (!parent) return undefined;
  const name = `\`${node.text}\``;
  const decl = (title: string, summary: string, scope: Node | undefined = parent): Role => ({ title, summary, scope });
  switch (`${parent.type}.${field ?? ''}`) {
    case 'type_alias_declaration.name':
      return decl('Type alias', `Declares the type ${name} (a name for the type after \`=\`; nothing exists at runtime).`);
    case 'interface_declaration.name':
      return decl('Interface', `Declares the interface ${name}: a shape objects can have.`);
    case 'enum_declaration.name':
      return decl('Enum', `Declares the enum ${name}.`);
    case 'enum_assignment.name':
      return decl('Enum member', `${name} is a member of the enum, with the value after \`=\`.`);
    case 'enum_body.name':
      return decl('Enum member', `${name} is a member of the enum, numbered automatically.`, undefined);
    case 'abstract_class_declaration.name':
      return decl('Abstract class', `Declares the abstract class ${name}: it can't be created with \`new\`, only extended.`);
    case 'internal_module.name':
      return decl('Namespace', `Declares the namespace ${name}; its exported members are used as \`${node.text}.member\`.`);
    case 'type_parameter.name': {
      const owner = parent.parent?.type === 'type_parameters' ? (parent.parent.parent ?? parent) : parent;
      return decl('Type parameter', `${name} is a generic type placeholder, filled in (or inferred) at each use.`, owner);
    }
    case 'property_signature.name':
      return decl('Property', `Declares that objects of this type have a property ${name}${parent.children.some((c) => c?.type === '?') ? ' (optional)' : ''}.`);
    case 'method_signature.name':
      return decl('Method signature', `Objects of this type must have a method ${name} with this signature.`);
    case 'abstract_method_signature.name':
      return decl('Abstract method', `Every subclass must implement ${name}.`);
    case 'public_field_definition.name': {
      const has = (t: string) => parent.children.some((c) => c?.type === t);
      const vis = parent.children.find((c) => c?.type === 'accessibility_modifier')?.text;
      const kind = node.type === 'private_property_identifier' ? 'Private field (#)' : has('static') ? 'Static field' : 'Class field';
      return decl(kind, `Declares the field ${name}${vis ? ` (${vis})` : ''}${has('readonly') ? ', readonly' : ''}.`);
    }
    case 'function_signature.name':
      return decl('Function signature', `Declares a signature (overload) of the function ${name}.`);
    case 'index_signature.name':
      return decl('Index key', `${name} just names the key in this index signature; any property key of that type is allowed.`);
    case 'mapped_type_clause.name':
      return decl('Mapped type key', `${name} stands for each key in turn while building this mapped type.`, ancestor(node, (n) => n.type === 'object_type'));
    case 'type_predicate.name':
      return { title: 'Narrowed parameter', summary: `When this returns true, ${name} is known to have the type after \`is\`.` };
    case 'required_parameter.pattern':
    case 'optional_parameter.pattern': {
      const modifier = parent.children.find((c) => c?.type === 'accessibility_modifier' || c?.type === 'readonly');
      const fn = parent.parent?.parent;
      if (modifier && fn) {
        return { title: 'Parameter property', summary: `\`${modifier.text}\` turns ${name} into a parameter **and** a class field: \`this.${node.text}\` is set automatically.`, scope: fn };
      }
      break;
    }
  }
  if (parent.type === 'infer_type') {
    return { title: 'Inferred type', summary: `\`infer\` captures this part of the matched type as ${name}, usable in the true branch.`, scope: ancestor(node, (n) => n.type === 'conditional_type') };
  }
  return undefined;
}

const role = (node: Node, field: string | null) => tsRole(node, field) ?? jsRole(node, field);
const acceptJs = acceptGlobal(role);

export const typescript: LanguageSpec = {
  comments: typescriptComments,
  id: 'typescript',
  languageIds: ['typescript'],
  displayName: 'TypeScript',
  wasm: 'tree-sitter-typescript.wasm',
  fence: 'ts',
  docs: { ...operatorDocs('ts'), ...javascriptOwnDocs, ...tsOnly },
  identifierTypes: new Set([...IDENTIFIER_TYPES, 'type_identifier']),
  wrapperTypes: new Set([...WRAPPER_TYPES, 'extends_clause', 'implements_clause', 'extends_type_clause', 'accessibility_modifier', 'override_modifier', 'constraint', 'mapped_type_clause', 'asserts']),
  noScopeTokens: new Set(NO_SCOPE_TOKENS),
  role,
  jumpTarget,
  promote,
  docFor: (token) => tsDocFor(token) ?? jsDocFor(token),
  isDeclarationName,
  acceptIdentifierDoc(node, field, entry: DocEntry) {
    // Utility types and lowercase primitive names only mean that in a type position.
    if ((UTILITY_TYPES.has(node.text) || PRIMITIVE_TYPE_NAMES.has(node.text)) && node.type !== 'type_identifier') return false;
    return acceptJs(node, field, entry);
  },
};

/** .tsx files: same docs, TSX grammar. */
export const tsx: LanguageSpec = {
  ...typescript,
  id: 'tsx',
  languageIds: ['typescriptreact'],
  wasm: 'tree-sitter-tsx.wasm',
  fence: 'tsx',
};
