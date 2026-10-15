import type { Rect } from "./types";

/** Snap distance in screen pixels; divide by zoom for world units. */
export const SNAP_DISTANCE = 8;

/** A guide line drawn where edges line up: vertical at x = `at` (axis "x") or horizontal at y = `at`. */
export interface Guide {
  axis: "x" | "y";
  at: number;
  from: number;
  to: number;
}

export interface Snap {
  dx: number;
  dy: number;
  guides: Guide[];
}

/** Edges that may line up on one axis: start with start or end, end with start or end, and centre with centre. */
const lines = (start: number, size: number) => ({ edges: [start, start + size], center: start + size / 2 });

/** Smallest shift that lines `moving` up with any of `others` along one axis, if one is within `max`. */
function offset(moving: Rect, others: readonly Rect[], axis: "x" | "y", max: number): number | undefined {
  const pos = axis === "x" ? "x" : "y";
  const len = axis === "x" ? "w" : "h";
  const m = lines(moving[pos], moving[len]);
  let best: number | undefined;
  const consider = (d: number) => {
    if (Math.abs(d) <= max && (best === undefined || Math.abs(d) < Math.abs(best))) best = d;
  };
  for (const o of others) {
    const t = lines(o[pos], o[len]);
    for (const a of m.edges) for (const b of t.edges) consider(b - a);
    consider(t.center - m.center);
  }
  return best;
}

/** Guides for every line `moving` now shares with one of `others` on an axis. */
function guidesFor(moving: Rect, others: readonly Rect[], axis: "x" | "y"): Guide[] {
  const pos = axis === "x" ? "x" : "y";
  const len = axis === "x" ? "w" : "h";
  const cross = axis === "x" ? "y" : "x";
  const crossLen = axis === "x" ? "h" : "w";
  const m = lines(moving[pos], moving[len]);
  const byPosition = new Map<number, Guide>();
  const add = (at: number, o: Rect) => {
    const key = Math.round(at * 100) / 100;
    const from = Math.min(moving[cross], o[cross]);
    const to = Math.max(moving[cross] + moving[crossLen], o[cross] + o[crossLen]);
    const g = byPosition.get(key);
    if (g) {
      g.from = Math.min(g.from, from);
      g.to = Math.max(g.to, to);
    } else byPosition.set(key, { axis, at, from, to });
  };
  const same = (a: number, b: number) => Math.abs(a - b) < 0.01;
  for (const o of others) {
    const t = lines(o[pos], o[len]);
    for (const a of m.edges) for (const b of t.edges) if (same(a, b)) add(a, o);
    if (same(m.center, t.center)) add(m.center, o);
  }
  return [...byPosition.values()];
}

/**
 * Nudges a moving box so its edges or centre line up with nearby boxes.
 * `others` are the boxes it may snap to, and `max` is the snap distance in the same units.
 */
export function snapRect(moving: Rect, others: readonly Rect[], max: number): Snap {
  const dx = offset(moving, others, "x", max) ?? 0;
  const dy = offset(moving, others, "y", max) ?? 0;
  const snapped = { ...moving, x: moving.x + dx, y: moving.y + dy };
  return { dx, dy, guides: [...guidesFor(snapped, others, "x"), ...guidesFor(snapped, others, "y")] };
}
