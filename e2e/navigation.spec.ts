import { expect, test } from "@playwright/test";
import { goToMatrix, goToObjects, goToPerf, openDemo } from "./helpers";

test.describe("Demo navigation & shell", () => {
  test.beforeEach(async ({ page }) => {
    await openDemo(page);
  });

  test("loads SheetGrid demo chrome", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "SheetGrid" })).toBeVisible();
    await expect(page.getByTestId("nav-objects")).toBeVisible();
    await expect(page.getByTestId("nav-matrix")).toBeVisible();
    await expect(page.getByTestId("nav-perf")).toBeVisible();
  });

  test("defaults to Objects page with a grid", async ({ page }) => {
    await expect(page.getByTestId("panel-objects")).toBeVisible();
    await expect(page.getByTestId("grid-objects")).toBeVisible();
    await expect(page.getByTestId("grid-objects")).toHaveAttribute(
      "role",
      "grid",
    );
  });

  test("switches between Objects, Matrix, and Perf", async ({ page }) => {
    await goToMatrix(page);
    await expect(page.getByRole("heading", { name: "2D matrix data" })).toBeVisible();

    await goToPerf(page);
    await expect(
      page.getByRole("heading", { name: "Performance playground" }),
    ).toBeVisible();

    await goToObjects(page);
    await expect(page.getByRole("heading", { name: "Object rows" })).toBeVisible();
  });

  test("theme and density toggles update chrome", async ({ page }) => {
    const html = page.locator("html");
    const themeBefore = await html.getAttribute("data-theme");
    await page.getByTestId("toggle-theme").click();
    const themeAfter = themeBefore === "dark" ? "light" : "dark";
    await expect(html).toHaveAttribute("data-theme", themeAfter);

    const gridEl = page.getByTestId("grid-objects");
    const before = await gridEl.getAttribute("data-density");
    await page.getByTestId("toggle-density").click();
    const after = await gridEl.getAttribute("data-density");
    expect(after).not.toBe(before);
  });

  test("hash routes open Matrix and Perf pages", async ({ page }) => {
    await page.goto("/#matrix");
    await expect(page.getByTestId("panel-matrix")).toBeVisible();
    await page.goto("/#perf");
    await expect(page.getByTestId("panel-perf")).toBeVisible();
  });
});
