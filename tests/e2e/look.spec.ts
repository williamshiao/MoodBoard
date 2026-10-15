import { expect, type Page, test } from "@playwright/test";
import { dropAll, items } from "./helpers";

const filterOf = (page: Page, index = 0) =>
  items(page)
    .nth(index)
    .evaluate((el) => getComputedStyle(el.querySelector("img") as HTMLElement).filter);

/** Ids of the images from bottom to top of the stack. */
const stackOrder = (page: Page) =>
  items(page).evaluateAll((els) =>
    els
      .map((el) => ({ id: el.getAttribute("data-id"), z: Number((el as HTMLElement).style.zIndex) }))
      .sort((a, b) => a.z - b.z)
      .map((e) => e.id),
  );

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("inverts and desaturates from the selection bar and the keyboard", async ({ page }) => {
  await dropAll(page, [[500, 360]]);
  const invert = page.getByRole("button", { name: "Invert" });
  await invert.click();
  await expect(invert).toHaveAttribute("aria-pressed", "true");
  expect(await filterOf(page)).toBe("invert(1)");
  await page.keyboard.press("d");
  expect(await filterOf(page)).toBe("invert(1) grayscale(1)");
  await page.keyboard.press("i");
  expect(await filterOf(page)).toBe("grayscale(1)");
  await page.getByRole("button", { name: "Reset" }).click();
  expect(await filterOf(page)).toBe("none");
  await page.keyboard.press("Control+z");
  expect(await filterOf(page)).toBe("grayscale(1)");
});

test("keeps colour edits after a reload", async ({ page }) => {
  await dropAll(page, [[500, 360]]);
  await page.keyboard.press("d");
  await page.waitForTimeout(400); // autosave is debounced
  await page.reload();
  expect(await filterOf(page)).toBe("grayscale(1)");
});

test("changes the stacking order", async ({ page }) => {
  // Three overlapping images, each dropped on top of the last.
  await dropAll(page, [
    [400, 340],
    [460, 360],
    [520, 380],
  ]);
  const [a, b, c] = await stackOrder(page);

  // The top image is selected; send it to the back, then one step forward.
  await page.getByRole("button", { name: "To back" }).click();
  expect(await stackOrder(page)).toEqual([c, a, b]);
  await page.keyboard.press("Control+BracketRight");
  expect(await stackOrder(page)).toEqual([a, c, b]);
  await page.keyboard.press("Control+Shift+BracketRight");
  expect(await stackOrder(page)).toEqual([a, b, c]);

  // Clicking an image selects it without lifting it above the others.
  await page.mouse.click(240, 170); // only the bottom image is here
  expect(await stackOrder(page)).toEqual([a, b, c]);
  await expect(page.getByText("1 image")).toBeVisible();
});
