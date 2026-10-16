import type { Node } from 'web-tree-sitter';

/** Nearest ancestor (excluding `node`) matching `match`; gives up at a node matching `stop`. */
export function ancestor(
  node: Node,
  match: (n: Node) => boolean,
  stop?: (n: Node) => boolean,
): Node | undefined {
  for (let n = node.parent; n; n = n.parent) {
    if (match(n)) return n;
    if (stop?.(n)) return undefined;
  }
  return undefined;
}

/** The field name `node` has in its parent (e.g. "name", "body"), if any. */
export function fieldOf(node: Node): string | null {
  const parent = node.parent;
  if (!parent) return null;
  for (let i = 0; i < parent.childCount; i++) {
    if (parent.child(i)?.id === node.id) return parent.fieldNameForChild(i);
  }
  return null;
}

export function lastLeaf(node: Node): Node {
  let n = node;
  while (n.childCount > 0) n = n.child(n.childCount - 1)!;
  return n;
}

/** First line of a node's source, trimmed, for short "here: ..." notes. */
export function firstLine(node: Node, max = 60): string {
  const line = node.text.split('\n', 1)[0].trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}
