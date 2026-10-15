import type { Items } from "./types";

export type LayerMove = "front" | "forward" | "backward" | "back";

/**
 * New stacking order after moving `selected` images, as z values for the items
 * whose z changes. Selected images keep their order relative to each other.
 * "forward"/"backward" step each one past its nearest unselected neighbour.
 */
export function restack(items: Items, selected: readonly string[], move: LayerMove): Record<string, number> {
  const order = Object.values(items)
    .sort((a, b) => a.z - b.z)
    .map((i) => i.id);
  const isSelected = new Set(selected.filter((id) => items[id]));
  if (!isSelected.size) return {};

  let next: string[];
  if (move === "front" || move === "back") {
    const picked = order.filter((id) => isSelected.has(id));
    const rest = order.filter((id) => !isSelected.has(id));
    next = move === "front" ? [...rest, ...picked] : [...picked, ...rest];
  } else {
    next = [...order];
    // Walk toward the direction of travel so a selected block moves as one.
    const up = move === "forward";
    const indexes = next.map((_, i) => i);
    if (up) indexes.reverse();
    for (const i of indexes) {
      const j = up ? i + 1 : i - 1;
      const a = next[i];
      const b = next[j];
      if (a === undefined || b === undefined) continue;
      if (isSelected.has(a) && !isSelected.has(b)) {
        next[i] = b;
        next[j] = a;
      }
    }
  }

  const changes: Record<string, number> = {};
  next.forEach((id, i) => {
    if (items[id]?.z !== i + 1) changes[id] = i + 1;
  });
  return changes;
}
