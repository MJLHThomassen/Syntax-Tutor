// Which language-server hovers count as documentation (src/core/hoverDocs.ts):
// a bare signature adds nothing to the Explain panel, a doc string does.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';

const require = createRequire(import.meta.url);
const { hasDocumentation } = require('../dist/test/core.js');

describe('hasDocumentation', () => {
  test('bare signatures are not documentation', () => {
    for (const md of [
      '```csharp\n(local variable) Guid userId\n```', // C#
      '(local variable) Guid userId', // the same without a code block
      '```typescript\n(property) Shape.name: string\n```', // TypeScript
      '```go\nvar total int\n```', // gopls
      '```go\nfunc divide(a int, b int) (int, error)\n```\n\n---\n\n[`main.divide` on pkg.go.dev](https://pkg.go.dev/main#divide)', // gopls: signature + link
      '```rust\nlet n: i32\n```', // rust-analyzer local
      '`int count`', // a lone inline signature
    ]) {
      assert.equal(hasDocumentation(md), false, md);
    }
  });

  test('a doc string is documentation, with or without a signature', () => {
    for (const md of [
      '```typescript\n(method) Array<T>.find(predicate: ...): T | undefined\n```\n\nReturns the value of the first element in the array where predicate is true.',
      '```go\nfunc Println(a ...any) (n int, err error)\n```\n\nPrintln formats using the default formats for its operands and writes to standard output.',
      '```rust\nstd::vec::Vec\n```\n\n```rust\npub fn push(&mut self, value: T)\n```\n\n---\n\nAppends an element to the back of a collection.',
      '```csharp\nGuid Guid.NewGuid()\n```\n\nInitializes a new instance of the Guid structure.',
      'Gets the number of elements.',
    ]) {
      assert.equal(hasDocumentation(md), true, md);
    }
  });
});
