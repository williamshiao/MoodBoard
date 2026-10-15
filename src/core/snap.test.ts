import { describe, expect, it } from "vitest";
import { snapRect } from "./snap";

const box = (x: number, y: number, w = 100, h = 100) => ({ x, y, w, h });

describe("snapRect", () => {
  it("butts an edge against a nearby box and draws a guide there", () => {
    const s = snapRect(box(105, 300), [box(0, 0)], 8);
    expect(s.dx).toBe(-5);
    expect(s.dy).toBe(0);
    expect(s.guides).toContainEqual({ axis: "x", at: 100, from: 0, to: 400 });
  });

  it("aligns matching edges and centres on both axes", () => {
    const s = snapRect(box(203, 4, 50, 50), [box(200, 0, 100, 100)], 8);
    expect(s.dx).toBe(-3);
    expect(s.dy).toBe(-4);
    // Left edges and top edges now line up.
    expect(s.guides.map((g) => [g.axis, g.at])).toEqual(
      expect.arrayContaining([
        ["x", 200],
        ["y", 0],
      ]),
    );
  });

  it("lines up centres", () => {
    const s = snapRect(box(26, 300, 50, 50), [box(0, 0, 100, 100)], 8);
    expect(s.dx).toBe(-1);
    expect(s.guides).toContainEqual(expect.objectContaining({ axis: "x", at: 50 }));
  });

  it("picks the closest line when several are in reach", () => {
    expect(snapRect(box(96, 500), [box(0, 0), box(203, 0)], 8).dx).toBe(4);
    expect(snapRect(box(98, 500), [box(0, 0), box(203, 0)], 8).dx).toBe(2);
  });

  it("leaves the box alone when nothing is close", () => {
    expect(snapRect(box(150, 150), [box(0, 0)], 8)).toEqual({ dx: 0, dy: 0, guides: [] });
    expect(snapRect(box(500, 500), [], 8)).toEqual({ dx: 0, dy: 0, guides: [] });
  });
});
