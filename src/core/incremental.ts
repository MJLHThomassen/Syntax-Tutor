import type { Point, Tree } from 'web-tree-sitter';

/**
 * Incremental parsing: tell tree-sitter which text changed, so the next parse
 * (given the edited old tree) only re-parses around the edits.
 *
 * Offsets and columns are UTF-16 code units, both in VS Code's change events and
 * in web-tree-sitter for JavaScript strings, so they pass through unchanged.
 */

/** One text change, in coordinates of the document before the change (like VS Code's). */
export interface TextChange {
  /** Offset where the replaced range starts. */
  rangeOffset: number;
  /** Length of the replaced range. */
  rangeLength: number;
  /** Start and end of the replaced range. */
  start: Point;
  end: Point;
  /** The new text. */
  text: string;
}

/** Where text inserted at `start` ends. */
function endOf(start: Point, text: string): Point {
  const lines = text.split(/\r\n|\r|\n/);
  return lines.length === 1
    ? { row: start.row, column: start.column + text.length }
    : { row: start.row + lines.length - 1, column: lines.at(-1)!.length };
}

/**
 * Record `changes` on `tree`. All changes refer to the same old document, so they
 * are applied from the last to the first: each edit then leaves the positions of
 * the ones still to come untouched.
 */
export function editTree(tree: Tree, changes: readonly TextChange[]): void {
  for (const c of [...changes].sort((a, b) => b.rangeOffset - a.rangeOffset)) {
    tree.edit({
      startIndex: c.rangeOffset,
      oldEndIndex: c.rangeOffset + c.rangeLength,
      newEndIndex: c.rangeOffset + c.text.length,
      startPosition: c.start,
      oldEndPosition: c.end,
      newEndPosition: endOf(c.start, c.text),
    });
  }
}
