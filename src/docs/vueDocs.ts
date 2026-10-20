import type { DocEntry } from '../core/model';

/**
 * Explanations of Vue's own syntax in single-file components: the directives
 * (`v-if`, `:prop`, `@event`, ...), their modifiers, special attributes, the
 * built-in components and the `<template>`/`<script>`/`<style>` blocks.
 */

const API = 'https://vuejs.org/api/';
const GUIDE = 'https://vuejs.org/guide/';

const directive = (summary: string, example: string, link: string, details?: string): DocEntry => ({
  kind: 'syntax',
  language: 'Vue',
  summary,
  example,
  link,
  ...(details ? { details } : {}),
});

/** Directives by full name (`v-bind`); shorthands map to these in `vueAttributeDoc`. */
export const VUE_DIRECTIVES: Record<string, DocEntry> = {
  'v-if': directive(
    'Renders the element only when the expression is truthy. When it becomes falsy, the element is removed from the page (not just hidden).',
    '<p v-if="items.length">You have {{ items.length }} items.</p>\n<p v-else>Your cart is empty.</p>',
    `${API}built-in-directives.html#v-if`,
    'Follow it with `v-else-if` / `v-else` on the next sibling elements for the other cases. To toggle visibility often, `v-show` is cheaper.',
  ),
  'v-else-if': directive(
    'The "else if" branch of a `v-if`: rendered when the previous `v-if`/`v-else-if` was falsy and this expression is truthy. Must come right after a `v-if` or `v-else-if` element.',
    '<p v-if="score > 90">Great</p>\n<p v-else-if="score > 50">Fine</p>\n<p v-else>Keep going</p>',
    `${API}built-in-directives.html#v-else-if`,
  ),
  'v-else': directive(
    'The "else" branch of a `v-if`: rendered when the previous `v-if`/`v-else-if` conditions were all falsy. Takes no value, and must come right after them.',
    '<button v-if="loggedIn">Log out</button>\n<button v-else>Log in</button>',
    `${API}built-in-directives.html#v-else`,
  ),
  'v-show': directive(
    'Shows or hides the element with CSS (`display: none`) depending on the expression. Unlike `v-if`, the element always stays in the page.',
    '<div v-show="menuOpen" class="menu">...</div>',
    `${API}built-in-directives.html#v-show`,
    'Use `v-show` for things that toggle often; `v-if` when the condition rarely changes or the content is expensive.',
  ),
  'v-for': directive(
    'Renders the element once for each item of a list (or each property of an object, or each number up to n). Written `item in items`, `(item, index) in items`, or `(value, key, index) in object`.',
    '<li v-for="(todo, i) in todos" :key="todo.id">{{ i + 1 }}. {{ todo.text }}</li>',
    `${API}built-in-directives.html#v-for`,
    'Give each item a unique `:key`, so Vue can keep track of which element belongs to which item when the list changes.',
  ),
  'v-on': directive(
    'Listens to an event (shorthand `@`): runs the code or calls the method when the event fires. Modifiers like `.prevent` or `.enter` change how it listens.',
    '<button v-on:click="count++">+1</button>\n<form @submit.prevent="save">...</form>',
    `${API}built-in-directives.html#v-on`,
    'The value can be a method name (`@click="save"`), a call (`@click="save(item)"`) or a statement (`@click="count++"`). Inside, `$event` is the event object.',
  ),
  'v-bind': directive(
    'Binds an attribute or component prop to a JavaScript expression (shorthand `:`), so it updates when the data changes. Without `:`, the attribute is plain text.',
    '<img :src="user.avatar" :alt="user.name">\n<div :class="{ active: isActive }" :style="{ color }"></div>',
    `${API}built-in-directives.html#v-bind`,
    '`:class` and `:style` also accept objects and arrays. `v-bind="obj"` without a name binds every property of `obj` as an attribute.',
  ),
  'v-model': directive(
    'Two-way binding: the form field shows the value, and typing (or checking, selecting) writes it back. On a component, it binds its `modelValue` prop and `update:modelValue` event.',
    '<input v-model="name">\n<input type="checkbox" v-model="agreed">\n<input v-model.number="age">',
    `${API}built-in-directives.html#v-model`,
    'Modifiers: `.lazy` (update on change instead of every keystroke), `.number` (convert to a number), `.trim` (strip whitespace).',
  ),
  'v-slot': directive(
    'Fills a named slot of the child component (shorthand `#`), and can receive the slot props the child passes as a pattern: `#item="{ item }"`. Used on a `<template>` or on the component itself.',
    '<MyList :items="todos">\n  <template #item="{ item }">{{ item.text }}</template>\n</MyList>',
    `${API}built-in-directives.html#v-slot`,
  ),
  'v-html': directive(
    "Sets the element's inner HTML to the expression's value. **Only use it with trusted content**: user-provided HTML can run scripts (XSS).",
    '<div v-html="renderedMarkdown"></div>',
    `${API}built-in-directives.html#v-html`,
  ),
  'v-text': directive(
    "Sets the element's text to the expression's value, like `{{ }}` for the whole content.",
    '<span v-text="message"></span>',
    `${API}built-in-directives.html#v-text`,
  ),
  'v-once': directive('Renders the element and its children only once; later data changes are ignored for it. A small performance optimisation for static content.', '<h1 v-once>{{ title }}</h1>', `${API}built-in-directives.html#v-once`),
  'v-memo': directive('Re-renders the element only when one of the listed values changes. A performance optimisation for big lists.', '<div v-for="item in list" :key="item.id" v-memo="[item.id === selected]">...</div>', `${API}built-in-directives.html#v-memo`),
  'v-pre': directive('Skips compiling this element and its children: `{{ }}` and directives inside are shown as plain text.', '<span v-pre>{{ this is not evaluated }}</span>', `${API}built-in-directives.html#v-pre`),
  'v-cloak': directive('Stays on the element until the component is ready, so CSS like `[v-cloak] { display: none }` can hide un-compiled `{{ }}` templates. Only needed without a build step.', '<div v-cloak>{{ message }}</div>', `${API}built-in-directives.html#v-cloak`),
};

