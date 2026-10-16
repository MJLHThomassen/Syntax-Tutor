// Telling documentation apart from bare signatures in language-server hovers.

/**
 * Whether hover markdown has actual documentation, not just a signature: what is
 * left after removing code blocks, separators, link-only lines and signature
 * lines like "(local variable) Guid userId".
 */
export function hasDocumentation(markdown: string): boolean {
  const prose = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/gm, '')
    .replace(/^\s*(\[[^\]]*\]\([^)]*\)\s*)+$/gm, '')
    .replace(/^\s*`[^`]*`\s*$/gm, '')
    .replace(/^\s*\([a-z][a-z ]*\)\s+\S.*$/gm, '');
  return /\p{L}{2,}/u.test(prose);
}
