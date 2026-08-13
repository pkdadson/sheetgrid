import { expect, test } from "@playwright/test";

test.describe("Agent loop — React demo", () => {
  test("fill → undo → snapshot → mutate → restore", async ({ page }) => {
    await page.goto("http://127.0.0.1:5177");
    await page.getByRole("tab", { name: /agent/i }).click();

    const input = page.getByTestId("agent-input");
    const run = page.getByTestId("agent-run");

    // fill
    await input.fill("fill");
    await run.click();
    await expect(page.locator("text=First contact 2026-08-11").first()).toBeVisible();

    // undo
    await input.fill("undo");
    await run.click();
    await expect(page.locator("text=First contact 2026-08-11")).toHaveCount(0);

    // snapshot
    await input.fill("snapshot");
    await run.click();

    // fill again (mutate)
    await input.fill("fill");
    await run.click();

    // restore
    await input.fill("restore");
    await run.click();
    await expect(page.locator("text=First contact 2026-08-11")).toHaveCount(0);

    // Log should show a mix of cell.changed, transaction.committed events.
    const log = await page.getByTestId("agent-log").textContent();
    expect(log).toMatch(/cell\.changed|transaction/);
  });
});
