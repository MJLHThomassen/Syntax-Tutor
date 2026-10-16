/// <reference types="node" />

/**
 * Finds the first item matching a predicate.
 *
 * @typeParam T - The item type.
 * @param items - Where to look.
 * @param match - The test to run.
 * @returns The item, or `undefined`.
 * @example
 * find([1, 2, 3], (n) => n > 1); // 2
 */
export function find<T>(items: T[], match: (item: T) => boolean): T | undefined {
  return items.find(match);
}

// @ts-expect-error: deliberately wrong
const n: number = "nope";
