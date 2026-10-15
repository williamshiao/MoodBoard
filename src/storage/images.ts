import type { BoardItem } from "../core/types";

/** In-memory image bytes and their object URLs, keyed by item id. */
const blobs = new Map<string, Blob>();
const objectUrls = new Map<string, string>();

export function rememberBlob(id: string, blob: Blob) {
  blobs.set(id, blob);
  objectUrls.set(id, URL.createObjectURL(blob));
}

export const blobFor = (id: string) => blobs.get(id);

export const srcFor = (item: Pick<BoardItem, "id" | "source">) =>
  item.source.kind === "url" ? item.source.url : (objectUrls.get(item.id) ?? "");
