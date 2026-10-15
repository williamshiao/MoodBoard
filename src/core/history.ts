import type { BoardItem, Items } from "./types";

/**
 * One undoable change: the affected items before and after. `null` means the item
 * did not exist on that side, so adds, removes and edits share one representation.
 */
export interface Change {
  before: Record<string, BoardItem | null>;
  after: Record<string, BoardItem | null>;
}

export function applySide(items: Items, side: Change["before"]): Items {
  const next: Record<string, BoardItem> = { ...items };
  for (const [id, item] of Object.entries(side)) {
    if (item) next[id] = item;
    else delete next[id];
  }
  return next;
}

/** Builds the change that turns `items` into `items` with `updates` applied. */
export function diff(items: Items, updates: Record<string, BoardItem | null>): Change {
  const before: Change["before"] = {};
  for (const id of Object.keys(updates)) before[id] = items[id] ?? null;
  return { before, after: updates };
}

export const isNoop = (c: Change) =>
  Object.keys(c.after).every((id) => JSON.stringify(c.before[id]) === JSON.stringify(c.after[id]));

export interface HistoryState {
  past: Change[];
  future: Change[];
}

export const HISTORY_LIMIT = 200;

export function record(h: HistoryState, change: Change): HistoryState {
  if (isNoop(change)) return h;
  return { past: [...h.past, change].slice(-HISTORY_LIMIT), future: [] };
}
