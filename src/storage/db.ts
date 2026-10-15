import { type DBSchema, openDB } from "idb";
import type { BoardSettings } from "../core/background";
import type { Items, View } from "../core/types";

interface SavedBoard {
  items: Items;
  view: View;
  /** Missing on boards saved before board settings existed. */
  settings?: BoardSettings;
}

interface Schema extends DBSchema {
  blobs: { key: string; value: Blob };
  board: { key: string; value: SavedBoard };
}

const db = () =>
  openDB<Schema>("moodboard", 1, {
    upgrade(d) {
      d.createObjectStore("blobs");
      d.createObjectStore("board");
    },
  });

export const putBlob = async (id: string, blob: Blob) => (await db()).put("blobs", blob, id);
export const getBlob = async (id: string) => (await db()).get("blobs", id);
export const saveBoard = async (board: SavedBoard) => (await db()).put("board", board, "main");
export const loadBoard = async () => (await db()).get("board", "main");

/** Deletes stored images no board item points to (kept until now so undo can bring them back). */
export async function pruneBlobs(keep: ReadonlySet<string>) {
  const d = await db();
  const tx = d.transaction("blobs", "readwrite");
  for (const id of await tx.store.getAllKeys()) if (!keep.has(id)) await tx.store.delete(id);
  await tx.done;
}
