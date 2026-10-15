import type { Size } from "../core/types";
import type { Source } from "./extract";

export type Loaded = { kind: "blob"; blob: Blob } | { kind: "url"; url: string };

/**
 * Turns a source into image bytes when possible. Many sites refuse to let another
 * page read their images (CORS); those stay as links so they still display.
 */
export async function loadSource(source: Source): Promise<Loaded> {
  if (source.type === "file") return { kind: "blob", blob: source.file };
  const { url } = source;
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    const blob = await res.blob();
    if (res.ok && blob.type.startsWith("image/")) return { kind: "blob", blob };
  } catch {
    // Blocked by CORS or offline: fall through to a linked image.
  }
  return { kind: "url", url };
}

/** Natural pixel size of an image, or rejects if the browser can't decode it. */
export function measureImage(src: string): Promise<Size> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 300, h: img.naturalHeight || 300 });
    img.onerror = () => reject(new Error(`Could not load image: ${src.slice(0, 80)}`));
    img.src = src;
  });
}
