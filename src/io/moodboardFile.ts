import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { z } from "zod/mini";
import type { BoardItem, Items, View } from "../core/types";

/**
 * A .moodboard file is a zip holding board.json and the original image bytes,
 * so a board is one portable file that opens offline. `version` lets future
 * releases migrate older boards.
 */
const ItemSchema = z.object({
  id: z.string().check(z.minLength(1)),
  source: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("blob") }),
    z.object({ kind: z.literal("url"), url: z.string() }),
  ]),
  x: z.number(),
  y: z.number(),
  w: z.number().check(z.positive()),
  h: z.number().check(z.positive()),
  z: z.number(),
  type: z.optional(z.string()),
});

const BoardSchema = z.object({
  app: z.literal("moodboard"),
  version: z.literal(1),
  view: z.object({ x: z.number(), y: z.number(), zoom: z.number().check(z.positive()) }),
  items: z.array(ItemSchema),
});

export interface ImportedBoard {
  items: Items;
  view: View;
  blobs: Map<string, Blob>;
}

export async function exportBoard(
  items: Items,
  view: View,
  blobFor: (id: string) => Blob | undefined,
): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  const list = [];
  for (const item of Object.values(items)) {
    const blob = item.source.kind === "blob" ? blobFor(item.id) : undefined;
    if (blob) files[`images/${item.id}`] = new Uint8Array(await blob.arrayBuffer());
    list.push({ ...item, ...(blob ? { type: blob.type } : {}) });
  }
  files["board.json"] = strToU8(JSON.stringify({ app: "moodboard", version: 1, view, items: list }));
  // Images are already compressed; storing them avoids burning CPU for nothing.
  return zipSync(files, { level: 0 });
}

export function importBoard(bytes: Uint8Array): ImportedBoard {
  const files = unzipSync(bytes);
  const json = files["board.json"];
  if (!json) throw new Error("Not a MoodBoard file: board.json is missing");
  const board = BoardSchema.parse(JSON.parse(strFromU8(json)));

  const items: Record<string, BoardItem> = {};
  const blobs = new Map<string, Blob>();
  for (const { type, ...item } of board.items) {
    if (item.source.kind === "blob") {
      const data = files[`images/${item.id}`];
      if (!data) continue;
      blobs.set(item.id, new Blob([data as Uint8Array<ArrayBuffer>], { type: type ?? "" }));
    }
    items[item.id] = item;
  }
  return { items, view: board.view, blobs };
}
