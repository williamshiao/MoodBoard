import { expect, type Page, test } from "@playwright/test";
import { box, dropAll, items } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

/** Drags the image at `index` by its middle so its left edge lands `gap` px right of the other image. */
async function dragNextTo(page: Page, index: number, gap: number, opts: { alt?: boolean } = {}) {
  const a = await box(page, 1 - index);
  const b = await box(page, index);
  const from = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  // Offset vertically by a third of the height so no horizontal edges line up.
  const to = { x: a.x + a.width + gap + b.width / 2, y: a.y + a.height / 3 + b.height / 2 };
  if (opts.alt) await page.keyboard.down("Alt");
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
}

test("snaps a dragged image against another, unless snapping is off", async ({ page }) => {
  await dropAll(page, [
    [300, 300],
    [900, 500],
  ]);

  await dragNextTo(page, 1, 5);
  await expect(page.getByTestId("snap-guide").first()).toBeVisible();
  await page.mouse.up();
  await expect(page.getByTestId("snap-guide")).toHaveCount(0);
  const a = await box(page, 0);
  expect((await box(page, 1)).x).toBeCloseTo(a.x + a.width, 0);

  // Holding Alt skips snapping for one drag.
  await page.keyboard.press("Control+z");
  await dragNextTo(page, 1, 5, { alt: true });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  expect((await box(page, 1)).x).toBeCloseTo(a.x + a.width + 5, 0);

  // The toolbar toggle turns it off for good.
  await page.keyboard.press("Control+z");
  const toggle = page.getByRole("button", { name: "Snap" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await dragNextTo(page, 1, 5);
  await expect(page.getByTestId("snap-guide")).toHaveCount(0);
  await page.mouse.up();
  expect((await box(page, 1)).x).toBeCloseTo(a.x + a.width + 5, 0);
});

test("groups images so they select and move together", async ({ page }) => {
  await dropAll(page, [
    [300, 300],
    [800, 300],
  ]);
  await page.keyboard.press("Control+a");
  await page.getByRole("button", { name: "Group", exact: true }).click();
  await expect(page.getByTestId("group-outline")).toHaveCount(1);

  // Clicking one grouped image selects both, and dragging moves both.
  await page.mouse.click(1200, 650);
  await expect(page.getByTestId("group-outline")).toHaveCount(0);
  const first = await box(page, 0);
  const second = await box(page, 1);
  await page.mouse.move(first.x + 20, first.y + 20);
  await page.mouse.down();
  await page.mouse.move(first.x + 20, first.y + 120, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByText("2 images")).toBeVisible();
  expect((await box(page, 0)).y - first.y).toBeCloseTo(100, 0);
  expect((await box(page, 1)).y - second.y).toBeCloseTo(100, 0);

  // Double-click picks one out on its own.
  const one = await box(page, 1);
  await page.mouse.dblclick(one.x + 20, one.y + 20);
  await expect(page.getByText("1 image")).toBeVisible();

  // Ungroup, and a click selects just one image again.
  await page.keyboard.press("Control+Shift+g");
  await page.mouse.click(1200, 650);
  await page.mouse.click(one.x + 20, one.y + 20);
  await expect(page.getByText("1 image")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ungroup" })).toHaveCount(0);
});

test("keeps groups and the snap setting after a reload", async ({ page }) => {
  await dropAll(page, [
    [300, 300],
    [800, 300],
  ]);
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Control+g");
  await page.getByRole("button", { name: "Snap" }).click();
  await page.waitForTimeout(400); // autosave is debounced
  await page.reload();
  await expect(items(page)).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Snap" })).toHaveAttribute("aria-pressed", "false");
  const b = await box(page, 0);
  await page.mouse.click(b.x + 20, b.y + 20);
  await expect(page.getByText("2 images")).toBeVisible();
});
