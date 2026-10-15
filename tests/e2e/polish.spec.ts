import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { dropAll, items } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // Shortcuts are attached once the app has mounted.
  await expect(page.getByText("Drop images anywhere")).toBeVisible();
});

test("saves the board as a PNG picture", async ({ page }, info) => {
  await dropAll(page, [
    [400, 300],
    [800, 400],
  ]);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG" }).click();
  const file = info.outputPath("board.png");
  await (await download).saveAs(file);
  expect((await download).suggestedFilename()).toBe("board.png");

  const bytes = readFileSync(file);
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  // Width and height sit in the IHDR chunk; the picture covers both images plus padding.
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  expect(width).toBeGreaterThan(400);
  expect(height).toBeGreaterThan(100);
});

test("opens the shortcut sheet with ? and the toolbar button", async ({ page }) => {
  const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await page.keyboard.press("?");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Group / ungroup")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await page.getByRole("button", { name: "Shortcuts", exact: true }).click();
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();
});

test("opens offline once it has been visited", async ({ page, context }) => {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await dropAll(page, [[500, 360]]);
  await page.waitForTimeout(400); // autosave is debounced
  await context.setOffline(true);
  await page.reload();
  await expect(items(page)).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Fit" })).toBeVisible();
});
