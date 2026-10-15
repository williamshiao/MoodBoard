import { expect, type Page, test } from "@playwright/test";
import { box, dropAll, items } from "./helpers";

const transformOf = (page: Page, index = 0) =>
  items(page)
    .nth(index)
    .evaluate((el) => ({
      item: el.style.transform,
      img: (el.querySelector("img") as HTMLElement).style.transform,
    }));

async function dragBy(page: Page, from: { x: number; y: number }, dx: number, dy: number) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 6 });
  await page.mouse.up();
}

async function center(page: Page, selector: string) {
  const b = await page.locator(selector).boundingBox();
  if (!b) throw new Error(`${selector} not visible`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("stretches an image horizontally from a side handle", async ({ page }) => {
  await dropAll(page, [[500, 360]]);
  const before = await box(page);
  await dragBy(page, await center(page, '[data-handle="e"]'), 120, 40);
  const after = await box(page);
  expect(after.width).toBeCloseTo(before.width + 120, 0);
  expect(after.height).toBeCloseTo(before.height, 0);
  expect(after.x).toBeCloseTo(before.x, 0);
});

test("rotates with the rotate handle, snapping with Shift", async ({ page }) => {
  await dropAll(page, [[500, 360]]);
  const b = await box(page);
  const c = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const handle = await center(page, '[data-role="rotate"]');
  await page.keyboard.down("Shift");
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  // Pull the handle around to the right of the image: a quarter turn clockwise.
  await page.mouse.move(c.x + 150, c.y + 3, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  expect((await transformOf(page)).item).toBe("rotate(90deg)");
  await page.keyboard.press("Control+z");
  expect((await transformOf(page)).item).toBe("");
});

test("mirrors and rotates from the keyboard and the selection bar", async ({ page }) => {
  await dropAll(page, [[500, 360]]);
  await page.keyboard.press("h");
  expect((await transformOf(page)).img).toBe("scale(-1, 1)");
  await page.getByRole("button", { name: "Flip ↕" }).click();
  expect((await transformOf(page)).img).toBe("scale(-1, -1)");
  await page.keyboard.press("r");
  expect((await transformOf(page)).item).toBe("rotate(90deg)");
  await page.keyboard.press("Shift+r");
  expect((await transformOf(page)).item).toBe("");
  await page.getByRole("button", { name: "Reset" }).click();
  expect(await transformOf(page)).toEqual({ item: "", img: "" });
});

test("Shift+click selects several images, which then move together", async ({ page }) => {
  await dropAll(page, [
    [300, 300],
    [900, 300],
  ]);
  await page.keyboard.down("Shift");
  await page.mouse.click(300, 300);
  await page.keyboard.up("Shift");
  await expect(page.getByText("2 images")).toBeVisible();
  // Resize handles are only offered for a single image.
  await expect(page.locator("[data-handle]")).toHaveCount(0);

  const [a, b] = [await box(page, 0), await box(page, 1)];
  await dragBy(page, { x: 900, y: 300 }, -60, 80);
  const [a2, b2] = [await box(page, 0), await box(page, 1)];
  for (const [p, q] of [
    [a, a2],
    [b, b2],
  ] as const) {
    expect(q.x - p.x).toBeCloseTo(-60, 0);
    expect(q.y - p.y).toBeCloseTo(80, 0);
  }
});

test("Shift+drag on empty space draws a selection box", async ({ page }) => {
  await dropAll(page, [
    [300, 300],
    [900, 300],
  ]);
  await page.mouse.click(640, 600); // clear the selection
  await expect(page.getByRole("toolbar", { name: "Selected images" })).toBeHidden();

  await page.keyboard.down("Shift");
  await page.mouse.move(40, 690);
  await page.mouse.down();
  await page.mouse.move(400, 250, { steps: 6 });
  await expect(page.getByTestId("marquee")).toBeVisible();
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expect(page.getByText("1 image")).toBeVisible();
  await expect(page.getByTestId("marquee")).toBeHidden();
});

test("Ctrl+A then Delete removes everything in one undo step", async ({ page }) => {
  await dropAll(page, [
    [300, 300],
    [900, 300],
  ]);
  await page.keyboard.press("Control+a");
  await expect(page.getByText("2 images")).toBeVisible();
  await page.keyboard.press("Delete");
  await expect(items(page)).toHaveCount(0);
  await page.keyboard.press("Control+z");
  await expect(items(page)).toHaveCount(2);
});

test("keeps rotation and mirroring after a reload", async ({ page }) => {
  await dropAll(page, [[500, 360]]);
  await page.keyboard.press("r");
  await page.keyboard.press("h");
  await page.waitForTimeout(400); // autosave is debounced
  await page.reload();
  expect(await transformOf(page)).toEqual({ item: "rotate(90deg)", img: "scale(-1, 1)" });
});
