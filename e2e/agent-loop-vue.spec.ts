import { expect, test } from "@playwright/test";

test.describe("Agent loop — Vue demo", () => {
  test("fill → undo → snapshot → mutate → restore", async ({ page }) => {
    await page.goto("http://127.0.0.1:5178");
    await page.getByRole("tab", { name: /agent/i }).click();

    const input = page.getByTestId("agent-input");
    const run = page.getByTestId("agent-run");

    await input.fill("fill");
    await run.click();
    await expect(page.locator("text=First contact 2026-08-11").first()).toBeVisible();

    await input.fill("undo");
    await run.click();
    await expect(page.locator("text=First contact 2026-08-11")).toHaveCount(0);

    await input.fill("snapshot");
    await run.click();
    await input.fill("fill");
    await run.click();
    await input.fill("restore");
    await run.click();
    await expect(page.locator("text=First contact 2026-08-11")).toHaveCount(0);

    const log = await page.getByTestId("agent-log").textContent();
    expect(log).toMatch(/cell\.changed|transaction/);
  });
});
