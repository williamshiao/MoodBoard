import { expect, test } from "@playwright/test";
import { box, drop, items, jpeg } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Drop images anywhere")).toBeVisible();
});

test("drops a file and an image dragged from a web page", async ({ page }) => {
  await drop(page, 300, 300, "file");
  await drop(page, 800, 400, "google-html");
  await expect(items(page)).toHaveCount(2);
  await expect(page.getByText("Drop images anywhere")).toBeHidden();
  // Dragged-page images are copied locally, not left as links.
  await expect(page.locator(".linked")).toHaveCount(0);
});

test("pastes an image from the clipboard", async ({ page }) => {
  await page.evaluate((jpeg) => {
    const dt = new DataTransfer();
    dt.items.add(
      new File([Uint8Array.from(atob(jpeg), (c) => c.charCodeAt(0))], "image.jpg", { type: "image/jpeg" }),
    );
    const event = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true });
    // Firefox ignores clipboardData in the constructor (real pastes still carry it), so attach it directly.
    if (!event.clipboardData?.files.length) Object.defineProperty(event, "clipboardData", { value: dt });
    window.dispatchEvent(event);
  }, jpeg);
  await expect(items(page)).toHaveCount(1);
});

test("moves, resizes, undoes and redoes", async ({ page }) => {
  await drop(page, 400, 300, "file");
  const start = await box(page);

  await page.mouse.move(400, 300);
  await page.mouse.down();
  await page.mouse.move(500, 350, { steps: 5 });
  await page.mouse.up();
  const moved = await box(page);
  expect(moved.x - start.x).toBeCloseTo(100, 0);

  const grip = page.locator('.item.selected [data-handle="se"]');
  const g = await grip.boundingBox();
  if (!g) throw new Error("no grip");
  await page.mouse.move(g.x + 7, g.y + 7);
  await page.mouse.down();
  await page.mouse.move(g.x + 107, g.y + 7, { steps: 5 });
  await page.mouse.up();
  const resized = await box(page);
  expect(resized.width / resized.height).toBeCloseTo(start.width / start.height, 1);
  expect(resized.width).toBeGreaterThan(moved.width + 50);

  await page.keyboard.press("Control+z");
  expect((await box(page)).width).toBeCloseTo(moved.width, 0);
  await page.keyboard.press("Control+z");
  expect((await box(page)).x).toBeCloseTo(start.x, 0);
  await page.keyboard.press("Control+Shift+z");
  expect((await box(page)).x).toBeCloseTo(moved.x, 0);
});

test("deletes with the key and the × button, and undo brings it back", async ({ page }) => {
  await drop(page, 300, 300, "file");
  await drop(page, 700, 300, "file");
  await page.keyboard.press("Delete");
  await expect(items(page)).toHaveCount(1);
  await items(page).first().hover();
  await page.getByRole("button", { name: "Remove image" }).click();
  await expect(items(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(items(page)).toHaveCount(1);
});

test("zooms toward the cursor and pans the board", async ({ page }) => {
  await drop(page, 600, 400, "file");
  await page.mouse.move(600, 400);
  await page.mouse.wheel(0, -400);
  await expect(page.locator(".toolbar .zoom")).not.toHaveText("100%");

  const before = await box(page);
  await page.mouse.move(20, 700);
  await page.mouse.down();
  await page.mouse.move(120, 650, { steps: 4 });
  await page.mouse.up();
  const after = await box(page);
  expect(after.x - before.x).toBeCloseTo(100, 0);
  expect(after.y - before.y).toBeCloseTo(-50, 0);
});

test("keeps the board after a reload", async ({ page }) => {
  await drop(page, 300, 300, "file");
  await drop(page, 700, 400, "file");
  await page.waitForTimeout(400); // autosave is debounced
  await page.reload();
  await expect(items(page)).toHaveCount(2);
});

test("clear is undoable", async ({ page }) => {
  await drop(page, 300, 300, "file");
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(items(page)).toHaveCount(0);
  await page.keyboard.press("Control+z");
  await expect(items(page)).toHaveCount(1);
});

test("exports a .moodboard file and imports it back", async ({ page }, info) => {
  await drop(page, 300, 300, "file");
  await drop(page, 700, 400, "google-html");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const file = info.outputPath("board.moodboard");
  await (await download).saveAs(file);

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(items(page)).toHaveCount(0);
  await page.getByTestId("import-input").setInputFiles(file);
  await expect(items(page)).toHaveCount(2);
});
