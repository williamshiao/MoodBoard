import { boundsOf } from "./geometry";
import { rotatedBounds } from "./transform";
import type { Items, Rect } from "./types";

/** The ids `ids` cover once each grouped image brings the rest of its group, in a stable order. */
export function withGroups(items: Items, ids: readonly string[]): string[] {
  const groups = new Set(ids.flatMap((id) => items[id]?.group ?? []));
  const out = new Set(ids.filter((id) => items[id]));
  if (groups.size) for (const i of Object.values(items)) if (i.group && groups.has(i.group)) out.add(i.id);
  return [...out];
}

/** Whether the selected images are exactly one group and nothing else. */
export function isOneGroup(items: Items, ids: readonly string[]): boolean {
  const first = ids[0] ? items[ids[0]]?.group : null;
  if (!first) return false;
  const members = Object.values(items).filter((i) => i.group === first).length;
  return members === ids.length && ids.every((id) => items[id]?.group === first);
}

/** The box around each group with at least one selected image, for drawing group outlines. */
export function groupBounds(items: Items, ids: readonly string[]): Rect[] {
  const groups = new Set(ids.flatMap((id) => items[id]?.group ?? []));
  return [...groups].flatMap((g) => {
    const b = boundsOf(
      Object.values(items)
        .filter((i) => i.group === g)
        .map(rotatedBounds),
    );
    return b ? [b] : [];
  });
}
