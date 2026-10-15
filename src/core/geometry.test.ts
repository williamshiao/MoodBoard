import { describe, expect, it } from "vitest";
import { boundsOf, fitSize, fitView, MAX_ZOOM, screenToWorld, zoomAt } from "./geometry";

describe("zoomAt", () => {
  it("keeps the world point under the cursor fixed", () => {
    const view = { x: 40, y: -20, zoom: 1.5 };
    const anchor = { x: 300, y: 200 };
    const before = screenToWorld(view, anchor);
    const after = screenToWorld(zoomAt(view, anchor, 1.8), anchor);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("clamps to the maximum zoom", () => {
    expect(zoomAt({ x: 0, y: 0, zoom: 7 }, { x: 0, y: 0 }, 10).zoom).toBe(MAX_ZOOM);
  });
});

describe("fitView", () => {
  it("centres the content", () => {
    const rects = [
      { x: 0, y: 0, w: 100, h: 100 },
      { x: 300, y: 100, w: 100, h: 100 },
    ];
    const v = fitView(rects, { w: 1000, h: 800 }, 0, 10);
    const b = boundsOf(rects);
    if (!b) throw new Error("no bounds");
    expect(v.x + (b.x + b.w / 2) * v.zoom).toBeCloseTo(500);
    expect(v.y + (b.y + b.h / 2) * v.zoom).toBeCloseTo(400);
  });

  it("resets for an empty board", () => {
    expect(fitView([], { w: 100, h: 100 })).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});

describe("fitSize", () => {
  it("shrinks large images to the max side", () => {
    expect(fitSize({ w: 2000, h: 1000 }, 400)).toEqual({ w: 400, h: 200 });
  });
  it("never enlarges small images", () => {
    expect(fitSize({ w: 50, h: 80 }, 400)).toEqual({ w: 50, h: 80 });
  });
});