/** What the shorthand characters stand for. */
export const VUE_SHORTHANDS: Record<string, string> = { ':': 'v-bind', '@': 'v-on', '#': 'v-slot', '.': 'v-bind' };

/** Modifiers after a directive name (`@submit.prevent`, `v-model.trim`). */
export const VUE_MODIFIERS: Record<string, string> = {
  prevent: 'calls `event.preventDefault()` (e.g. a form submit doesn\'t reload the page)',
  stop: 'calls `event.stopPropagation()`: the event doesn\'t reach parent elements',
  once: 'listens only for the first event',
  self: 'only reacts when the event happened on this element itself, not a child',
  capture: 'listens in the capture phase (before children get the event)',
  passive: 'tells the browser the handler won\'t call `preventDefault()` (smoother scrolling)',
  enter: 'only for the Enter key',
  tab: 'only for the Tab key',
  delete: 'only for the Delete or Backspace key',
  esc: 'only for the Escape key',
  space: 'only for the space bar',
  up: 'only for the arrow-up key',
  down: 'only for the arrow-down key',
  left: 'only for the arrow-left key (or the left mouse button)',
  right: 'only for the arrow-right key (or the right mouse button)',
  middle: 'only for the middle mouse button',
  ctrl: 'only while Ctrl is held',
  alt: 'only while Alt is held',
  shift: 'only while Shift is held',
  meta: 'only while the Cmd/Windows key is held',
  exact: 'only when exactly these modifier keys are held',
  lazy: 'updates on `change` instead of every keystroke',
  number: 'converts the value to a number',
  trim: 'strips whitespace from both ends',
  prop: 'sets a DOM property instead of an attribute',
  attr: 'sets an attribute instead of a DOM property',
  camel: 'turns the kebab-case attribute name into camelCase',
};

/** Attributes with a special meaning in Vue templates. */
export const VUE_SPECIAL_ATTRIBUTES: Record<string, DocEntry> = {
  key: directive(
    "A unique identity for an element in a `v-for` list (usually bound: `:key=\"item.id\"`), so Vue can reuse and reorder the right elements when the list changes. Changing an element's key replaces it.",
    '<li v-for="todo in todos" :key="todo.id">{{ todo.text }}</li>',
    `${API}built-in-special-attributes.html#key`,
  ),
  ref: directive(
    'Gives the script access to this element or component: with `<script setup>`, a `ref` variable of the same name (`const input = ref(null)`) holds it after mounting.',
    '<input ref="input">\n<!-- script setup: const input = ref(null); onMounted(() => input.value.focus()) -->',
    `${API}built-in-special-attributes.html#ref`,
  ),
  is: directive('Chooses which component to render, with `<component :is="...">`.', '<component :is="tabs[current]" />', `${API}built-in-special-attributes.html#is`),
};

