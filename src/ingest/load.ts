import type { Size } from "../core/types";
import type { Source } from "./extract";

export type Loaded = { kind: "blob"; blob: Blob } | { kind: "url"; url: string };

/** True inside the desktop app, where Tauri injects its bridge into the page. */
export const isDesktop = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * The desktop app downloads through Rust, which no site can block; browsers must ask
 * the site's permission (CORS). The plugin is loaded only on desktop, so the web
 * bundle doesn't carry it.
 */
async function download(url: string): Promise<Response> {
  // data: and blob: URLs never leave the page, so the browser's fetch handles them everywhere.
  if (isDesktop() && /^https?:/i.test(url)) {
    const { fetch: nativeFetch } = await import("@tauri-apps/plugin-http");
    return nativeFetch(url);
  }
  return fetch(url, { mode: "cors", credentials: "omit" });
}

/**
 * Turns a source into image bytes when possible. In a browser, many sites refuse to
 * let another page read their images (CORS); those stay as links so they still display.
 */
export async function loadSource(source: Source): Promise<Loaded> {
  if (source.type === "file") return { kind: "blob", blob: source.file };
  const { url } = source;
  try {
    const res = await download(url);
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
