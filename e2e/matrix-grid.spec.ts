import { expect, test } from "@playwright/test";
import { goToMatrix, grid, openDemo } from "./helpers";

test.describe("2D Matrix grid", () => {
  test.beforeEach(async ({ page }) => {
    await openDemo(page);
    await goToMatrix(page);
  });

  test("renders header row and body values", async ({ page }) => {
    const g = grid(page, "grid-matrix");
    await expect(g.getByRole("columnheader", { name: "Product" })).toBeVisible();
    await expect(g.getByRole("columnheader", { name: "Q1" })).toBeVisible();
    await expect(g.getByText("Widgets")).toBeVisible();
    await expect(g.getByText("Gadgets")).toBeVisible();
    await expect(g.getByText("120")).toBeVisible();
  });

  test("edits a matrix cell", async ({ page }) => {
    const g = grid(page, "grid-matrix");
    await g.getByText("Widgets").dblclick();
    const input = g.locator("input.eg-editor");
    await input.fill("WidgetX");
    await input.press("Enter");
    await expect(g.getByText("WidgetX")).toBeVisible();
  });

  test("selects and navigates with keyboard", async ({ page }) => {
    const g = grid(page, "grid-matrix");
    await g.getByText("Widgets").click();
    await g.focus();
    await page.keyboard.press("ArrowRight");
    await expect(g.locator('[data-active="true"]')).toBeVisible();
    await expect(g.locator('[data-active="true"]')).toContainText("120");
  });

  test("paste TSV into selection", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const g = grid(page, "grid-matrix");
    await page.evaluate(() => navigator.clipboard.writeText("NewProd\t999"));
    await g.getByText("Doodads").click();
    await g.focus();
    await page.keyboard.press("ControlOrMeta+v");
    await expect(g.getByText("NewProd")).toBeVisible({ timeout: 5000 });
    await expect(g.getByText("999")).toBeVisible();
  });
});
