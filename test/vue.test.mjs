// Vue single-file components (src/docs/vue.ts): the template is HTML plus Vue's
// directives, components and {{ }}; the <script> and the template's expressions
// are JavaScript or TypeScript; each part explained by its own language.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';
import { at, readWasm } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Parsers, parseEmbedded, regionAt, explain, scopeFor, explainDocumentLines, outlineFunction } = require('../dist/test/core.js');

const lang = (file, name) => require(`../dist/test/lang-${file}.js`)[name];
const vue = lang('vue', 'vue');
const EMBEDDED = [lang('javascript', 'javascript'), lang('typescript', 'typescript')];
const TOUR = readFileSync(new URL('../samples/tour.vue', import.meta.url), 'utf8');

async function component(src) {
  const specs = new Map([vue, ...EMBEDDED].map((s) => [s.id, s]));
  const parsers = await Parsers.load(readWasm, [...specs.values()]);
  const own = { spec: vue, tree: parsers.parse(vue.id, src) };
  const parts = { own, embedded: parseEmbedded(parsers, specs, vue, own.tree, src) };
  const region = (needle, offset = 0, nth = 0) => regionAt(parts.own, parts.embedded, at(src, needle, nth, offset));
  return {
    parts,
    language: (needle, offset = 0, nth = 0) => region(needle, offset, nth).spec.id,
    hover(needle, offset = 0, nth = 0) {
      const r = region(needle, offset, nth);
      return explain(r.spec, r.tree, at(src, needle, nth, offset))?.markdown ?? '';
    },
    scope(needle, offset = 0, nth = 0) {
      const r = region(needle, offset, nth);
      return scopeFor(r.spec, r.tree, at(src, needle, nth, offset), false);
    },
  };
}

describe('Vue', () => {
  test('directives: full names, shorthands, arguments and modifiers', async () => {
    const c = await component(TOUR);
    assert.match(c.hover('v-if='), /^\*\*`v-if`\*\* · Vue directive\n\nRenders the element only when/);
    const submit = c.hover('@submit.prevent');
    assert.match(submit, /^\*\*`@submit\.prevent`\*\* · Vue directive/);
    assert.match(submit, /`@` is short for `v-on:`/);
    assert.match(submit, /\*\*Here\*\* it listens to the `submit` event/);
    assert.match(submit, /`\.prevent` calls `event\.preventDefault\(\)`/);
    assert.match(c.hover('v-model.trim'), /`\.trim` strips whitespace/);
    // `:title` binds the HTML title attribute, and says what that attribute is.
    const title = c.hover(':title');
    assert.match(title, /`:` is short for `v-bind:`/);
    assert.match(title, /sets the attribute or prop `title`[\s\S]*The HTML attribute:/);
    assert.match(c.hover(':key'), /unique identity for an element in a `v-for` list/);
    assert.match(c.hover('#label'), /fills the slot `label`/);
    assert.match(c.hover('v-else-if'), /"else if" branch/);
  });

  test('elements: HTML elements, components, built-ins and the file blocks', async () => {
    const c = await component(TOUR);
    assert.match(c.hover('<section', 1), /^\*\*`<section>`\*\* · HTML element/);
    assert.match(c.hover('<TodoActions', 1), /^\*\*`<TodoActions>`\*\* · Vue component\n\nA \*\*component\*\*/);
    assert.match(c.hover('<Transition', 1), /^\*\*`<Transition>`\*\* · Vue built-in component/);
    assert.match(c.hover('<template>', 1), /^\*\*`<template>`\*\* · Vue single-file component block/);
    // A <template> inside the template is the invisible wrapper.
    assert.match(c.hover('<template #label', 1), /invisible wrapper/);
    assert.match(c.hover('script setup', 7), /^\*\*`setup`\*\* · Vue attribute/);
    assert.match(c.hover('scoped'), /Scoped CSS/);
    // A plain HTML attribute is still HTML.
    assert.match(c.hover('placeholder'), /· HTML attribute/);
  });

  test('{{ }}, v-for and slot props', async () => {
    const c = await component(TOUR);
    assert.match(c.hover('{{ heading'), /^\*\*`\{\{ \}\} \(interpolation\)`\*\* · Vue syntax/);
    assert.match(c.hover('(todo, index)', 1), /Repeats the element for each item of `todos`: `todo` is the current item, `index` its index/);
    assert.match(c.hover('{ text }', 2), /\*\*slot props\*\*/);
  });

  test('the script and the template expressions are TypeScript (lang="ts")', async () => {
    const c = await component(TOUR);
    assert.equal(c.language('function add'), 'typescript');
    assert.match(c.hover('function add'), /TypeScript keyword/);
    assert.equal(c.language('heading.toUpperCase'), 'typescript');
    assert.match(c.hover('todos.length > 0', 13), /^\*\*`> \(greater than\)`\*\* · TypeScript operator/);
    assert.match(c.hover('index + 1', 6), /TypeScript operator/);
    // v-for: only the source after `in` is an expression.
    assert.equal(c.language('in todos"', 3), 'typescript');
    assert.equal(c.language('(todo, index)', 1), 'vue');
    // The directive name and the quotes around its value stay Vue.
    assert.equal(c.language('v-if='), 'vue');
  });

  test('without lang="ts", the script and template expressions are JavaScript', async () => {
    const src = '<template>\n  <p v-if="n > 1">{{ n * 2 }}</p>\n</template>\n<script>\nexport default { data: () => ({ n: 2 }) };\n</script>\n';
    const c = await component(src);
    assert.equal(c.language('n * 2'), 'javascript');
    assert.match(c.hover('*'), /JavaScript operator/);
    assert.equal(c.language('export default'), 'javascript');
  });

  test('scopes: an element in the template, an `if` in the script', async () => {
    const c = await component(TOUR);
    const li = c.scope('<li v-for', 1);
    assert.equal(TOUR.split('\n')[li.primary.start.row].trim().startsWith('<li v-for'), true);
    assert.equal(TOUR.split('\n')[li.primary.end.row].trim(), '</li>');
    const ifScope = c.scope('if (!draft');
    assert.equal(TOUR.split('\n')[ifScope.primary.start.row].trim(), 'if (!draft.value) return;');
  });

  test('Explain This Line mixes Vue and TypeScript on a template line', async () => {
    const c = await component(TOUR);
    const row = TOUR.split('\n').findIndex((l) => l.includes('{{ index + 1 }}'));
    const line = TOUR.split('\n')[row];
    const result = explainDocumentLines(c.parts, row, row, { row, column: line.search(/\S/) });
    const texts = result.items.map((i) => i.text);
    assert.ok(texts.includes('+'), texts.join(' | '));
    const plus = result.items.find((i) => i.text === '+');
    assert.match(plus.markdown, /TypeScript operator/);
    const cols = result.items.map((i) => i.span.start.column);
    assert.deepEqual(cols, [...cols].sort((a, b) => a - b));
  });

  test('Explain This Function on a function in <script setup>', async () => {
    const c = await component(TOUR);
    const p = at(TOUR, 'if (!draft');
    const r = regionAt(c.parts.own, c.parts.embedded, p);
    const outline = outlineFunction(r.spec, r.tree, p);
    assert.equal(outline.label, 'the function `add`');
    assert.deepEqual(outline.rows.map((x) => x.text), [
      'If `!draft.value`:',
      'Returns early',
      'Calls `todos.value.push({ id: Date.now(), text: draft.va…`',
      "Sets `draft.value`: `draft.value = ''`",
    ]);
  });
});
