import { expect, test } from "@playwright/test";
import { goToPerf, grid, openDemo } from "./helpers";

test.describe("Perf grid — virtualization UX", () => {
  test.beforeEach(async ({ page }) => {
    await openDemo(page);
    await goToPerf(page);
  });

  test("renders virtualized grid with default 10k × 50", async ({ page }) => {
    const g = grid(page, "grid-perf");
    await expect(g).toBeVisible();
    await expect(
      g.locator("th.eg-th-leaf", { hasText: "Col 1" }).first(),
    ).toBeVisible();
    await expect(g.getByText("R0C0")).toBeVisible();
    const cells = g.getByRole("gridcell");
    const count = await cells.count();
    // Full 10k×50 would be 500k cells; window is much smaller
    expect(count).toBeLessThan(5000);
  });

  test("vertical scroll keeps grid interactive", async ({ page }) => {
    const g = grid(page, "grid-perf");
    await g.evaluate((el) => {
      el.scrollTop = 5000;
    });
    await g.dispatchEvent("scroll");
    await page.waitForTimeout(200);
    const stillHasCells = await g.getByRole("gridcell").count();
    expect(stillHasCells).toBeGreaterThan(0);
    await expect(g).toBeVisible();
  });

  test("horizontal scroll windows columns", async ({ page }) => {
    const g = grid(page, "grid-perf");
    await expect(
      g.locator("th.eg-th-leaf", { hasText: /^Col 1$/ }).first(),
    ).toBeVisible();

    await g.evaluate((el) => {
      el.scrollLeft = 3000;
    });
    await g.dispatchEvent("scroll");
    await page.waitForTimeout(300);

    // Col 1 should leave the window
    await expect(
      g.locator("th.eg-th-leaf", { hasText: /^Col 1$/ }),
    ).toHaveCount(0);
    const headers = g.locator("th.eg-th-leaf");
    await expect(headers.first()).toBeVisible();
    const texts = await headers.allTextContents();
    expect(texts.some((t) => /Col\s*(3\d|4\d|5\d)/.test(t))).toBe(true);
  });

  test("can switch row and column counts", async ({ page }) => {
    await page.getByTestId("perf-rows").selectOption("1000");
    await page.getByTestId("perf-cols").selectOption("20");
    const g = grid(page, "grid-perf");
    await expect(g.getByText("R0C0")).toBeVisible();
    // Col 20 may be virtualized off-screen — scroll to end
    await g.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await g.dispatchEvent("scroll");
    await page.waitForTimeout(200);
    await expect(
      g.locator("th.eg-th-leaf", { hasText: /^Col 20$/ }),
    ).toBeVisible();
    await expect(
      g.locator("th.eg-th-leaf", { hasText: /^Col 21$/ }),
    ).toHaveCount(0);
  });

  test("respects density toggle (compact)", async ({ page }) => {
    const g = grid(page, "grid-perf");
    // Default may be comfortable; force compact via demo chrome
    const densityBtn = page.getByTestId("toggle-density");
    if ((await g.getAttribute("data-density")) !== "compact") {
      await densityBtn.click();
    }
    await expect(g).toHaveAttribute("data-density", "compact");
  });

  test("scroll position does not drift after virtualization update", async ({
    page,
  }) => {
    const g = grid(page, "grid-perf");
    // CSS scroll anchoring can fight spacers and jump scrollTop unless disabled
    for (const target of [200, 1000, 5000, 12000]) {
      await g.evaluate((el, t) => {
        el.scrollTop = t;
      }, target);
      await page.waitForTimeout(120);
      const settled = await g.evaluate((el) => el.scrollTop);
      expect(Math.abs(settled - target)).toBeLessThanOrEqual(2);
    }
  });

  test("keyboard navigation scrolls active cell into the virtual window", async ({
    page,
  }) => {
    const g = grid(page, "grid-perf");
    await g.getByText("R0C0").click();
    await g.focus();
    // Move far down past the initial window
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("ArrowDown");
    }
    await page.waitForTimeout(150);
    const active = g.locator('[data-active="true"]');
    await expect(active).toBeVisible();
    const text = (await active.textContent())?.trim() ?? "";
    expect(text).toMatch(/^R\d+C0$/);
    const row = Number(/^R(\d+)C0$/.exec(text)?.[1] ?? -1);
    expect(row).toBeGreaterThanOrEqual(40);
    // Active cell should be in viewport (not only selected in state)
    const box = await active.boundingBox();
    const gridBox = await g.boundingBox();
    expect(box).toBeTruthy();
    expect(gridBox).toBeTruthy();
    expect(box!.y).toBeGreaterThanOrEqual(gridBox!.y - 2);
    expect(box!.y + box!.height).toBeLessThanOrEqual(
      gridBox!.y + gridBox!.height + 2,
    );
  });

  test("shrinking dataset clamps scroll within content", async ({ page }) => {
    const g = grid(page, "grid-perf");
    await page.getByTestId("perf-rows").selectOption("10000");
    await page.getByTestId("perf-cols").selectOption("50");
    await page.waitForTimeout(200);
    await g.evaluate((el) => {
      el.scrollTop = 200_000;
    });
    await page.waitForTimeout(100);
    await page.getByTestId("perf-rows").selectOption("1000");
    await page.waitForTimeout(300);
    const metrics = await g.evaluate((el) => ({
      scrollTop: el.scrollTop,
      maxTop: Math.max(0, el.scrollHeight - el.clientHeight),
      cells: el.querySelectorAll('[role="gridcell"]').length,
    }));
    expect(metrics.scrollTop).toBeLessThanOrEqual(metrics.maxTop + 2);
    expect(metrics.cells).toBeGreaterThan(0);
    expect(metrics.cells).toBeLessThan(5000);
  });
});
