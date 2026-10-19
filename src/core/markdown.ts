/** Markdown inline code that survives backticks inside the text. */
export function codeSpan(text: string): string {
  if (!text.includes('`')) return `\`${text}\``;
  const fence = '`'.repeat(Math.max(...(text.match(/`+/g) ?? ['']).map((r) => r.length)) + 1);
  return `${fence} ${text} ${fence}`;
}
