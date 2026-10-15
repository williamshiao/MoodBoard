import { boundsOf } from "../core/geometry";
import { centerOf, rotatedBounds } from "../core/transform";
import type { BoardItem, Items, Rect } from "../core/types";

/** Space around the images in the exported picture, in board units. */
export const EXPORT_PADDING = 40;
/** Largest canvas every browser can draw (Safari stops at about 16.7 million pixels). */
const MAX_PIXELS = 16_000_000;
const MAX_SIDE = 8192;
/** Export at up to twice the on-board size so images stay sharp when zoomed. */
const MAX_SCALE = 2;

export interface ExportLayout {
  /** The board area that is drawn, padding included. */
  area: Rect;
  /** Canvas pixels per board unit. */
  scale: number;
  width: number;
  height: number;
}

/** Where and how big to draw `items` in the exported picture, or null for an empty board. */
export function exportLayout(items: readonly BoardItem[]): ExportLayout | null {
  const b = boundsOf(items.map(rotatedBounds));
  if (!b) return null;
  const area = {
    x: b.x - EXPORT_PADDING,
    y: b.y - EXPORT_PADDING,
    w: b.w + EXPORT_PADDING * 2,
    h: b.h + EXPORT_PADDING * 2,
  };
  const scale = Math.min(
    MAX_SCALE,
    MAX_SIDE / area.w,
    MAX_SIDE / area.h,
    Math.sqrt(MAX_PIXELS / (area.w * area.h)),
  );
  return { area, scale, width: Math.round(area.w * scale), height: Math.round(area.h * scale) };
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image failed to load"));
    img.src = src;
  });

export interface PngResult {
  blob: Blob;
  /** Images left out because the site they link to doesn't allow copying them. */
  skipped: number;
}

/**
 * Draws the board into a PNG: background colour, then every image in stacking order with
 * its rotation, mirroring and colour filters. Linked images are left out, since a browser
 * refuses to export a picture containing another site's pixels.
 */
export async function renderPng(
  items: Items,
  background: string,
  srcFor: (item: BoardItem) => string,
): Promise<PngResult | null> {
  const all = Object.values(items).sort((a, b) => a.z - b.z);
  const local = all.filter((i) => i.source.kind === "blob");
  const layout = exportLayout(all);
  if (!layout) return null;

  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas is not available");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(layout.scale, layout.scale);
  ctx.translate(-layout.area.x, -layout.area.y);
  ctx.imageSmoothingQuality = "high";

  const images = await Promise.all(local.map((i) => loadImage(srcFor(i)).catch(() => null)));
  for (const [n, item] of local.entries()) {
    const img = images[n];
    if (!img) continue;
    const c = centerOf(item);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate((item.rotation * Math.PI) / 180);
    ctx.scale(item.flipX ? -1 : 1, item.flipY ? -1 : 1);
    ctx.filter =
      [item.invert && "invert(1)", item.grayscale && "grayscale(1)"].filter(Boolean).join(" ") || "none";
    ctx.drawImage(img, -item.w / 2, -item.h / 2, item.w, item.h);
    ctx.restore();
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("could not encode the PNG");
  return { blob, skipped: all.length - local.length };
}
