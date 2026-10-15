import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../core/background";
import type { BoardItem } from "../core/types";
import { exportBoard, importBoard } from "./moodboardFile";

const item = (id: string, source: BoardItem["source"]): BoardItem => ({
  id,
  source,
  x: 1,
  y: 2,
  w: 30,
  h: 40,
  z: 1,
});

describe(".moodboard files", () => {
  it("round-trips items, view and image bytes", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
    const items = {
      a: item("a", { kind: "blob" }),
      b: item("b", { kind: "url", url: "https://x.test/b.jpg" }),
    };
    const view = { x: 5, y: 6, zoom: 1.5 };

    const settings = { background: "#f4f1ea", grid: "graph" as const };

    const bytes = await exportBoard(items, view, settings, (id) => (id === "a" ? blob : undefined));
    const back = importBoard(bytes);

    expect(back.items).toEqual(items);
    expect(back.view).toEqual(view);
    expect(back.settings).toEqual(settings);
    const restored = back.blobs.get("a");
    expect(restored?.type).toBe("image/png");
    expect([...new Uint8Array(await (restored as Blob).arrayBuffer())]).toEqual([1, 2, 3]);
  });

  it("opens files saved before board settings existed", () => {
    const old = { app: "moodboard", version: 1, view: { x: 0, y: 0, zoom: 1 }, items: [] };
    expect(importBoard(zipSync({ "board.json": strToU8(JSON.stringify(old)) })).settings).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it("rejects files that are not boards", () => {
    expect(() => importBoard(zipSync({ "other.txt": strToU8("hi") }))).toThrow(/board\.json/);
    const wrong = zipSync({ "board.json": strToU8(JSON.stringify({ app: "other" })) });
    expect(() => importBoard(wrong)).toThrow();
  });
});
