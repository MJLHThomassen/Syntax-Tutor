import type { Node, Point, Range, Tree } from 'web-tree-sitter';
import type { Options } from './analyzer';
import { explainLines, type LineExplanation, type LineItem } from './lines';
import type { LanguageSpec } from './model';
import type { Parsers } from './parser';

/**
 * Embedded languages: parts of a document written in another language, like the
 * JavaScript in an HTML `<script>`, the CSS in a `<style>`, or the expressions in
 * a Vue template. Each part is parsed with its own grammar, limited to its text
 * ranges (tree-sitter's included ranges), so its nodes keep the positions they
 * have in the document and every feature works on them unchanged: the document is
 * a set of regions, and a position is explained by the region it falls in.
 */

/** A part of a document in another language. */
export interface Injection {
  /** Spec id of the language, e.g. "javascript", "typescript", "css". */
  language: string;
  /** The text it covers, in document coordinates. Usually one range. */
  ranges: Range[];
}

/** One parsed part of a document: the document's own language, or an embedded one. */
export interface Region {
  spec: LanguageSpec;
  tree: Tree;
  /** Undefined for the document's own region, which covers everything else. */
  ranges?: Range[];
}

const before = (a: Point, b: Point) => a.row < b.row || (a.row === b.row && a.column < b.column);
const within = (p: Point, r: Range) => !before(p, r.startPosition) && before(p, r.endPosition);
const size = (r: Range) => r.endIndex - r.startIndex;

/** The text range a node covers. */
export const rangeOf = (n: Node): Range => ({
  startIndex: n.startIndex,
  endIndex: n.endIndex,
  startPosition: n.startPosition,
  endPosition: n.endPosition,
});

/**
 * Parse the embedded parts of a document whose own tree is `tree`. Parts in a
 * language whose grammar isn't loaded yet are skipped (see `missingLanguages`).
 */
export function parseEmbedded(parsers: Parsers, specs: ReadonlyMap<string, LanguageSpec>, spec: LanguageSpec, tree: Tree, text: string): Region[] {
  const regions: Region[] = [];
  for (const injection of spec.injections?.(tree) ?? []) {
    const embedded = specs.get(injection.language);
    if (!embedded || !injection.ranges.length || !parsers.has(embedded.id)) continue;
    const sub = parsers.parse(embedded.id, text, undefined, injection.ranges);
    if (sub) regions.push({ spec: embedded, tree: sub, ranges: injection.ranges });
  }
  return regions;
}

/** Languages a document's spec may embed whose grammars aren't loaded yet. */
export function missingLanguages(parsers: Parsers, spec: LanguageSpec): string[] {
  return (spec.embeds ?? []).filter((id) => !parsers.has(id));
}

/** A document's parsed parts: its own language, and the languages embedded in it. */
export interface DocumentParts {
  own: Region;
  embedded: readonly Region[];
}

/**
 * Explain This Line across languages: the parts of the lines from every region
 * on them, in reading order, each explained by its own language. The opening
 * sentence comes from the region at `first` (the line's first character).
 */
export function explainDocumentLines(parts: DocumentParts, startRow: number, endRow: number, first: Point, options: Options = {}): LineExplanation {
  const { own, embedded } = parts;
  const onLines = embedded.filter((r) => r.ranges?.some((g) => g.startPosition.row <= endRow && g.endPosition.row >= startRow));
  const main = regionAt(own, embedded, first);
  if (!onLines.length) return explainLines(main.spec, main.tree, startRow, endRow, options);
  const embeddedAt = (p: Point) => onLines.some((r) => r.ranges!.some((g) => within(p, g)));
  const explained = new Map<Region, LineExplanation>();
  const items: LineItem[] = [];
  for (const region of [own, ...onLines]) {
    const result = explainLines(region.spec, region.tree, startRow, endRow, options);
    explained.set(region, result);
    // The document's own language doesn't explain what an embedded one covers (a `<script>`'s text).
    items.push(...(region === own ? result.items.filter((i) => !embeddedAt(i.span.start)) : result.items));
  }
  items.sort((a, b) => (before(a.span.start, b.span.start) ? -1 : before(b.span.start, a.span.start) ? 1 : 0));
  return { structure: explained.get(main)?.structure, items };
}

/**
 * The region that explains `point`: the smallest embedded part containing it (a
 * template expression inside a `<template>`), else the document's own region.
 */
export function regionAt(own: Region, embedded: readonly Region[], point: Point): Region {
  let best: Region | undefined;
  let bestSize = Infinity;
  for (const region of embedded) {
    for (const range of region.ranges ?? []) {
      if (within(point, range) && size(range) < bestSize) {
        best = region;
        bestSize = size(range);
      }
    }
  }
  return best ?? own;
}
