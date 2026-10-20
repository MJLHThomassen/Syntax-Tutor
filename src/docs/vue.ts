import type { Node, Tree } from 'web-tree-sitter';
import type { DocEntry, LanguageSpec } from '../core/model';
import { HTML_ATTRIBUTES, HTML_ELEMENTS, makeHtmlSpec } from './html';
import {
  VUE_BLOCK_ATTRIBUTES,
  VUE_BLOCKS,
  VUE_BUILT_IN_ELEMENTS,
  VUE_DIRECTIVES,
  VUE_INTERPOLATION,
  VUE_MODIFIERS,
  VUE_SHORTHANDS,
  VUE_SPECIAL_ATTRIBUTES,
} from './vueDocs';
import { blockInjections, scriptLanguage, vueTemplateInjections } from './webInjections';

/**
 * Vue single-file components (`.vue`): HTML (see html.ts) for the `<template>`,
 * plus Vue's directives, components and `{{ }}`; JavaScript or TypeScript for
 * the `<script>` and for the expressions in the template; CSS for the `<style>`.
 * The other languages are embedded parts (src/core/embedded.ts).
 */

const API = 'https://vuejs.org/api/';
const code = (text: string) => `\`${text}\``;

/** `MyButton` and `my-button` are the same component; built-ins are matched in kebab-case. */
const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** Whether an element sits at the top of the file: a `<template>`, `<script>` or `<style>` block. */
const isTopLevel = (element: Node) => element.parent?.type === 'document';

/** The element node an attribute belongs to. */
const elementOfAttribute = (attr: Node) => attr.parent?.parent ?? undefined;

/** The component's script language: TypeScript if a `<script lang="ts">` is there. */
function scriptLanguageOf(tree: Tree): string {
  for (const script of tree.rootNode.descendantsOfType('script_element')) {
    const lang = script && isTopLevel(script) ? scriptLanguage(script) : undefined;
    if (lang === 'typescript' || lang === 'tsx') return 'typescript';
  }
  return 'javascript';
}

interface ParsedDirective {
  /** `v-bind`, `v-on`, ... */
  name: string;
  /** The argument: an attribute or prop (`href`), an event (`click`), a slot (`header`). */
  arg?: string;
  /** `[attr]`: the argument is itself an expression. */
  dynamic: boolean;
  modifiers: string[];
  /** Written with `:`, `@`, `#` or `.`. */
  shorthand?: string;
}

