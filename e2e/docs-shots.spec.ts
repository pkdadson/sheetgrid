import { expect, test } from "@playwright/test";
import { goToMatrix, goToObjects, goToPerf, grid, openDemo } from "./helpers";

// One spec, two Playwright projects: `docs-shots` (desktop) and
// `docs-shots-mobile` (Pixel 5). Each test pins itself to one project via
// `test.skip` and writes to a hardcoded path under `docs/assets/`.
// Regenerate all shots: `pnpm docs:shots`.

const DESKTOP = "docs-shots";
const MOBILE = "docs-shots-mobile";

test.describe("docs screenshots", () => {
  test("objects — desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP, "desktop-only");
    await openDemo(page);
    await goToObjects(page);
    await expect(grid(page, "grid-objects").getByText("Ada Lovelace")).toBeVisible();
    await page.screenshot({ path: "docs/assets/objects/desktop.png", fullPage: false });
  });

  test("objects — mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== MOBILE, "mobile-only");
    await openDemo(page);
    await goToObjects(page);
    await expect(grid(page, "grid-objects").getByText("Ada Lovelace")).toBeVisible();
    await page.screenshot({ path: "docs/assets/objects/mobile.png", fullPage: false });
  });

  test("objects — detail (selected cell)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP, "desktop-only");
    await openDemo(page);
    await goToObjects(page);
    const g = grid(page, "grid-objects");
    // Click a numeric cell — the active-cell outline reads more clearly against
    // right-aligned numeric content than against text cells nested in a group row.
    await g.getByText("98").first().click();
    await expect(g.locator('[data-active="true"]')).toHaveText("98");
    await page.screenshot({ path: "docs/assets/objects/detail.png", fullPage: false });
  });

  test("matrix — desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP, "desktop-only");
    await openDemo(page);
    await goToMatrix(page);
    await expect(grid(page, "grid-matrix").getByText("Widgets")).toBeVisible();
    await page.screenshot({ path: "docs/assets/matrix/desktop.png", fullPage: false });
  });

  test("perf — desktop initial", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP, "desktop-only");
    await openDemo(page);
    await goToPerf(page);
    const g = grid(page, "grid-perf");
    await expect(g.getByText("R0C0")).toBeVisible();
    await page.screenshot({ path: "docs/assets/perf/desktop.png", fullPage: false });
  });

  test("perf — scrolled", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP, "desktop-only");
    await openDemo(page);
    await goToPerf(page);
    const g = grid(page, "grid-perf");
    await expect(g.getByText("R0C0")).toBeVisible();
    await g.evaluate((el) => {
      el.scrollTop = 5000;
    });
    await g.dispatchEvent("scroll");
    await page.waitForTimeout(200);
    // Confirm the initial rows have scrolled out of view before capturing.
    await expect(g.getByText("R0C0")).toHaveCount(0);
    await page.screenshot({ path: "docs/assets/perf/scrolled.png", fullPage: false });
  });

  test("a11y — keyboard focus ring", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP, "desktop-only");
    await openDemo(page);
    await goToObjects(page);
    const g = grid(page, "grid-objects");
    // Click into the grid, then navigate with arrow keys. Both the outer
    // grid focus ring (keyboard focus on the scroll pane) and the per-cell
    // active outline should be visible — that is the true a11y story.
    await g.getByText("Ada Lovelace").click();
    await g.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await expect(g.locator('[data-active="true"]')).toBeVisible();
    await page.screenshot({ path: "docs/assets/a11y/focus.png", fullPage: false });
  });
});
