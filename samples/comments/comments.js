// @ts-check

/**
 * Greets someone.
 * @param {string} name - Who to greet.
 * @param {number} [times=1] - How often.
 * @returns {string} The greeting. See {@link shout}.
 * @deprecated Use {@link shout} instead.
 */
export function greet(name, times = 1) {
  return `hello ${name}`.repeat(times); // trailing comment
}

/** @type {Map<string, number>} */
const counts = new Map();

// eslint-disable-next-line no-console
console.log(counts);

/* TODO: i18n */
export const shout = (s) => s.toUpperCase();