/** Vue's built-in components and special elements. */
export const VUE_BUILT_IN_ELEMENTS: Record<string, DocEntry> = {
  component: directive('Renders whichever component (or HTML element) its `is` attribute names: a "dynamic component".', '<component :is="currentView" />', `${API}built-in-special-elements.html#component`),
  slot: directive("A placeholder in a component's template where the parent's content goes. Named slots (`<slot name=\"header\">`) take content from the parent's `#header`.", '<button class="fancy"><slot>Default text</slot></button>', `${API}built-in-special-elements.html#slot`),
  transition: directive('Animates its single child when it is added or removed (with `v-if`/`v-show`), using CSS classes like `.v-enter-active`.', '<Transition name="fade"><p v-if="show">hi</p></Transition>', `${API}built-in-components.html#transition`),
  'transition-group': directive('Animates items being added, removed and moved in a `v-for` list.', '<TransitionGroup name="list" tag="ul"><li v-for="i in items" :key="i">{{ i }}</li></TransitionGroup>', `${API}built-in-components.html#transitiongroup`),
  'keep-alive': directive('Keeps switched-out components alive in memory (with their state) instead of destroying them.', '<KeepAlive><component :is="view" /></KeepAlive>', `${API}built-in-components.html#keepalive`),
  teleport: directive('Renders its content somewhere else in the page (e.g. `to="body"`), useful for modals and tooltips.', '<Teleport to="body"><div class="modal">...</div></Teleport>', `${API}built-in-components.html#teleport`),
  suspense: directive('Shows fallback content while async components inside it are loading (experimental).', '<Suspense><AsyncView /><template #fallback>Loading…</template></Suspense>', `${API}built-in-components.html#suspense`),
};

/** The top-level blocks of a single-file component, and the attributes on them. */
export const VUE_BLOCKS: Record<string, DocEntry> = {
  template: directive(
    "The component's HTML template: what it renders. Inside, `{{ }}` shows values, and directives (`v-if`, `:prop`, `@event`) connect the HTML to the script.",
    '<template>\n  <button @click="count++">Clicked {{ count }} times</button>\n</template>',
    `${GUIDE}scaling-up/sfc.html`,
    'Inside a template, `<template>` is also an invisible wrapper: for `v-if`/`v-for` on several elements at once, or for a `#slot`.',
  ),
  script: directive(
    "The component's JavaScript (or TypeScript with `lang=\"ts\"`). With `setup`, everything declared at the top level is available in the template directly.",
    '<script setup>\nimport { ref } from \'vue\'\nconst count = ref(0)\n</script>',
    `${API}sfc-script-setup.html`,
  ),
  style: directive(
    "The component's CSS. With `scoped`, the rules only apply to this component's elements; with `module`, class names are available as `$style.name`.",
    '<style scoped>\nbutton { color: teal; }\n</style>',
    `${API}sfc-css-features.html`,
  ),
};

/** Attributes on the top-level blocks. */
export const VUE_BLOCK_ATTRIBUTES: Record<string, DocEntry> = {
  setup: directive(
    '`<script setup>`: the recommended way to write components with the Composition API. Top-level variables, functions and imports are usable in the template, without returning them.',
    "<script setup>\nconst msg = 'hi'\n</script>\n<template>{{ msg }}</template>",
    `${API}sfc-script-setup.html`,
  ),
  lang: directive('The language of this block: `ts` for TypeScript in `<script>`, or a preprocessor like `scss` in `<style>`.', '<script setup lang="ts">', `${API}sfc-spec.html#pre-processors`),
  scoped: directive("Scoped CSS: the rules only apply to this component's own elements (Vue adds a unique attribute to them). Use `:deep(...)` to reach into child components.", '<style scoped>\n.title { font-weight: bold; }\n</style>', `${API}sfc-css-features.html#scoped-css`),
  module: directive('CSS modules: class names become unique, and the template gets them as `$style.className`.', '<style module>\n.red { color: red }\n</style>\n<p :class="$style.red">...</p>', `${API}sfc-css-features.html#css-modules`),
};

/** The `{{ }}` interpolation in template text. */
export const VUE_INTERPOLATION: DocEntry = {
  kind: 'syntax',
  language: 'Vue',
  title: '{{ }} (interpolation)',
  summary: 'Shows the value of a JavaScript expression as text, updated whenever the data it uses changes. The text is escaped: HTML in it is shown as text, not rendered.',
  example: '<p>Hello, {{ user.name }}! You have {{ items.length * 2 }} points.</p>',
  link: `${GUIDE}essentials/template-syntax.html#text-interpolation`,
};
