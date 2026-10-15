import type { Point, Rect, Size, View } from "./types";

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 8;

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function screenToWorld(view: View, p: Point): Point {
  return { x: (p.x - view.x) / view.zoom, y: (p.y - view.y) / view.zoom };
}

/** Zoom by `factor`, keeping the world point under `anchor` (screen px) fixed. */
export function zoomAt(view: View, anchor: Point, factor: number): View {
  const zoom = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const w = screenToWorld(view, anchor);
  return { zoom, x: anchor.x - w.x * zoom, y: anchor.y - w.y * zoom };
}

export function boundsOf(rects: readonly Rect[]): Rect | null {
  if (!rects.length) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** The view that centres `rects` in a viewport of `size`, never zooming past `maxZoom`. */
export function fitView(rects: readonly Rect[], size: Size, padding = 60, maxZoom = 2): View {
  const b = boundsOf(rects);
  if (!b) return { x: 0, y: 0, zoom: 1 };
  const zoom = clamp(
    Math.min(maxZoom, (size.w - padding * 2) / (b.w || 1), (size.h - padding * 2) / (b.h || 1)),
    MIN_ZOOM,
    MAX_ZOOM,
  );
  return {
    zoom,
    x: (size.w - b.w * zoom) / 2 - b.x * zoom,
    y: (size.h - b.h * zoom) / 2 - b.y * zoom,
  };
}

/** Scale a natural image size down so its long side is at most `maxSide`. Never scales up. */
export function fitSize(natural: Size, maxSide: number): Size {
  const s = Math.min(1, maxSide / Math.max(natural.w, natural.h, 1));
  return { w: natural.w * s, h: natural.h * s };
}

/**
 * New size after dragging the bottom-right corner by (dx, dy) in world units.
 * Keeps the starting aspect ratio unless `free` is set.
 */
export function resizeFromCorner(start: Size, dx: number, dy: number, free: boolean, min = 20): Size {
  let w = Math.max(min, start.w + dx);
  let h = Math.max(min, start.h + dy);
  if (!free) {
    const ratio = start.w / start.h;
    if (w / h > ratio) h = w / ratio;
    else w = h * ratio;
  }
  return { w, h };
}
