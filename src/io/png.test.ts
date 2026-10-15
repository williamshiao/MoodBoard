import { describe, expect, it } from "vitest";
import { type BoardItem, ITEM_DEFAULTS } from "../core/types";
import { EXPORT_PADDING, exportLayout } from "./png";

const item = (x: number, y: number, w: number, h: number, rotation = 0): BoardItem => ({
  id: `${x},${y}`,
  source: { kind: "blob" },
  x,
  y,
  w,
  h,
  z: 1,
  ...ITEM_DEFAULTS,
  rotation,
  group: null,
});

describe("exportLayout", () => {
  it("frames every image with padding at twice the board size", () => {
    const l = exportLayout([item(0, 0, 100, 50), item(300, 100, 100, 100)]);
    expect(l?.area).toEqual({ x: -EXPORT_PADDING, y: -EXPORT_PADDING, w: 480, h: 280 });
    expect(l?.scale).toBe(2);
    expect([l?.width, l?.height]).toEqual([960, 560]);
  });

  it("includes the corners of rotated images", () => {
    const l = exportLayout([item(0, 0, 100, 100, 45)]);
    expect(l?.area.w).toBeCloseTo(100 * Math.SQRT2 + EXPORT_PADDING * 2);
  });

  it("scales huge boards down to a size every browser can draw", () => {
    const l = exportLayout([item(0, 0, 20000, 15000)]);
    expect(l?.width).toBeLessThanOrEqual(8192);
    expect((l?.width ?? 0) * (l?.height ?? 0)).toBeLessThanOrEqual(16_000_000);
  });

  it("has nothing to draw for an empty board", () => {
    expect(exportLayout([])).toBeNull();
  });
});
