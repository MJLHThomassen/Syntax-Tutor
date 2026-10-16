import type { Node } from 'web-tree-sitter';
import type { DocTable, LanguageSpec, Role } from '../core/model';
import { ancestor, fieldOf } from '../core/nodes';
import { goComments } from './comments';

const SPEC = 'https://go.dev/ref/spec';

const docs: DocTable = {
  // ---------------------------------------------------------------- keywords
  package: {
    kind: 'keyword',
    summary: 'Names the package this file belongs to. Every Go file starts with a `package` clause; files in the same directory share one package.',
    details: '`package main` is special: it builds an executable whose entry point is `func main()`.',
    example: 'package main',
    link: `${SPEC}#Package_clause`,
  },
  import: {
    kind: 'keyword',
    summary: 'Makes another package available in this file. You then refer to its exported (Capitalized) names as `pkg.Name`.',
    details: 'An optional name before the path renames the package locally. `_` imports a package only for its side effects (its `init` functions).',
    example: 'import (\n\t"fmt"\n\tstr "strings" // alias\n)',
    link: `${SPEC}#Import_declarations`,
  },
  func: {
    kind: 'keyword',
    summary: 'Declares a function: a named block of code with parameters and results.',
    details: 'Go functions can return multiple values. By convention the last result is an `error`.',
    example: 'func divide(a, b int) (int, error) {\n\tif b == 0 {\n\t\treturn 0, errors.New("divide by zero")\n\t}\n\treturn a / b, nil\n}',
    link: `${SPEC}#Function_declarations`,
  },
  'method_declaration/func': {
    kind: 'keyword',
    title: 'func (method)',
    summary: 'Declares a **method**: a function with a *receiver* `(r T)` or `(r *T)` written before its name. You call it as `value.Method()`.',
    details: 'Use a pointer receiver `*T` when the method must modify the value or the value is large. Methods are how Go types satisfy interfaces.',
    example: 'func (c *Counter) Inc() {\n\tc.n++\n}',
    link: `${SPEC}#Method_declarations`,
  },
  'func_literal/func': {
    kind: 'keyword',
    title: 'func (anonymous function)',
    summary: 'A **function literal** (closure): an unnamed function written inline. It can use and modify variables from the surrounding function.',
    example: 'add := func(a, b int) int { return a + b }\ngo func() { work() }()',
    link: `${SPEC}#Function_literals`,
  },
  'function_type/func': {
    kind: 'keyword',
    title: 'func (function type)',
    summary: 'A **function type**: describes the signature of functions, so functions can be stored in variables or passed as arguments.',
    example: 'type Handler func(w io.Writer, msg string) error',
    link: `${SPEC}#Function_types`,
  },
  return: {
    kind: 'keyword',
    summary: 'Ends the current function and hands back its result values to the caller.',
    details: 'Deferred calls run after `return` sets the results but before the function actually exits. With *named results*, a bare `return` returns their current values.',
    example: 'return total, nil',
    link: `${SPEC}#Return_statements`,
  },
  var: {
    kind: 'keyword',
    summary: 'Declares one or more variables. Without an initial value a variable gets its type\'s **zero value** (`0`, `""`, `false`, `nil`).',
    details: 'Inside functions the short form `x := value` is more common.',
    example: 'var count int\nvar name = "gopher"\nvar (\n\ta, b int\n)',
    link: `${SPEC}#Variable_declarations`,
  },
  const: {
    kind: 'keyword',
    summary: 'Declares constants: values fixed at compile time (numbers, strings, booleans).',
    details: 'Inside a `const ( ... )` block, `iota` counts up from 0, which is Go\'s way to make enums.',
    example: 'const (\n\tRed = iota // 0\n\tGreen      // 1\n\tBlue       // 2\n)',
    link: `${SPEC}#Constant_declarations`,
  },
  type: {
    kind: 'keyword',
    summary: 'Declares a new named type (or an alias with `type A = B`).',
    details: 'A defined type like `type Celsius float64` is a distinct type: you can attach methods to it and it doesn\'t mix with `float64` without a conversion.',
    example: 'type Point struct {\n\tX, Y int\n}\ntype Celsius float64',
    link: `${SPEC}#Type_declarations`,
  },
  'type_switch_statement/type': {
    kind: 'keyword',
    title: '.(type)',
    summary: 'In a **type switch**, `x.(type)` asks for the dynamic type stored in interface value `x`. Each `case` lists types instead of values.',
    example: 'switch v := x.(type) {\ncase int:\n\tfmt.Println("int", v)\ncase string:\n\tfmt.Println("string", v)\n}',
    link: `${SPEC}#Type_switches`,
  },
  struct: {
    kind: 'keyword',
    summary: 'A **struct type**: a collection of named fields. Go\'s replacement for classes (behaviour comes from methods).',
    details: 'Fields starting with a capital letter are exported (visible to other packages). A field with only a type is *embedded*: its fields and methods are promoted.',
    example: 'type User struct {\n\tName  string\n\tEmail string `json:"email"`\n}',
    link: `${SPEC}#Struct_types`,
  },
  interface: {
    kind: 'keyword',
    summary: 'An **interface type**: a set of method signatures. Any type that has those methods satisfies the interface automatically: there is no `implements` keyword.',
    details: '`interface{}` (or `any`) is satisfied by every type. In generics, interfaces are also used as type constraints.',
    example: 'type Stringer interface {\n\tString() string\n}',
    link: `${SPEC}#Interface_types`,
  },
  map: {
    kind: 'keyword',
    summary: 'A **map type** `map[K]V`: a hash table from keys of type `K` to values of type `V`.',
    details: 'Create with `make(map[K]V)` or a literal. Reading a missing key gives the zero value. Use `v, ok := m[k]` to check existence. A nil map can be read but not written.',
    example: 'ages := map[string]int{"ann": 31}\nif age, ok := ages["bob"]; ok {\n\tfmt.Println(age)\n}',
    link: `${SPEC}#Map_types`,
  },
  chan: {
    kind: 'keyword',
    summary: 'A **channel type** `chan T`: a pipe goroutines use to send and receive values of type `T`, safely and in order.',
    details: '`chan<- T` is send-only, `<-chan T` is receive-only. Unbuffered channels make sender and receiver wait for each other; `make(chan T, n)` adds a buffer.',
    example: 'ch := make(chan int)\ngo func() { ch <- 42 }()\nv := <-ch',
    link: `${SPEC}#Channel_types`,
  },
  if: {
    kind: 'keyword',
    summary: 'Runs its block only when the condition is `true`. No parentheses around the condition; braces are required.',
    details: 'An optional short statement before the condition is scoped to the `if`/`else` chain: `if err := f(); err != nil { ... }`.',
    example: 'if n, err := strconv.Atoi(s); err != nil {\n\treturn err\n} else {\n\tfmt.Println(n)\n}',
    link: `${SPEC}#If_statements`,
  },
  else: {
    kind: 'keyword',
    summary: 'The branch of an `if` that runs when the condition is `false`. Can be chained as `else if`.',
    details: 'Idiomatic Go often avoids `else` by returning early from the `if` block.',
    example: 'if x > 0 {\n\t...\n} else if x < 0 {\n\t...\n} else {\n\t...\n}',
    link: `${SPEC}#If_statements`,
  },
  for: {
    kind: 'keyword',
    summary: 'Go\'s **only loop** keyword. It covers every loop shape: C-style, while-style, infinite, and `range` loops.',
    example: 'for i := 0; i < 10; i++ { }   // classic\nfor n > 0 { }                 // "while"\nfor { }                       // forever\nfor i, v := range items { }   // iterate',
    link: `${SPEC}#For_statements`,
  },
  range: {
    kind: 'keyword',
    summary: 'Iterates over a slice, array, string, map, channel, integer or iterator function inside a `for` loop.',
    details: 'Slices/arrays give `index, value`; strings give `byteIndex, rune`; maps give `key, value` (in random order); channels give values until closed; `range 10` counts 0..9.',
    example: 'for i, name := range names {\n\tfmt.Println(i, name)\n}\nfor k := range m { } // keys only',
    link: `${SPEC}#For_range`,
  },
  break: {
    kind: 'keyword',
    summary: 'Immediately leaves the innermost `for`, `switch` or `select`. With a label (`break outer`) it leaves that labelled statement instead.',
    example: 'for _, v := range xs {\n\tif v < 0 {\n\t\tbreak\n\t}\n}',
    link: `${SPEC}#Break_statements`,
  },
  continue: {
    kind: 'keyword',
    summary: 'Skips the rest of the current loop iteration and starts the next one. With a label it continues that outer loop.',
    example: 'for _, line := range lines {\n\tif line == "" {\n\t\tcontinue\n\t}\n\tprocess(line)\n}',
    link: `${SPEC}#Continue_statements`,
  },
  switch: {
    kind: 'keyword',
    summary: 'Compares a value against several `case`s and runs the first match. Unlike C, cases **don\'t fall through** by default: no `break` needed.',
    details: 'Without a value (`switch {`), each case is a boolean condition: a tidy `if/else if` chain.',
    example: 'switch day {\ncase "sat", "sun":\n\tfmt.Println("weekend")\ndefault:\n\tfmt.Println("weekday")\n}',
    link: `${SPEC}#Switch_statements`,
  },
  'type_switch_statement/switch': {
    kind: 'keyword',
    title: 'switch (type switch)',
    summary: 'A **type switch**: branches on the dynamic type of an interface value, using `x.(type)`.',
    example: 'switch v := x.(type) {\ncase int:\ncase string:\n}',
    link: `${SPEC}#Type_switches`,
  },
  case: {
    kind: 'keyword',
    summary: 'One branch of a `switch`. Can list several comma-separated values; runs when any matches.',
    example: 'case 1, 2, 3:',
    link: `${SPEC}#Switch_statements`,
  },
  'type_case/case': {
    kind: 'keyword',
    title: 'case (type switch)',
    summary: 'One branch of a type switch: runs when the value\'s dynamic type is one of the listed types.',
    example: 'case int, int64:',
    link: `${SPEC}#Type_switches`,
  },
  'communication_case/case': {
    kind: 'keyword',
    title: 'case (select)',
    summary: 'One branch of a `select`: a channel send or receive. The branch runs if that channel operation can proceed.',
    example: 'case msg := <-inbox:\ncase out <- v:',
    link: `${SPEC}#Select_statements`,
  },
  default: {
    kind: 'keyword',
    summary: 'The branch of a `switch` or `select` that runs when no other case matches. In a `select` it makes the select non-blocking.',
    example: 'default:\n\tfmt.Println("nothing ready")',
    link: `${SPEC}#Switch_statements`,
  },
  fallthrough: {
    kind: 'keyword',
    summary: 'Explicitly continues into the **next** `case` body of a switch (Go never does this automatically). Must be the last statement of a case.',
    example: 'case 1:\n\tfmt.Println("one")\n\tfallthrough\ncase 2:\n\tfmt.Println("one or two")',
    link: `${SPEC}#Fallthrough_statements`,
  },
  select: {
    kind: 'keyword',
    summary: 'Waits on several channel operations at once and runs the case of whichever is ready first (random pick if several are).',
    details: 'Commonly used for timeouts (`case <-time.After(d):`) and cancellation (`case <-ctx.Done():`).',
    example: 'select {\ncase v := <-results:\n\tuse(v)\ncase <-time.After(time.Second):\n\tfmt.Println("timeout")\n}',
    link: `${SPEC}#Select_statements`,
  },
  go: {
    kind: 'keyword',
    summary: 'Starts the function call in a new **goroutine**: a lightweight thread that runs concurrently. `go` returns immediately; the result values are discarded.',
    details: 'Use channels or `sync.WaitGroup` to wait for goroutines and get results back. The program exits when `main` returns, even if goroutines are still running.',
    example: 'go worker(jobs)\ngo func() {\n\tdone <- compute()\n}()',
    link: `${SPEC}#Go_statements`,
  },
  defer: {
    kind: 'keyword',
    summary: 'Schedules a call to run when the surrounding **function returns** (normally or by panic). Deferred calls run in last-in, first-out order.',
    details: 'The arguments are evaluated right away; only the call is delayed. Typical use: cleanup right after acquiring a resource.',
    example: 'f, err := os.Open(path)\nif err != nil {\n\treturn err\n}\ndefer f.Close()',
    link: `${SPEC}#Defer_statements`,
  },
  goto: {
    kind: 'keyword',
    summary: 'Jumps to a labelled statement in the same function. Rarely used; it may not jump over variable declarations or into blocks.',
    example: 'goto retry',
    link: `${SPEC}#Goto_statements`,
  },

  // --------------------------------------------------------------- operators
  ':=': {
    kind: 'operator',
    title: ':= (short variable declaration)',
    summary: 'Declares **new** variables and assigns them, with the type inferred from the right side. Only allowed inside functions.',
    details: 'At least one variable on the left must be new; existing ones in the same scope are just reassigned. Watch out: in an inner block, `:=` creates a *new* variable that shadows the outer one.',
    example: 'name := "gopher"\nn, err := strconv.Atoi(s)',
    link: `${SPEC}#Short_variable_declarations`,
  },
  'range_clause/:=': {
    kind: 'operator',
    title: ':= (in range)',
    summary: 'Declares the loop variables of a `range` loop. Each iteration gets fresh variables (since Go 1.22).',
    example: 'for i, v := range xs { }',
    link: `${SPEC}#For_range`,
  },
  'send_statement/<-': {
    kind: 'operator',
    title: '<- (send)',
    summary: '**Sends** the value on the right into the channel on the left. Blocks until a receiver takes it (or there is buffer space).',
    example: 'ch <- 42',
    link: `${SPEC}#Send_statements`,
  },
  'unary_expression/<-': {
    kind: 'operator',
    title: '<- (receive)',
    summary: '**Receives** a value from the channel. Blocks until a value is available. `v, ok := <-ch` sets `ok` to false once the channel is closed and empty.',
    example: 'v := <-ch\nv, ok := <-ch',
    link: `${SPEC}#Receive_operator`,
  },
  'channel_type/<-': {
    kind: 'operator',
    title: '<- (channel direction)',
    summary: 'Restricts a channel type: `chan<- T` can only send, `<-chan T` can only receive. Used in function signatures to document intent.',
    example: 'func producer(out chan<- int) { }\nfunc consumer(in <-chan int) { }',
    link: `${SPEC}#Channel_types`,
  },
  'pointer_type/*': {
    kind: 'operator',
    title: '* (pointer type)',
    summary: '`*T` is the type "pointer to a `T`": it holds the memory address of a `T` value. Its zero value is `nil`.',
    example: 'var p *int = &x',
    link: `${SPEC}#Pointer_types`,
  },
  'unary_expression/*': {
    kind: 'operator',
    title: '* (dereference)',
    summary: '`*p` follows the pointer `p` to the value it points at, for reading or writing.',
    details: 'For struct pointers Go dereferences automatically: `p.Field` works, no `->` needed.',
    example: '*p = 10\nfmt.Println(*p)',
    link: `${SPEC}#Address_operators`,
  },
  'unary_expression/&': {
    kind: 'operator',
    title: '& (address-of)',
    summary: '`&x` gives a pointer to `x`. Taking the address of a composite literal (`&T{...}`) allocates a new value.',
    details: 'It\'s safe to return `&local` from a function: Go moves the value to the heap when needed.',
    example: 'p := &x\nu := &User{Name: "ann"}',
    link: `${SPEC}#Address_operators`,
  },
  'binary_expression/&^': {
    kind: 'operator',
    title: '&^ (bit clear)',
    summary: 'AND NOT: clears in the left operand every bit that is set in the right operand. `x &^ y` equals `x & (^y)`.',
    example: 'flags = flags &^ Mask',
    link: `${SPEC}#Arithmetic_operators`,
  },
  'unary_expression/^': {
    kind: 'operator',
    title: '^ (bitwise complement)',
    summary: 'As a prefix, `^x` flips every bit of `x` (Go uses `^`, not `~`, for this).',
    example: 'mask := ^0 // all bits set',
    link: `${SPEC}#Arithmetic_operators`,
  },
  'variadic_parameter_declaration/...': {
    kind: 'operator',
    title: '... (variadic parameter)',
    summary: 'The last parameter `xs ...T` accepts any number of `T` arguments. Inside the function, `xs` is a `[]T` slice.',
    example: 'func sum(nums ...int) int { }\nsum(1, 2, 3)',
    link: `${SPEC}#Function_types`,
  },
  'variadic_argument/...': {
    kind: 'operator',
    title: '... (spread)',
    summary: 'Passes the elements of a slice as individual arguments to a variadic function.',
    example: 'nums := []int{1, 2, 3}\nsum(nums...)\nall = append(all, more...)',
    link: `${SPEC}#Passing_arguments_to_..._parameters`,
  },
  'implicit_length_array_type/...': {
    kind: 'operator',
    title: '[...] (array length from literal)',
    summary: 'Lets the compiler count the elements: `[...]int{1, 2, 3}` is an array of type `[3]int`.',
    example: 'days := [...]string{"mon", "tue"}',
    link: `${SPEC}#Composite_literals`,
  },
  'slice_type/[': {
    kind: 'syntax',
    title: '[]T (slice type)',
    summary: 'A **slice**: a growable view onto an array. Has a length (`len`) and capacity (`cap`). The zero value is `nil`, which works like an empty slice.',
    details: 'Grow with `append`. Slices share their underlying array, so changes through one slice can be visible through another.',
    example: 'var xs []int\nxs = append(xs, 1, 2)',
    link: `${SPEC}#Slice_types`,
  },
  'array_type/[': {
    kind: 'syntax',
    title: '[N]T (array type)',
    summary: 'A fixed-size **array** of exactly `N` elements. The length is part of the type: `[3]int` and `[4]int` are different types. Arrays are copied on assignment.',
    example: 'var grid [3][3]int',
    link: `${SPEC}#Array_types`,
  },
  'slice_expression/[': {
    kind: 'syntax',
    title: 's[low:high] (slicing)',
    summary: 'Takes a sub-slice from index `low` up to (not including) `high`. Either bound may be omitted. The result shares memory with the original.',
    example: 'first3 := xs[:3]\nrest := xs[3:]',
    link: `${SPEC}#Slice_expressions`,
  },
  'type_assertion_expression/.': {
    kind: 'syntax',
    title: 'x.(T) (type assertion)',
    summary: 'Asserts that the interface value `x` holds a `T` and extracts it. Panics if wrong, unless you use the two-value form `v, ok := x.(T)`.',
    example: 's, ok := v.(string)',
    link: `${SPEC}#Type_assertions`,
  },
  'negated_type/~': {
    kind: 'operator',
    title: '~T (underlying type constraint)',
    summary: 'In a generic constraint, `~int` means "any type whose underlying type is `int`", so it also matches `type Age int`.',
    example: 'type Number interface {\n\t~int | ~float64\n}',
    link: `${SPEC}#General_interfaces`,
  },
  'type_constraint/|': {
    kind: 'operator',
    title: '| (type union)',
    summary: 'In a generic constraint, `A | B` allows either type.',
    example: 'func Max[T int | float64](a, b T) T',
    link: `${SPEC}#General_interfaces`,
  },
  'type_parameter_list/[': {
    kind: 'syntax',
    title: '[T any] (type parameters)',
    summary: 'Declares **generic type parameters**: placeholders for types, each with a constraint (`any`, `comparable`, or an interface).',
    example: 'func Map[T, U any](xs []T, f func(T) U) []U',
    link: `${SPEC}#Type_parameter_declarations`,
  },
  'labeled_statement/:': {
    kind: 'syntax',
    title: 'label:',
    summary: 'Gives the following statement a name so `break`, `continue` or `goto` can target it, typically to exit nested loops.',
    example: 'outer:\nfor _, row := range grid {\n\tfor _, v := range row {\n\t\tif v == 0 {\n\t\t\tbreak outer\n\t\t}\n\t}\n}',
    link: `${SPEC}#Labeled_statements`,
  },
  'block/{': {
    kind: 'syntax',
    title: '{ } (block)',
    summary: 'A block. Variables declared inside are only visible until the matching `}`.',
    link: `${SPEC}#Blocks`,
  },
  'block/}': {
    kind: 'syntax',
    title: '{ } (block)',
    summary: 'End of a block. Variables declared inside are no longer visible after this.',
    link: `${SPEC}#Blocks`,
  },
  'literal_value/{': {
    kind: 'syntax',
    title: 'T{...} (composite literal)',
    summary: 'Builds a struct, slice, array or map value in place. Struct fields can be named (`Name: "x"`); unnamed fields get their zero value.',
    example: 'p := Point{X: 1, Y: 2}\nxs := []int{1, 2, 3}',
    link: `${SPEC}#Composite_literals`,
  },
  'literal_value/}': {
    kind: 'syntax',
    title: 'T{...} (composite literal)',
    summary: 'End of a composite literal (a struct, slice, array or map value built in place).',
    link: `${SPEC}#Composite_literals`,
  },

  // ---------------------------------------------------------------- literals
  '#raw_string_literal': {
    kind: 'literal',
    title: '`raw string`',
    summary: 'A **raw string literal**: backslashes are not escapes and it may span multiple lines. Handy for regexes, JSON, and struct tags.',
    example: 're := regexp.MustCompile(`\\d+`)',
    link: `${SPEC}#String_literals`,
  },
  '#rune_literal': {
    kind: 'literal',
    title: "'x' (rune literal)",
    summary: 'A **rune**: a single Unicode code point, of type `rune` (an alias for `int32`). Not a string: `\'a\'` is the number 97.',
    example: "r := 'é'\nfor _, r := range \"héllo\" { }",
    link: `${SPEC}#Rune_literals`,
  },
  '#imaginary_literal': {
    kind: 'literal',
    title: 'imaginary literal',
    summary: 'A complex-number constant with an imaginary part, like `2i` or `1.5i`.',
    link: `${SPEC}#Imaginary_literals`,
  },

  // ------------------------------------------------- predeclared identifiers
  nil: {
    kind: 'value',
    summary: 'The zero value for pointers, slices, maps, channels, functions and interfaces: "no value".',
    details: 'An interface holding a nil pointer is **not** itself `nil`, a classic Go gotcha.',
    example: 'if err != nil {\n\treturn err\n}',
    link: `${SPEC}#Predeclared_identifiers`,
  },
  true: { kind: 'value', summary: 'The boolean constant true (type `bool`).', link: `${SPEC}#Boolean_types` },
  false: { kind: 'value', summary: 'The boolean constant false (type `bool`), and the zero value of `bool`.', link: `${SPEC}#Boolean_types` },
  iota: {
    kind: 'value',
    summary: 'Inside a `const` block, `iota` is the index of the current constant line, starting at 0. Used to build enums and bit flags.',
    example: 'const (\n\tKB = 1 << (10 * (iota + 1)) // 1 << 10\n\tMB                          // 1 << 20\n)',
    link: `${SPEC}#Iota`,
  },
  _: {
    kind: 'value',
    title: '_ (blank identifier)',
    summary: 'A write-only placeholder: assigns a value and throws it away. Used to ignore results you don\'t need.',
    example: 'for _, v := range xs { }\n_, err := f()',
    link: `${SPEC}#Blank_identifier`,
  },
  append: {
    kind: 'function',
    summary: 'Adds elements to the end of a slice and returns the (possibly new) slice. Always use the result: `xs = append(xs, v)`.',
    details: 'If capacity runs out, `append` allocates a bigger array and copies, so the returned slice may no longer share memory with the old one.',
    example: 'xs = append(xs, 4, 5)\nxs = append(xs, other...)',
    link: `${SPEC}#Appending_and_copying_slices`,
  },
  len: {
    kind: 'function',
    summary: 'Length of a string (in **bytes**, not characters), slice, array, map or channel.',
    example: 'n := len(xs)\nutf8.RuneCountInString(s) // characters',
    link: `${SPEC}#Length_and_capacity`,
  },
  cap: {
    kind: 'function',
    summary: 'Capacity of a slice, array or channel: how many elements fit before a reallocation (slice) or how big the buffer is (channel).',
    link: `${SPEC}#Length_and_capacity`,
  },
  make: {
    kind: 'function',
    summary: 'Creates and initializes a slice, map or channel (the built-in reference types).',
    example: 'xs := make([]int, 0, 10) // len 0, cap 10\nm := make(map[string]int)\nch := make(chan int, 5)  // buffered',
    link: `${SPEC}#Making_slices_maps_and_channels`,
  },
  new: {
    kind: 'function',
    summary: '`new(T)` allocates a zeroed `T` and returns a `*T` pointer to it. `&T{}` is usually preferred for structs.',
    example: 'p := new(int) // *p == 0',
    link: `${SPEC}#Allocation`,
  },
  delete: {
    kind: 'function',
    summary: 'Removes a key from a map. Does nothing if the key is absent.',
    example: 'delete(ages, "bob")',
    link: `${SPEC}#Deletion_of_map_elements`,
  },
  copy: {
    kind: 'function',
    summary: 'Copies elements from a source slice into a destination slice and returns how many were copied (the shorter length).',
    example: 'n := copy(dst, src)',
    link: `${SPEC}#Appending_and_copying_slices`,
  },
  clear: {
    kind: 'function',
    summary: 'Deletes all entries of a map, or sets all elements of a slice to their zero value.',
    link: `${SPEC}#Clear`,
  },
  close: {
    kind: 'function',
    summary: 'Closes a channel: no more values can be sent. Receivers get the remaining values, then zero values with `ok == false`. `range` over the channel stops.',
    details: 'Only the sender should close a channel; sending on a closed channel panics.',
    example: 'close(jobs)',
    link: `${SPEC}#Close`,
  },
  panic: {
    kind: 'function',
    summary: 'Stops normal execution: runs deferred calls up the stack and crashes the program unless `recover` catches it. For truly unexpected errors only; normal errors are returned as values.',
    example: 'panic("unreachable")',
    link: `${SPEC}#Handling_panics`,
  },
  recover: {
    kind: 'function',
    summary: 'Called inside a deferred function, stops a panic in progress and returns the value passed to `panic`. Returns `nil` otherwise.',
    example: 'defer func() {\n\tif r := recover(); r != nil {\n\t\tlog.Println("recovered:", r)\n\t}\n}()',
    link: `${SPEC}#Handling_panics`,
  },
  min: { kind: 'function', summary: 'Returns the smallest of its arguments (numbers or strings). Built in since Go 1.21.', link: `${SPEC}#Min_and_max` },
  max: { kind: 'function', summary: 'Returns the largest of its arguments (numbers or strings). Built in since Go 1.21.', link: `${SPEC}#Min_and_max` },
  print: { kind: 'function', summary: 'Low-level debug print to stderr. Use `fmt.Print` in real code.', link: `${SPEC}#Bootstrapping` },
  println: { kind: 'function', summary: 'Low-level debug print to stderr. Use `fmt.Println` in real code.', link: `${SPEC}#Bootstrapping` },
  complex: { kind: 'function', summary: 'Builds a complex number from a real and an imaginary part.', link: `${SPEC}#Manipulating_complex_numbers` },
  real: { kind: 'function', summary: 'The real part of a complex number.', link: `${SPEC}#Manipulating_complex_numbers` },
  imag: { kind: 'function', summary: 'The imaginary part of a complex number.', link: `${SPEC}#Manipulating_complex_numbers` },

  // ----------------------------------------------------------- builtin types
  error: {
    kind: 'type',
    summary: 'The built-in interface for errors: anything with an `Error() string` method. Functions return an `error` as their last result; `nil` means success.',
    example: 'if err != nil {\n\treturn fmt.Errorf("loading config: %w", err)\n}',
    link: `${SPEC}#Errors`,
  },
  any: { kind: 'type', summary: 'Alias for `interface{}`: a type that can hold a value of any type.', link: `${SPEC}#Interface_types` },
  comparable: { kind: 'type', summary: 'A generic constraint for types that support `==` and `!=` (needed e.g. for map keys).', link: `${SPEC}#Type_constraints` },
  string: {
    kind: 'type',
    summary: 'An immutable sequence of bytes, usually UTF-8 text. Indexing `s[i]` gives a byte; `range s` gives runes (characters).',
    link: `${SPEC}#String_types`,
  },
  bool: { kind: 'type', summary: 'The boolean type: `true` or `false`.', link: `${SPEC}#Boolean_types` },
  int: { kind: 'type', summary: 'Signed integer, 64 bits on 64-bit platforms. The default integer type.', link: `${SPEC}#Numeric_types` },
  uint: { kind: 'type', summary: 'Unsigned integer, same size as `int`.', link: `${SPEC}#Numeric_types` },
  byte: { kind: 'type', summary: 'Alias for `uint8`: one byte. `[]byte` is how Go handles raw binary data.', link: `${SPEC}#Numeric_types` },
  rune: { kind: 'type', summary: 'Alias for `int32`: one Unicode code point (a "character").', link: `${SPEC}#Numeric_types` },
  float64: { kind: 'type', summary: '64-bit floating point number. The default for float literals.', link: `${SPEC}#Numeric_types` },
  float32: { kind: 'type', summary: '32-bit floating point number.', link: `${SPEC}#Numeric_types` },
  int8: { kind: 'type', summary: '8-bit signed integer (-128..127).', link: `${SPEC}#Numeric_types` },
  int16: { kind: 'type', summary: '16-bit signed integer.', link: `${SPEC}#Numeric_types` },
  int32: { kind: 'type', summary: '32-bit signed integer.', link: `${SPEC}#Numeric_types` },
  int64: { kind: 'type', summary: '64-bit signed integer.', link: `${SPEC}#Numeric_types` },
  uint8: { kind: 'type', summary: '8-bit unsigned integer (0..255). Same as `byte`.', link: `${SPEC}#Numeric_types` },
  uint16: { kind: 'type', summary: '16-bit unsigned integer.', link: `${SPEC}#Numeric_types` },
  uint32: { kind: 'type', summary: '32-bit unsigned integer.', link: `${SPEC}#Numeric_types` },
  uint64: { kind: 'type', summary: '64-bit unsigned integer.', link: `${SPEC}#Numeric_types` },
  uintptr: { kind: 'type', summary: 'An unsigned integer big enough to hold a pointer value. Low-level use only.', link: `${SPEC}#Numeric_types` },
  complex64: { kind: 'type', summary: 'Complex number with float32 parts.', link: `${SPEC}#Numeric_types` },
  complex128: { kind: 'type', summary: 'Complex number with float64 parts.', link: `${SPEC}#Numeric_types` },
};

