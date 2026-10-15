import { describe, expect, it } from "vitest";
import { type LayerMove, restack } from "./layers";
import { type BoardItem, ITEM_DEFAULTS, type Items } from "./types";

/** Items stacked bottom to top in the order given. */
const stack = (...ids: string[]): Items =>
  Object.fromEntries(
    ids.map((id, i): [string, BoardItem] => [
      id,
      { id, source: { kind: "blob" }, x: 0, y: 0, w: 1, h: 1, z: (i + 1) * 10, ...ITEM_DEFAULTS },
    ]),
  );

/** Bottom-to-top order after applying a move. */
function order(items: Items, selected: string[], move: LayerMove) {
  const z = restack(items, selected, move);
  return Object.values(items)
    .map((i) => ({ id: i.id, z: z[i.id] ?? i.z }))
    .sort((a, b) => a.z - b.z)
    .map((i) => i.id)
    .join("");
}

describe("restack", () => {
  const items = stack("a", "b", "c", "d");

  it("brings to front and sends to back", () => {
    expect(order(items, ["b"], "front")).toBe("acdb");
    expect(order(items, ["c"], "back")).toBe("cabd");
  });

  it("steps forward and backward one place", () => {
    expect(order(items, ["b"], "forward")).toBe("acbd");
    expect(order(items, ["c"], "backward")).toBe("acbd");
  });

  it("does nothing past the top or bottom", () => {
    expect(order(items, ["d"], "forward")).toBe("abcd");
    expect(order(items, ["a"], "backward")).toBe("abcd");
  });

  it("moves several images and keeps their relative order", () => {
    expect(order(items, ["a", "c"], "front")).toBe("bdac");
    expect(order(items, ["b", "d"], "back")).toBe("bdac");
    expect(order(items, ["a", "b"], "forward")).toBe("cabd");
    expect(order(items, ["c", "d"], "backward")).toBe("acdb");
  });

  it("returns only the z values that change", () => {
    expect(restack(stack("a", "b"), ["b"], "front")).toEqual({ a: 1, b: 2 });
    expect(restack(stack("a", "b"), [], "front")).toEqual({});
  });
});
