import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

const board = (page: import("@playwright/test").Page) => page.getByTestId("board");

test("changes the background color and grid, and keeps them after a reload", async ({ page }) => {
  await page.getByRole("button", { name: "Board" }).click();
  const panel = page.getByRole("dialog", { name: "Board settings" });
  await expect(panel).toBeVisible();

  await panel.getByRole("button", { name: "Background #f4f1ea" }).click();
  await panel.getByRole("button", { name: "Graph" }).click();
  await expect(board(page)).toHaveCSS("background-color", "rgb(244, 241, 234)");
  await expect(board(page)).toHaveCSS(
    "background-image",
    /linear-gradient.*linear-gradient.*linear-gradient/,
  );
  // Start instructions switch to dark text on a light board.
  await expect(page.getByText("Drop images anywhere")).toHaveCSS("color", "rgb(27, 27, 30)");

  await page.waitForTimeout(400); // autosave is debounced
  await page.reload();
  await expect(board(page)).toHaveCSS("background-color", "rgb(244, 241, 234)");
  await expect(board(page)).toHaveCSS("background-image", /linear-gradient/);
});

test("accepts a custom color and can hide the grid", async ({ page }) => {
  await page.getByRole("button", { name: "Board" }).click();
  await page.getByLabel("Custom background color").fill("#336699");
  await page.getByRole("button", { name: "None" }).click();
  await expect(board(page)).toHaveCSS("background-color", "rgb(51, 102, 153)");
  await expect(board(page)).toHaveCSS("background-image", "none");
});

test("closes the panel with Escape or a click on the board", async ({ page }) => {
  const panel = page.getByRole("dialog", { name: "Board settings" });
  await page.getByRole("button", { name: "Board" }).click();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await page.getByRole("button", { name: "Board" }).click();
  await page.mouse.click(700, 500);
  await expect(panel).toBeHidden();
});