/** `v-on:click.prevent`, `@click.prevent`, `:href`, `#header`, `v-model.trim`. */
function parseDirective(written: string): ParsedDirective | undefined {
  const full = written.match(/^(v-[a-z][a-z0-9-]*)(?::(\[[^\]]*\]|[^.]+))?((?:\.[^.]+)*)$/i);
  const short = written.match(/^([:@#.])(\[[^\]]*\]|[^.]*)((?:\.[^.]+)*)$/);
  const m = full ?? short;
  if (!m) return undefined;
  const arg = m[2] || undefined;
  return {
    name: full ? m[1].toLowerCase() : VUE_SHORTHANDS[m[1]],
    arg: arg?.replace(/^\[|\]$/g, ''),
    dynamic: !!arg?.startsWith('['),
    modifiers: (m[3] ?? '').split('.').filter(Boolean),
    shorthand: full ? undefined : m[1],
  };
}

/** What a directive does with its argument, e.g. "Here it binds the `href` attribute". */
function argumentNote(d: ParsedDirective, element: string): string | undefined {
  if (!d.arg) return undefined;
  const arg = d.dynamic ? `the one named by the expression ${code(d.arg)}` : code(d.arg);
  switch (d.name) {
    case 'v-bind': {
      const html = !d.dynamic && (HTML_ATTRIBUTES[`${element}/${d.arg}`] ?? HTML_ATTRIBUTES[d.arg]);
      const special = !d.dynamic && VUE_SPECIAL_ATTRIBUTES[d.arg];
      const what = special ? special.summary : html ? `The HTML attribute: ${html.summary}` : `(On a component: the prop ${arg}.)`;
      return `**Here** it sets the attribute or prop ${arg} to the value of the expression. ${what}`;
    }
    case 'v-on':
      return `**Here** it listens to the ${arg} event.`;
    case 'v-slot':
      return `**Here** it fills the slot ${arg}${d.arg === 'default' ? ' (the default slot: content without a name)' : ''}.`;
    case 'v-model':
      return `**Here** it binds the component's ${arg} prop (and its \`update:${d.arg}\` event).`;
    default:
      return `Argument: ${arg}.`;
  }
}

function directiveDoc(written: string, element: string): DocEntry | undefined {
  const d = parseDirective(written);
  if (!d) return undefined;
  const base = VUE_DIRECTIVES[d.name];
  const shorthand = d.shorthand ? `${code(d.shorthand)} is short for ${code(`${d.name}:`)}${d.shorthand === '.' ? ' with the `.prop` modifier' : ''}.` : undefined;
  const modifiers = d.modifiers.length
    ? `Modifiers: ${d.modifiers.map((m) => `${code(`.${m}`)} ${VUE_MODIFIERS[m] ?? '(a custom modifier)'}`).join('; ')}.`
    : undefined;
  if (!base) {
    // `v-focus`, `v-tooltip`: a custom directive registered by the app or a library.
    return {
      kind: 'syntax',
      language: 'Vue',
      label: 'custom directive',
      title: written,
      summary: `A **custom directive**: ${code(d.name)} is not built into Vue, but registered by the app or a library (\`app.directive('${d.name.slice(2)}', ...)\`, or a \`vFocus\`-style variable in \`<script setup>\`). It gets low-level access to the element.`,
      details: [argumentNote(d, element), modifiers].filter(Boolean).join('\n\n') || undefined,
      link: 'https://vuejs.org/guide/reusability/custom-directives.html',
    };
  }
  return {
    ...base,
    label: 'directive',
    title: written,
    details: [shorthand, argumentNote(d, element), modifiers, base.details].filter(Boolean).join('\n\n') || undefined,
  };
}

/** A component used in the template: `<MyButton>`, `<user-card>`. */
function componentDoc(tagName: string): DocEntry {
  return {
    kind: 'type',
    language: 'Vue',
    label: 'component',
    title: `<${tagName}>`,
    summary: `A **component**: ${code(tagName)} is another Vue component (imported in \`<script setup>\`, or registered globally), not an HTML element. Its attributes are its **props**, \`@\` listens to its **events**, and the content between its tags fills its **slots**.`,
    details: '`<MyButton>` and `<my-button>` refer to the same component. In `<script setup>`, an imported component can be used in the template directly.',
    example: "<script setup>\nimport MyButton from './MyButton.vue'\n</script>\n<template>\n  <MyButton :disabled=\"busy\" @click=\"save\">Save</MyButton>\n</template>",
    link: 'https://vuejs.org/guide/essentials/component-basics.html',
  };
}

function elementDoc(tagName: string, element: Node): DocEntry | undefined {
  const name = tagName.toLowerCase();
  if (isTopLevel(element) && VUE_BLOCKS[name]) return { ...VUE_BLOCKS[name], label: 'single-file component block', title: `<${name}>` };
  if (name === 'template') {
    return {
      ...VUE_BLOCKS.template,
      label: 'element',
      title: '<template>',
      summary: 'An invisible wrapper inside a template: it groups elements for a `v-if`, `v-for` or `#slot` without adding an element to the page.',
      details: undefined,
      example: '<template v-if="loggedIn">\n  <h1>Welcome</h1>\n  <p>…</p>\n</template>',
    };
  }
  const builtIn = VUE_BUILT_IN_ELEMENTS[kebab(tagName)];
  if (builtIn) return { ...builtIn, label: 'built-in component', title: `<${tagName}>` };
  // PascalCase, or a dash that isn't an HTML element: a component.
  if (/^[A-Z]/.test(tagName) || (tagName.includes('-') && !HTML_ELEMENTS[name])) return componentDoc(tagName);
  return undefined;
}

function attributeDoc(name: string, element: string, attr: Node): DocEntry | undefined {
  const owner = elementOfAttribute(attr);
  if (owner && isTopLevel(owner) && VUE_BLOCK_ATTRIBUTES[name]) return { ...VUE_BLOCK_ATTRIBUTES[name], label: 'attribute', title: name };
  if (VUE_SPECIAL_ATTRIBUTES[name]) return { ...VUE_SPECIAL_ATTRIBUTES[name], label: 'special attribute', title: name };
  return /^(v-|[:@#.])/.test(name) ? directiveDoc(name, element) : undefined;
}

/** The values of `v-for` and slot props are patterns, not plain expressions: explain their parts. */
function attributeValueDoc(value: string, attribute: string): DocEntry | undefined {
  if (/^v-for\b/.test(attribute)) {
    const m = value.match(/^\(?\s*([^,)]+?)\s*(?:,\s*([^,)]+?)\s*)?(?:,\s*([^,)]+?)\s*)?\)?\s+(in|of)\s+([\s\S]+)$/);
    if (!m) return undefined;
    const [, item, second, third, , source] = m;
    const parts = [`${code(item)} is the current item`];
    if (second) parts.push(`${code(second)} its ${third ? 'key' : 'index (or, for an object, its key)'}`);
    if (third) parts.push(`${code(third)} its index`);
    return {
      kind: 'syntax',
      language: 'Vue',
      label: 'v-for expression',
      title: value,
      summary: `Repeats the element for each item of ${code(source.trim())}: ${parts.join(', ')}.`,
      details: 'A number works too: `v-for="n in 5"` counts 1 to 5. Give each repeated element a unique `:key`.',
      link: `${API}built-in-directives.html#v-for`,
    };
  }
  if (/^(v-slot|#)/.test(attribute)) {
    return {
      kind: 'syntax',
      language: 'Vue',
      label: 'slot props',
      title: value,
      summary: `The **slot props**: values the child component passes to this slot, usually unpacked with \`{ }\`, so ${code(value)} makes them available inside this slot's content.`,
      example: '<MyList :items="todos">\n  <template #item="{ item, index }">{{ index }}: {{ item.text }}</template>\n</MyList>',
      link: 'https://vuejs.org/guide/components/slots.html#scoped-slots',
    };
  }
  return undefined;
}

/** `{{ }}` in template text. The expression inside is explained by the script's language. */
function docFor(token: Node): DocEntry | undefined {
  return token.type === 'text' && /\{\{[\s\S]*?\}\}/.test(token.text) ? VUE_INTERPOLATION : undefined;
}

const base = makeHtmlSpec({
  id: 'vue',
  languageIds: ['vue'],
  displayName: 'Vue',
  wasm: 'tree-sitter-html.wasm',
  elementDoc,
  attributeDoc,
  attributeValueDoc,
  docFor,
});

/** HTML's own explanations name HTML in their heading ("`<div>` · HTML element"); Vue's say Vue. */
const asHtml = (entry: DocEntry | undefined): DocEntry | undefined => (entry && !entry.language ? { ...entry, language: 'HTML' } : entry);

export const vue: LanguageSpec = {
  ...base,
  docs: Object.fromEntries(Object.entries(base.docs).map(([key, entry]) => [key, asHtml(entry)!])),
  docFor: base.docFor && ((token) => asHtml(base.docFor!(token))),
  literalDoc: base.literalDoc && ((literal) => asHtml(base.literalDoc!(literal))),
  // `<script>` (JavaScript or TypeScript), `<style>` (CSS), and the template's `{{ }}` and directive values.
  injections: (tree) => [...blockInjections(tree), ...vueTemplateInjections(tree, scriptLanguageOf(tree))],
  embeds: ['javascript', 'typescript', 'tsx', 'css'],
};
