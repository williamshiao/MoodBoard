import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

export const jpeg = readFileSync(new URL("./fixture.jpg", import.meta.url)).toString("base64");
export const items = (page: Page) => page.getByTestId("board-item");

/** Fires a real drop event on the window, as a browser does when you let go of a drag. */
export async function drop(page: Page, x: number, y: number, kind: "file" | "google-html") {
  await page.evaluate(
    ({ x, y, kind, jpeg }) => {
      const dt = new DataTransfer();
      if (kind === "file") {
        const bytes = Uint8Array.from(atob(jpeg), (c) => c.charCodeAt(0));
        dt.items.add(new File([bytes], "ref.jpg", { type: "image/jpeg" }));
      } else {
        // What a browser hands over when you drag a thumbnail out of Google Images.
        dt.setData(
          "text/html",
          `<a href="https://www.google.com/imgres?q=1"><img src="data:image/jpeg;base64,${jpeg}"></a>`,
        );
        dt.setData("text/uri-list", "https://www.google.com/imgres?q=1");
      }
      window.dispatchEvent(
        new DragEvent("drop", { dataTransfer: dt, clientX: x, clientY: y, bubbles: true, cancelable: true }),
      );
    },
    { x, y, kind, jpeg },
  );
}

/** Drops images one at a time, waiting for each to appear, so later steps can rely on them. */
export async function dropAll(page: Page, points: [number, number][]) {
  for (const [i, [x, y]] of points.entries()) {
    await drop(page, x, y, "file");
    await expect(items(page)).toHaveCount(i + 1);
  }
}

export async function box(page: Page, index = 0) {
  const b = await items(page).nth(index).boundingBox();
  if (!b) throw new Error("item not visible");
  return b;
}
