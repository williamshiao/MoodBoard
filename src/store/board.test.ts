import { beforeEach, describe, expect, it } from "vitest";
import { useBoard } from "./board";

const img = (id: string, x = 0) => ({ id, source: { kind: "blob" as const }, x, y: 0, w: 100, h: 100 });
const s = () => useBoard.getState();

beforeEach(() => s().load({}, { x: 0, y: 0, zoom: 1 }));

describe("board store", () => {
  it("stacks new images on top", () => {
    s().add(img("a"));
    s().add(img("b"));
    expect(s().items.b?.z).toBeGreaterThan(s().items.a?.z ?? Infinity);
    expect(s().selectedId).toBe("b");
  });

  it("undoes and redoes an add", () => {
    s().add(img("a"));
    s().undo();
    expect(s().items.a).toBeUndefined();
    s().redo();
    expect(s().items.a).toBeDefined();
  });

  it("records a whole drag as one undo step", () => {
    s().add(img("a"));
    const before = s().items.a;
    if (!before) throw new Error("missing");
    for (let x = 1; x <= 50; x++) s().preview("a", { x });
    s().commit(before);
    expect(s().items.a?.x).toBe(50);
    s().undo();
    expect(s().items.a?.x).toBe(0);
    expect(s().items.a).toBeDefined();
  });

  it("ignores a click that did not move anything", () => {
    s().add(img("a"));
    const before = s().items.a;
    if (!before) throw new Error("missing");
    s().commit(before);
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