const FUNCTION_SCOPES = new Set(['function_declaration', 'method_declaration', 'func_literal']);
const LOOPS = new Set(['for_statement']);
const BREAKABLE = new Set(['for_statement', 'expression_switch_statement', 'type_switch_statement', 'select_statement']);

function labelled(name: string, from: Node): Node | undefined {
  const fn = ancestor(from, (n) => FUNCTION_SCOPES.has(n.type));
  if (!fn) return undefined;
  for (const l of fn.descendantsOfType('labeled_statement')) {
    if (l && l.childForFieldName('label')?.text === name) return l;
  }
  return undefined;
}

function role(node: Node, field: string | null): Role | undefined {
  const parent = node.parent;
  if (!parent) return undefined;
  const name = `\`${node.text}\``;
  switch (`${parent.type}.${field ?? ''}`) {
    case 'package_clause.':
      return { title: 'Package name', summary: `This file belongs to package ${name}.` };
    case 'import_spec.name':
      return { title: 'Import alias', summary: `The imported package is referred to as ${name} in this file.` };
    case 'function_declaration.name':
      return { title: 'Function name', summary: `Declares the function ${name}. ${exported(node.text)}`, scope: parent };
    case 'method_declaration.name': {
      const recv = parent.childForFieldName('receiver')?.text ?? '';
      return { title: 'Method name', summary: `Declares the method ${name} on receiver \`${recv}\`. ${exported(node.text)}`, scope: parent };
    }
    case 'type_spec.name':
    case 'type_alias.name':
      return { title: 'Type name', summary: `Declares the type ${name}. ${exported(node.text)}`, scope: parent };
    case 'field_declaration.name':
      return { title: 'Struct field', summary: `Declares the field ${name}. ${exported(node.text)}`, scope: parent };
    case 'method_elem.name':
      return { title: 'Interface method', summary: `Types must have a method ${name} with this signature to satisfy the interface.`, scope: parent };
    case 'parameter_declaration.name':
    case 'variadic_parameter_declaration.name': {
      const isReceiver = parent.parent?.parent?.type === 'method_declaration' && fieldOf(parent.parent) === 'receiver';
      return isReceiver
        ? { title: 'Receiver', summary: `${name} is the value the method is called on (like \`this\`/\`self\` in other languages).`, scope: parent.parent!.parent! }
        : { title: 'Parameter', summary: `${name} is a parameter: a local variable set by the caller.`, scope: parent };
    }
    case 'type_parameter_declaration.name':
      return { title: 'Type parameter', summary: `${name} is a generic type placeholder, filled in by the caller.`, scope: parent };
    case 'var_spec.name':
      return { title: 'Variable', summary: `Declares the variable ${name}.`, scope: parent };
    case 'const_spec.name':
      return { title: 'Constant', summary: `Declares the constant ${name}.`, scope: parent };
    case 'labeled_statement.label':
      return { title: 'Label', summary: `${name} names the statement after it, so \`break\`/\`continue\`/\`goto\` can target it.`, scope: parent };
    case 'break_statement.':
    case 'continue_statement.':
    case 'goto_statement.': {
      const target = labelled(node.text, node);
      return { title: 'Label reference', summary: `Refers to the statement labelled ${name}.`, scope: target };
    }
  }
  if (parent.type === 'expression_list' && parent.parent?.type === 'short_var_declaration' && fieldOf(parent) === 'left') {
    return { title: 'Variable', summary: `\`:=\` declares ${name} here (or reassigns it if it already exists in this scope).` };
  }
  return undefined;
}

