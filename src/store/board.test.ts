import { beforeEach, describe, expect, it } from "vitest";
import { flipX, resetTransform, rotateBy, useBoard } from "./board";

const img = (id: string, x = 0) => ({ id, source: { kind: "blob" as const }, x, y: 0, w: 100, h: 100 });
const s = () => useBoard.getState();
const item = (id: string) => {
  const i = s().items[id];
  if (!i) throw new Error(`missing ${id}`);
  return i;
};

beforeEach(() => s().load({}, { x: 0, y: 0, zoom: 1 }));

describe("board store", () => {
  it("stacks new images on top, untransformed, and selects them", () => {
    s().add(img("a"));
    s().add(img("b"));
    expect(item("b").z).toBeGreaterThan(item("a").z);
    expect(item("a")).toMatchObject({ rotation: 0, flipX: false, flipY: false });
    expect(s().selectedIds).toEqual(["b"]);
  });

  it("undoes and redoes an add", () => {
    s().add(img("a"));
    s().undo();
    expect(s().items.a).toBeUndefined();
    expect(s().selectedIds).toEqual([]);
    s().redo();
    expect(s().items.a).toBeDefined();
  });

  it("records a whole multi-image drag as one undo step", () => {
    s().add(img("a"));
    s().add(img("b", 200));
    const before = [item("a"), item("b")];
    for (let d = 1; d <= 50; d++) s().preview({ a: { x: d }, b: { x: 200 + d } });
    s().commit(before);
    expect([item("a").x, item("b").x]).toEqual([50, 250]);
    s().undo();
    expect([item("a").x, item("b").x]).toEqual([0, 200]);
  });

  it("ignores a click that did not move anything", () => {
    s().add(img("a"));
    s().commit([item("a")]);
    expect(s().history.past).toHaveLength(1);
  });

  it("restores everything after clear is undone", () => {
    s().add(img("a"));
    s().add(img("b", 200));
    s().clear();
    expect(Object.keys(s().items)).toHaveLength(0);
    s().undo();
    expect(Object.keys(s().items).sort()).toEqual(["a", "b"]);
  });

  it("toggles images in and out of the selection", () => {
    s().add(img("a"));
    s().add(img("b"));
    s().select("a", true);
    expect(s().selectedIds).toEqual(["b", "a"]);
    s().select("b", true);
    expect(s().selectedIds).toEqual(["a"]);
    s().select("b");
    expect(s().selectedIds).toEqual(["b"]);
  });

  it("removes every selected image in one undo step", () => {
    s().add(img("a"));
    s().add(img("b"));
    s().selectOnly(["a", "b"]);
    s().remove(s().selectedIds);
    expect(s().selectedIds).toEqual([]);
    s().undo();
    expect(Object.keys(s().items)).toHaveLength(2);
  });

  it("flips, rotates and resets as undoable steps", () => {
    s().add(img("a"));
    s().update(["a"], flipX);
    s().update(["a"], rotateBy(-90));
    expect(item("a")).toMatchObject({ flipX: true, rotation: 270 });
    s().update(["a"], resetTransform);
    expect(item("a")).toMatchObject({ flipX: false, rotation: 0 });
    s().undo();
    s().undo();
    expect(item("a")).toMatchObject({ flipX: true, rotation: 0 });
  });

  it("updates settings without touching undo history", () => {
    s().setSettings({ grid: "lines" });
    s().setSettings({ background: "#ffffff" });
    expect(s().settings).toEqual({ background: "#ffffff", grid: "lines" });
    expect(s().history.past).toHaveLength(0);
  });

  it("resets settings to defaults when loading a board without them", () => {
    s().setSettings({ grid: "none" });
    s().load({}, { x: 0, y: 0, zoom: 1 });
    expect(s().settings.grid).toBe("dots");
  });

  it("drops the redo stack after a new action", () => {
    s().add(img("a"));
    s().undo();
    s().add(img("b"));
    expect(s().history.future).toHaveLength(0);
  });
});
