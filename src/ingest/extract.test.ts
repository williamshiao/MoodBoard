import { describe, expect, it } from "vitest";
import { extractSources, imageUrlsFromHtml, type TransferLike } from "./extract";

const transfer = (data: Record<string, string>, files: File[] = []): TransferLike => ({
  files,
  getData: (f) => data[f] ?? "",
});

describe("extractSources", () => {
  it("prefers dropped image files", () => {
    const png = new File(["x"], "a.png", { type: "image/png" });
    const txt = new File(["x"], "notes.txt", { type: "text/plain" });
    const out = extractSources(transfer({ "text/uri-list": "https://x.test/a.png" }, [png, txt]));
    expect(out).toEqual([{ type: "file", file: png }]);
  });

  it("accepts image files with no MIME type by extension", () => {
    const f = new File(["x"], "scan.JFIF");
    expect(extractSources(transfer({}, [f]))).toHaveLength(1);
  });

  it("takes the image, not the result link, from a Google Images drag", () => {
    const out = extractSources(
      transfer({
        "text/html":
          '<a href="https://www.google.com/imgres?q=1"><img src="https://encrypted-tbn0.gstatic.com/images?q=abc"></a>',
        "text/uri-list": "https://www.google.com/imgres?q=1",
      }),
    );
    expect(out).toEqual([{ type: "url", url: "https://encrypted-tbn0.gstatic.com/images?q=abc" }]);
  });

  it("keeps data: URLs from dragged HTML", () => {
    const out = extractSources(transfer({ "text/html": '<img src="data:image/png;base64,AAAA">' }));
    expect(out).toEqual([{ type: "url", url: "data:image/png;base64,AAAA" }]);
  });

  it("falls back to uri-list, skipping comments", () => {
    const out = extractSources(transfer({ "text/uri-list": "# comment\r\nhttps://x.test/a.jpg" }));
    expect(out).toEqual([{ type: "url", url: "https://x.test/a.jpg" }]);
  });

  it("accepts a pasted link", () => {
    expect(extractSources(transfer({ "text/plain": "  https://x.test/a.webp \n" }))).toHaveLength(1);
  });

  it("ignores plain text and unsafe schemes", () => {
    expect(extractSources(transfer({ "text/plain": "hello" }))).toEqual([]);
    expect(extractSources(transfer({ "text/plain": "javascript:alert(1)" }))).toEqual([]);
  });
});

describe("imageUrlsFromHtml", () => {
  it("picks the largest srcset candidate", () => {
    const html = '<img src="s.jpg" srcset="s.jpg 320w, l.jpg 1280w, m.jpg 640w">';
    expect(imageUrlsFromHtml(html)).toEqual(["l.jpg"]);
  });
});
