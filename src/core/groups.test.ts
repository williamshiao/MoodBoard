import { describe, expect, it } from "vitest";
import { groupBounds, isOneGroup, withGroups } from "./groups";
import { type BoardItem, ITEM_DEFAULTS, type Items } from "./types";

const at = (id: string, x: number, group: string | null): BoardItem => ({
  id,
  source: { kind: "blob" },
  x,
  y: 0,
  w: 100,
  h: 50,
  z: 1,
  ...ITEM_DEFAULTS,
  group,
});
const items: Items = { a: at("a", 0, "g"), b: at("b", 300, "g"), c: at("c", 600, null) };

describe("groups", () => {
  it("brings the rest of each group along", () => {
    expect(withGroups(items, ["a"]).sort()).toEqual(["a", "b"]);
    expect(withGroups(items, ["c"])).toEqual(["c"]);
    expect(withGroups(items, ["c", "missing"])).toEqual(["c"]);
  });

  it("knows when the selection is exactly one group", () => {
    expect(isOneGroup(items, ["a", "b"])).toBe(true);
    expect(isOneGroup(items, ["a"])).toBe(false);
    expect(isOneGroup(items, ["a", "b", "c"])).toBe(false);
    expect(isOneGroup(items, ["c"])).toBe(false);
  });

  it("outlines a selected group around all its members", () => {
    expect(groupBounds(items, ["a"])).toEqual([{ x: 0, y: 0, w: 400, h: 50 }]);
    expect(groupBounds(items, ["c"])).toEqual([]);
  });
});
