import type { Point, Rect } from "./types";

const RAD = Math.PI / 180;

export const MIN_SIZE = 20;

/** Rotates a vector clockwise by `deg` (screen coordinates: y points down). */
export function rotate(p: Point, deg: number): Point {
  const c = Math.cos(deg * RAD);
  const s = Math.sin(deg * RAD);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export const centerOf = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Axis-aligned bounds of an item after rotation, for fitting and box selection. */
export function rotatedBounds(item: Rect & { rotation: number }): Rect {
  const c = centerOf(item);
  const corners = [
    { x: -item.w / 2, y: -item.h / 2 },
    { x: item.w / 2, y: -item.h / 2 },
    { x: item.w / 2, y: item.h / 2 },
    { x: -item.w / 2, y: item.h / 2 },
  ].map((p) => rotate(p, item.rotation));
  const xs = corners.map((p) => p.x + c.x);
  const ys = corners.map((p) => p.y + c.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export const rectsIntersect = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** A resize handle by which edges it moves: -1 left/top, 1 right/bottom, 0 neither. */
export interface Handle {
  hx: -1 | 0 | 1;
  hy: -1 | 0 | 1;
}

export const HANDLES: Record<string, Handle> = {
  nw: { hx: -1, hy: -1 },
  n: { hx: 0, hy: -1 },
  ne: { hx: 1, hy: -1 },
  e: { hx: 1, hy: 0 },
  se: { hx: 1, hy: 1 },
  s: { hx: 0, hy: 1 },
  sw: { hx: -1, hy: 1 },
  w: { hx: -1, hy: 0 },
};

/**
 * New box after dragging `handle` by `delta` (world units), keeping the opposite
 * corner or edge fixed on screen even when the image is rotated. Corner handles
 * keep the aspect ratio unless `free`; side handles stretch one axis.
 */
export function resizeWithHandle(
  item: Rect & { rotation: number },
  handle: Handle,
  delta: Point,
  free: boolean,
): Rect {
  const local = rotate(delta, -item.rotation);
  let w = handle.hx ? Math.max(MIN_SIZE, item.w + handle.hx * local.x) : item.w;
  let h = handle.hy ? Math.max(MIN_SIZE, item.h + handle.hy * local.y) : item.h;

  if (handle.hx && handle.hy && !free) {
    const scale = Math.max(w / item.w, h / item.h, MIN_SIZE / Math.min(item.w, item.h));
    w = item.w * scale;
    h = item.h * scale;
  }

  // The point opposite the handle stays where it was.
  const c = centerOf(item);
  const anchorOld = rotate({ x: (-handle.hx * item.w) / 2, y: (-handle.hy * item.h) / 2 }, item.rotation);
  const anchorNew = rotate({ x: (-handle.hx * w) / 2, y: (-handle.hy * h) / 2 }, item.rotation);
  const nc = { x: c.x + anchorOld.x - anchorNew.x, y: c.y + anchorOld.y - anchorNew.y };
  return { x: nc.x - w / 2, y: nc.y - h / 2, w, h };
}

export const normalizeDegrees = (deg: number) => ((deg % 360) + 360) % 360;

/**
 * Rotation that points the image's top toward `pointer`, as when dragging a
 * handle above it. `snap` rounds to 15° steps.
 */
export function rotationToward(center: Point, pointer: Point, snap: boolean): number {
  const deg = Math.atan2(pointer.y - center.y, pointer.x - center.x) / RAD + 90;
  return normalizeDegrees(snap ? Math.round(deg / 15) * 15 : deg);
}