function exported(name: string): string {
  return /^\p{Lu}/u.test(name)
    ? 'Starts with a capital letter, so it is **exported** (usable from other packages).'
    : 'Starts with a lowercase letter, so it is **unexported** (private to this package).';
}

export const go: LanguageSpec = {
  comments: goComments,
  id: 'go',
  languageIds: ['go'],
  displayName: 'Go',
  wasm: 'tree-sitter-go.wasm',
  fence: 'go',
  docs,
  identifierTypes: new Set(['identifier', 'type_identifier', 'field_identifier', 'package_identifier', 'label_name']),
  wrapperTypes: new Set(['range_clause']),
  noScopeTokens: new Set([',', ';', '.', '"', '`', ':', '=']),
  role,
  jumpTarget(token) {
    const parent = token.parent;
    switch (token.type) {
      case 'return':
      case 'defer': {
        const fn = ancestor(token, (n) => FUNCTION_SCOPES.has(n.type));
        return fn && { node: fn, verb: token.type === 'return' ? 'returns from' : 'runs when this returns:' };
      }
      case 'break':
      case 'continue': {
        const label = parent?.namedChildren.find((c) => c?.type === 'label_name');
        if (label) {
          const target = labelled(label.text, token);
          return target && { node: target, verb: token.type === 'break' ? 'breaks out of' : 'continues' };
        }
        const kinds = token.type === 'break' ? BREAKABLE : LOOPS;
        const target = ancestor(token, (n) => kinds.has(n.type), (n) => FUNCTION_SCOPES.has(n.type));
        return target && { node: target, verb: token.type === 'break' ? 'breaks out of' : 'continues' };
      }
      case 'goto': {
        const label = parent?.namedChildren.find((c) => c?.type === 'label_name');
        const target = label && labelled(label.text, token);
        return target ? { node: target, verb: 'jumps to' } : undefined;
      }
      case 'fallthrough': {
        const thisCase = ancestor(token, (n) => n.type === 'expression_case');
        const next = thisCase?.nextNamedSibling;
        return next ? { node: next, verb: 'continues into' } : undefined;
      }
    }
    return undefined;
  },
  promote(scope) {
    // `type Foo struct{...}` → include the `type` keyword when it's the only spec.
    const p = scope.parent;
    if (p && /^(type|var|const)_declaration$/.test(p.type) && p.namedChildCount === 1) return p;
    return scope;
  },
  acceptIdentifierDoc(node, field, entry) {
    if (entry.kind === 'function') {
      // Builtin functions can only be called; avoid matching a local variable named `len`.
      return node.parent?.type === 'call_expression' && field === 'function';
    }
    if (entry.kind === 'type') return node.type === 'type_identifier';
    return node.type === 'identifier';
  },
};
