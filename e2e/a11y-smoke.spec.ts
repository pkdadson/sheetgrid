import { expect, test } from "@playwright/test";
import { goToMatrix, goToObjects, openDemo } from "./helpers";

test.describe("Accessibility smoke", () => {
  test("objects grid exposes grid roles", async ({ page }) => {
    await openDemo(page);
    await goToObjects(page);
    const g = page.getByTestId("grid-objects");
    await expect(g).toHaveAttribute("role", "grid");
    await expect(g.getByRole("columnheader").first()).toBeVisible();
    await expect(g.getByRole("gridcell").first()).toBeVisible();
    await expect(g.getByRole("row").first()).toBeVisible();
  });

  test("matrix grid is keyboard focusable", async ({ page }) => {
    await openDemo(page);
    await goToMatrix(page);
    const g = page.getByTestId("grid-matrix");
    await g.focus();
    await expect(g).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(
      g.locator('[data-active="true"], [aria-selected="true"]').first(),
    ).toBeVisible();
  });

  test("reject validation keeps prior value after Escape", async ({ page }) => {
    await openDemo(page);
    await goToObjects(page);
    const g = page.getByTestId("grid-objects");
    await g.getByText("Ada Lovelace").dblclick();
    const input = g.locator("input.eg-editor");
    await input.fill("");
    await input.press("Enter");
    // Still editing after reject with invalid state for a11y
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByTestId("grid-objects-status")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    await input.press("Escape");
    await expect(g.getByText("Ada Lovelace")).toBeVisible();
    // Escape clears reject-mode error on unchanged value
    await expect(g.locator("td.eg-td[aria-invalid='true']")).toHaveCount(0);
    await g.getByText("Ada Lovelace").click();
    await expect(g.locator('[data-active="true"]')).toBeVisible();
  });

  test("group toggles expose accessible names", async ({ page }) => {
    await openDemo(page);
    await goToObjects(page);
    const g = page.getByTestId("grid-objects");
    const toggle = g.getByRole("button", { name: /Collapse group EU/i });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  test("checkboxes expose accessible names from column headers", async ({
    page,
  }) => {
    await openDemo(page);
    await goToObjects(page);
    const g = page.getByTestId("grid-objects");
    const boxes = g.getByRole("checkbox", { name: "Active" });
    await expect(boxes.first()).toBeVisible();
    expect(await boxes.count()).toBeGreaterThanOrEqual(1);
  });
});
