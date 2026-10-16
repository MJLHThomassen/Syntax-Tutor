// Bundles the extension (plus editor-free bundles for tests) with esbuild, and
// copies the tree-sitter runtime + grammar .wasm files next to it.
//
//   node scripts/build.mjs                 everything
//   node scripts/build.mjs --watch         everything, rebuilding on change
//   node scripts/build.mjs --lang c        only dist/test/lang-c.js (for working on one language)
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const watch = args.includes('--watch');
const production = args.includes('--production');
const onlyLang = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : undefined;

const wasmDir = 'dist/wasm';
mkdirSync(wasmDir, { recursive: true });
const wasmFiles = {
  'tree-sitter.wasm': join(dirname(require.resolve('web-tree-sitter')), 'tree-sitter.wasm'),
  'tree-sitter-go.wasm': require.resolve('tree-sitter-go/tree-sitter-go.wasm'),
  'tree-sitter-rust.wasm': require.resolve('tree-sitter-rust/tree-sitter-rust.wasm'),
  'tree-sitter-c.wasm': require.resolve('tree-sitter-c/tree-sitter-c.wasm'),
  'tree-sitter-cpp.wasm': require.resolve('tree-sitter-cpp/tree-sitter-cpp.wasm'),
  'tree-sitter-c_sharp.wasm': require.resolve('tree-sitter-c-sharp/tree-sitter-c_sharp.wasm'),
  'tree-sitter-javascript.wasm': require.resolve('tree-sitter-javascript/tree-sitter-javascript.wasm'),
  'tree-sitter-typescript.wasm': require.resolve('tree-sitter-typescript/tree-sitter-typescript.wasm'),
  'tree-sitter-tsx.wasm': require.resolve('tree-sitter-typescript/tree-sitter-tsx.wasm'),
};
// --lang builds skip this so parallel builds never rewrite files other tests are reading.
if (!onlyLang) for (const [name, from] of Object.entries(wasmFiles)) copyFileSync(from, join(wasmDir, name));

const common = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
  // web-tree-sitter is an ES module that uses import.meta.url; give the CJS bundle a real one.
  define: { 'import.meta.url': '__importMetaUrl' },
  banner: { js: "const __importMetaUrl = require('url').pathToFileURL(__filename).href;" },
};

const langBundle = (name) =>
  esbuild.context({ ...common, entryPoints: [`src/docs/${name}.ts`], outfile: `dist/test/lang-${name}.js` });

const contexts = await Promise.all(
  onlyLang
    ? [langBundle(onlyLang)]
    : [
        esbuild.context({ ...common, entryPoints: ['src/extension.ts'], outfile: 'dist/extension.js', external: ['vscode'] }),
        esbuild.context({ ...common, entryPoints: ['src/core/index.ts'], outfile: 'dist/test/core.js' }),
        ...readdirSync('src/docs').filter((f) => f.endsWith('.ts')).map((f) => langBundle(f.slice(0, -3))),
      ],
);

if (watch) {
  await Promise.all(contexts.map((c) => c.watch()));
} else {
  await Promise.all(contexts.map((c) => c.rebuild()));
  await Promise.all(contexts.map((c) => c.dispose()));
}
