import { expect, test } from "@playwright/test";
import { goToObjects, openDemo } from "./helpers";

test.describe("Sort UI on Objects demo", () => {
  test.beforeEach(async ({ page }) => {
    await openDemo(page);
    await goToObjects(page);
  });

  test("clicking Score header sorts ascending within row groups", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Sort by Score" }).click();

    // Within the EU group Alan (97) precedes Ada (98).
    const bodyRows = page.getByRole("row").filter({
      hasText: /Alan|Ada|Grace|Katherine|Claude/,
    });
    const firstText = await bodyRows.first().textContent();
    expect(firstText).toContain("Alan");
  });

  test("shift+click adds a secondary sort with numeric priority badges", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Sort by Name" }).click();
    await page
      .getByRole("button", { name: "Sort by Score" })
      .click({ modifiers: ["Shift"] });

    const nameHeader = page.getByRole("columnheader", { name: /Name/ });
    const scoreHeader = page.getByRole("columnheader", { name: /Score/ });
    await expect(nameHeader).toContainText("1");
    await expect(scoreHeader).toContainText("2");
  });

  test("aria-sort reflects direction after click", async ({ page }) => {
    const scoreHeader = page.getByRole("columnheader", { name: /Score/ });
    await expect(scoreHeader).toHaveAttribute("aria-sort", "none");
    await page.getByRole("button", { name: "Sort by Score" }).click();
    await expect(scoreHeader).toHaveAttribute("aria-sort", "ascending");
    await page.getByRole("button", { name: "Sort by Score" }).click();
    await expect(scoreHeader).toHaveAttribute("aria-sort", "descending");
  });
});
