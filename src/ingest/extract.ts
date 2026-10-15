/** The parts of DataTransfer we read, so drops and pastes can be tested without a browser. */
export interface TransferLike {
  readonly files: ArrayLike<File>;
  getData(format: string): string;
}

export type Source = { type: "file"; file: File } | { type: "url"; url: string };

const IMAGE_EXT = /\.(png|jpe?g|jfif|gif|webp|avif|bmp|svg|ico|tiff?|heic)(\?|#|$)/i;
const USABLE_URL = /^(https?:|data:image\/|blob:)/i;

export const isImageFile = (f: File) => f.type.startsWith("image/") || IMAGE_EXT.test(f.name);

/** Image URLs inside dragged HTML, preferring each image's largest srcset candidate. */
export function imageUrlsFromHtml(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const urls: string[] = [];
  for (const img of doc.querySelectorAll("img")) {
    let src = img.getAttribute("src");
    const srcset = img.getAttribute("srcset");
    if (srcset) {
      const best = srcset
        .split(",")
        .map((c) => c.trim().split(/\s+/))
        .sort((a, b) => Number.parseFloat(b[1] ?? "0") - Number.parseFloat(a[1] ?? "0"))[0];
      if (best?.[0]) src = best[0];
    }
    if (src) urls.push(src);
  }
  return urls;
}

/**
 * Everything in a drop or paste that could be an image, most reliable first:
 * real files, then <img> tags in dragged HTML (how browsers drag page images,
 * including Google Images), then plain links.
 */
export function extractSources(t: TransferLike): Source[] {
  const files = Array.from(t.files).filter(isImageFile);
  if (files.length) return files.map((file) => ({ type: "file", file }));

  const html = t.getData("text/html");
  let urls = html ? imageUrlsFromHtml(html) : [];
  if (!urls.length) {
    urls = t
      .getData("text/uri-list")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#"));
  }
  if (!urls.length) {
    const text = t.getData("text/plain").trim();
    if (text) urls = [text];
  }
  return [...new Set(urls.filter((u) => USABLE_URL.test(u)))].map((url) => ({ type: "url", url }));
}
