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
    await g.getByText("Ada Lovelace").click();
    await expect(g.locator('[data-active="true"]')).toContainText("Ada Lovelace");
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
});
