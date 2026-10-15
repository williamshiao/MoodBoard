import { describe, expect, it } from "vitest";
import {
  centerOf,
  HANDLES,
  type Handle,
  normalizeDegrees,
  rectsIntersect,
  resizeWithHandle,
  rotate,
  rotatedBounds,
  rotationToward,
} from "./transform";
import type { Point, Rect } from "./types";

const box = (rotation = 0) => ({ x: 0, y: 0, w: 200, h: 100, rotation });

/** World position of the point on `r` opposite `h`. */
function anchor(r: Rect, h: Handle, rotation: number): Point {
  const c = centerOf(r);
  const p = rotate({ x: (-h.hx * r.w) / 2, y: (-h.hy * r.h) / 2 }, rotation);
  return { x: c.x + p.x, y: c.y + p.y };
}

const handle = (name: string) => {
  const h = HANDLES[name];
  if (!h) throw new Error(name);
  return h;
};

describe("rotate", () => {
  it("turns clockwise in screen coordinates", () => {
    const p = rotate({ x: 1, y: 0 }, 90);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });
});

describe("rotatedBounds", () => {
  it("swaps width and height at 90°", () => {
    const b = rotatedBounds(box(90));
    expect(b.w).toBeCloseTo(100);
    expect(b.h).toBeCloseTo(200);
    expect(centerOf(b).x).toBeCloseTo(100);
  });
  it("grows at 45°", () => {
    expect(rotatedBounds(box(45)).w).toBeCloseTo(Math.SQRT1_2 * 300);
  });
});

describe("rectsIntersect", () => {
  it("detects overlap and separation", () => {
    expect(rectsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(rectsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 10, h: 10 })).toBe(false);
  });
});

describe("resizeWithHandle", () => {
  it("stretches only horizontally from a side handle", () => {
    const r = resizeWithHandle(box(), handle("e"), { x: 50, y: 30 }, false);
    expect(r).toEqual({ x: 0, y: 0, w: 250, h: 100 });
  });

  it("stretches only vertically from the top, keeping the bottom edge", () => {
    const r = resizeWithHandle(box(), handle("n"), { x: 0, y: -40 }, false);
    expect(r).toEqual({ x: 0, y: -40, w: 200, h: 140 });
  });

  it("keeps the aspect ratio from a corner unless free", () => {
    const locked = resizeWithHandle(box(), handle("se"), { x: 100, y: 0 }, false);
    expect(locked.w / locked.h).toBeCloseTo(2);
    const free = resizeWithHandle(box(), handle("se"), { x: 100, y: 0 }, true);
    expect(free).toEqual({ x: 0, y: 0, w: 300, h: 100 });
  });

  it("never shrinks below the minimum size", () => {
    const r = resizeWithHandle(box(), handle("w"), { x: 1000, y: 0 }, false);
    expect(r.w).toBe(20);
    expect(r.x + r.w).toBeCloseTo(200);
  });

  it.each([0, 30, 90, 135, 270])("keeps the opposite point fixed when rotated %i°", (rotation) => {
    for (const name of Object.keys(HANDLES)) {
      const h = handle(name);
      const before = box(rotation);
      const after = resizeWithHandle(before, h, { x: 37, y: -23 }, name.length === 2);
      const a = anchor(before, h, rotation);
      const b = anchor(after, h, rotation);
      expect(b.x).toBeCloseTo(a.x);
      expect(b.y).toBeCloseTo(a.y);
    }
  });

  it("stretches along the image's own axis when rotated", () => {
    // Rotated 90°, the image's "right" edge faces down the screen.
    const r = resizeWithHandle(box(90), handle("e"), { x: 0, y: 50 }, false);
    expect(r.w).toBeCloseTo(250);
    expect(r.h).toBeCloseTo(100);
  });
});

describe("rotationToward", () => {
  const c = { x: 0, y: 0 };
  it("is 0° when the pointer is straight above", () => {
    expect(rotationToward(c, { x: 0, y: -10 }, false)).toBeCloseTo(0);
  });
  it("is 90° to the right and 270° to the left", () => {
    expect(rotationToward(c, { x: 10, y: 0 }, false)).toBeCloseTo(90);
    expect(rotationToward(c, { x: -10, y: 0 }, false)).toBeCloseTo(270);
  });
  it("snaps to 15° steps", () => {
    expect(rotationToward(c, rotate({ x: 0, y: -10 }, 37), true)).toBe(30);
  });
});

describe("normalizeDegrees", () => {
  it("wraps into 0 to 360", () => {
    expect(normalizeDegrees(-90)).toBe(270);
    expect(normalizeDegrees(450)).toBe(90);
  });
});
