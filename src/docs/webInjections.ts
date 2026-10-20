import type { Node, Range, Tree } from 'web-tree-sitter';
import { type Injection, rangeOf } from '../core/embedded';

/**
 * Which parts of an HTML or Vue document are in another language (see
 * src/core/embedded.ts): `<script>` and `<style>` contents, event handler
 * attributes, and in Vue templates the `{{ }}` interpolations and the values of
 * directives (`v-if="..."`, `:prop="..."`, `@click="..."`).
 */

const attributes = (element: Node): Map<string, string> => {
  const out = new Map<string, string>();
  const start = element.namedChildren.find((c) => c?.type === 'start_tag');
  for (const attr of start?.namedChildren ?? []) {
    if (attr?.type !== 'attribute') continue;
    const name = attr.namedChildren.find((c) => c?.type === 'attribute_name')?.text.toLowerCase();
    const value = attr.namedChildren.find((c) => c?.type === 'quoted_attribute_value' || c?.type === 'attribute_value');
    if (name) out.set(name, (value?.text ?? '').replace(/^["']|["']$/g, '').trim().toLowerCase());
  }
  return out;
};

/** The language of a `<script>` from its `lang` (Vue) or `type` (HTML) attribute, or undefined for data blocks (JSON, templates). */
export function scriptLanguage(element: Node, fallback = 'javascript'): string | undefined {
  const attrs = attributes(element);
  const lang = attrs.get('lang');
  if (lang !== undefined) return lang === 'ts' ? 'typescript' : lang === 'tsx' ? 'tsx' : /^(js|jsx|javascript)$/.test(lang) ? 'javascript' : undefined;
  const type = attrs.get('type');
  if (type === undefined || type === '' || type === 'module' || /^(text|application)\/(javascript|ecmascript)$/.test(type)) return fallback;
  return /typescript/.test(type) ? 'typescript' : undefined;
}

/** `<style>` is CSS unless it says otherwise (`lang="scss"`, `lang="less"`: no grammar for those). */
function styleLanguage(element: Node): string | undefined {
  const lang = attributes(element).get('lang');
  return lang === undefined || lang === 'css' ? 'css' : undefined;
}

/** The text of `<script>` and `<style>` elements, in their languages. */
export function blockInjections(tree: Tree, scriptFallback = 'javascript'): Injection[] {
  const out: Injection[] = [];
  for (const element of tree.rootNode.descendantsOfType(['script_element', 'style_element'])) {
    if (!element) continue;
    const raw = element.namedChildren.find((c) => c?.type === 'raw_text');
    const language = element.type === 'script_element' ? scriptLanguage(element, scriptFallback) : styleLanguage(element);
    if (raw && language) out.push({ language, ranges: [rangeOf(raw)] });
  }
  return out;
}

/**
 * The part of `node`'s text from `from` to `to` (offsets into `node.text`, which
 * are UTF-16 code units like the tree's indices) as a range in document coordinates.
 */
export function subRange(node: Node, from: number, to: number): Range {
  const at = (offset: number) => {
    const before = node.text.slice(0, offset);
    const lines = before.split('\n');
    return lines.length === 1
      ? { row: node.startPosition.row, column: node.startPosition.column + offset }
      : { row: node.startPosition.row + lines.length - 1, column: lines.at(-1)!.length };
  };
  return { startIndex: node.startIndex + from, endIndex: node.startIndex + to, startPosition: at(from), endPosition: at(to) };
}

/** The value of an attribute without its quotes, as a range; undefined when empty. */
function valueRange(attr: Node): Range | undefined {
  const quoted = attr.namedChildren.find((c) => c?.type === 'quoted_attribute_value');
  const value = quoted ? quoted.namedChildren.find((c) => c?.type === 'attribute_value') : attr.namedChildren.find((c) => c?.type === 'attribute_value');
  return value && value.text.trim() ? rangeOf(value) : undefined;
}

/** `onclick="..."` and the other event handler attributes: JavaScript. */
export function eventHandlerInjections(tree: Tree): Injection[] {
  const out: Injection[] = [];
  for (const attr of tree.rootNode.descendantsOfType('attribute')) {
    const name = attr?.namedChildren.find((c) => c?.type === 'attribute_name')?.text.toLowerCase();
    const range = attr && name && /^on[a-z]+$/.test(name) ? valueRange(attr) : undefined;
    if (range) out.push({ language: 'javascript', ranges: [range] });
  }
  return out;
}

/** Vue directive attributes: `v-...`, and the shorthands `:` (v-bind), `@` (v-on), `#` (v-slot). */
export const VUE_DIRECTIVE = /^(v-[a-z-]+|[:@#.])/;

/**
 * Vue template expressions: every `{{ }}` and every directive value is parsed on
 * its own, in the component's script language. `v-for="item in items"` only
 * has its source (`items`) parsed; slot props (`v-slot="{ item }"`, `#row="{ item }"`)
 * are patterns, not expressions, and are left to the template's explanation.
 */
export function vueTemplateInjections(tree: Tree, language: string): Injection[] {
  const out: Injection[] = [];
  const template = tree.rootNode.namedChildren.find((c) => c?.type === 'element' && c.namedChildren[0]?.namedChildren[0]?.text === 'template');
  if (!template) return out;
  for (const text of template.descendantsOfType('text')) {
    if (!text) continue;
    for (const m of text.text.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
      const from = m.index! + 2;
      if (m[1].trim()) out.push({ language, ranges: [subRange(text, from, from + m[1].length)] });
    }
  }
  for (const attr of template.descendantsOfType('attribute')) {
    const name = attr?.namedChildren.find((c) => c?.type === 'attribute_name')?.text;
    if (!attr || !name || !VUE_DIRECTIVE.test(name) || /^(v-slot|#)/.test(name)) continue;
    const range = valueRange(attr);
    if (!range) continue;
    if (name.startsWith('v-for')) {
      // `(item, index) in items`: only the source after `in`/`of` is an expression.
      const value = attr.descendantsOfType('attribute_value')[0];
      const m = value?.text.match(/^([\s\S]*?\s)(in|of)\s+/);
      if (value && m) out.push({ language, ranges: [subRange(value, m[0].length, value.text.length)] });
      continue;
    }
    out.push({ language, ranges: [range] });
  }
  return out;
}
