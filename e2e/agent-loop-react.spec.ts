import { expect, test } from "@playwright/test";

test.describe("Agent loop — React demo (<AgentChat>)", () => {
  test("fill / undo natural-language commands drive the grid", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:5177");
    await page.getByRole("tab", { name: /agent/i }).click();

    const input = page.locator(".sg-agent-chat textarea");
    const send = page.getByRole("button", { name: /^send$/i });

    const gridArea = page.locator("[role='grid']");

    await input.fill("fill notes");
    await send.click();
    await expect(
      gridArea.locator("text=First contact 2026-08-11").first(),
    ).toBeVisible();

    await input.fill("undo");
    await send.click();
    await expect(gridArea.locator("text=First contact 2026-08-11")).toHaveCount(
      0,
    );
  });

  test("who is in the grid returns a text summary from the assistant", async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:5177");
    await page.getByRole("tab", { name: /agent/i }).click();
    const input = page.locator(".sg-agent-chat textarea");
    const send = page.getByRole("button", { name: /^send$/i });
    await input.fill("who is in the grid");
    await send.click();
    // Assistant summary appears in transcript.
    await expect(
      page.locator("text=/Ada.*Grace.*Katherine/i").first(),
    ).toBeVisible({ timeout: 8000 });
  });
});
