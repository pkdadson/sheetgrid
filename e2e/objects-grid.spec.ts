import { expect, test } from "@playwright/test";
import { goToObjects, grid, openDemo } from "./helpers";

test.describe("Objects grid — features", () => {
  test.beforeEach(async ({ page }) => {
    await openDemo(page);
    await goToObjects(page);
  });

  test("renders column header groups and leaf headers", async ({ page }) => {
    const g = grid(page);
    await expect(g.getByRole("columnheader", { name: "Person" })).toBeVisible();
    await expect(g.getByRole("columnheader", { name: "Work" })).toBeVisible();
    for (const name of ["Name", "Role", "Region", "Score", "Bonus", "Active"]) {
      const header = g.locator("th.eg-th-leaf", { hasText: new RegExp(`^${name}$`) });
      await expect(header).toBeAttached();
      await expect(header).toHaveCount(1);
    }
  });

  test("column group headers span children with non-zero leaf widths", async ({
    page,
  }) => {
    const g = grid(page);
    const person = g.getByRole("columnheader", { name: "Person" });
    const work = g.getByRole("columnheader", { name: "Work" });
    await expect(person).toHaveAttribute("colspan", "2");
    await expect(work).toHaveAttribute("colspan", "4");

    for (const name of ["Name", "Role", "Region", "Score", "Bonus", "Active"]) {
      const header = g.locator("th.eg-th-leaf", { hasText: new RegExp(`^${name}$`) });
      const box = await header.boundingBox();
      expect(box, `${name} header should be visible`).toBeTruthy();
      expect(box!.width, `${name} header width`).toBeGreaterThan(40);
    }

    // Leaf headers align with body cells (same x positions for first data row)
    const nameHeader = g.locator("th.eg-th-leaf", { hasText: /^Name$/ });
    const ada = g.getByRole("gridcell", { name: "Ada Lovelace" });
    const nameBox = await nameHeader.boundingBox();
    const adaBox = await ada.boundingBox();
    expect(nameBox).toBeTruthy();
    expect(adaBox).toBeTruthy();
    expect(Math.abs(nameBox!.x - adaBox!.x)).toBeLessThan(2);
  });

  test("renders seed data and row group headers", async ({ page }) => {
    const g = grid(page);
    await expect(g.getByText("Ada Lovelace")).toBeVisible();
    await expect(g.getByText("Grace Hopper")).toBeVisible();
    await expect(g.getByText(/EU\s*\(/)).toBeVisible();
    await expect(g.getByText(/US\s*\(/)).toBeVisible();
  });

  test("expands and collapses row groups", async ({ page }) => {
    const g = grid(page);
    // EU group contains Ada Lovelace
    const euRow = g.locator("tr.eg-group-row", { hasText: /EU\s*\(/ });
    const euToggle = euRow.locator(".eg-group-toggle");
    await expect(g.getByText("Ada Lovelace")).toBeVisible();
    await expect(euToggle).toHaveAttribute("aria-expanded", "true");

    await euToggle.evaluate((el: HTMLElement) => el.click());
    await expect(euToggle).toHaveAttribute("aria-expanded", "false");
    await expect(g.getByText("Ada Lovelace")).toHaveCount(0);

    await euToggle.evaluate((el: HTMLElement) => el.click());
    await expect(euToggle).toHaveAttribute("aria-expanded", "true");
    await expect(g.getByText("Ada Lovelace")).toBeVisible();
  });

  test("selects a cell on click and shows active state", async ({ page }) => {
    const g = grid(page);
    await g.getByText("Ada Lovelace").click();
    await expect(g.locator('[data-active="true"]')).toHaveCount(1);
    await expect(g.locator('[data-active="true"]')).toContainText("Ada Lovelace");
  });

  test("keyboard navigation moves active cell", async ({ page }) => {
    const g = grid(page);
    await g.getByText("Ada Lovelace").click();
    await g.focus();
    await page.keyboard.press("ArrowRight");
    const active = g.locator('[data-active="true"]');
    await expect(active).toBeVisible();
    await expect(active).not.toContainText("Ada Lovelace");
  });

  test("double-click edits text cell and commits on Enter", async ({ page }) => {
    const g = grid(page);
    await g.getByText("Ada Lovelace").dblclick();
    const input = g.locator("input.eg-editor");
    await expect(input).toBeVisible();
    await input.fill("Ada L.");
    await input.press("Enter");
    await expect(g.getByText("Ada L.")).toBeVisible();
    await expect(g.getByText("Ada Lovelace")).toHaveCount(0);
  });

  test("Escape cancels edit without saving", async ({ page }) => {
    const g = grid(page);
    await g.getByText("Grace Hopper").dblclick();
    const input = g.locator("input.eg-editor");
    await input.fill("Should Not Save");
    await input.press("Escape");
    await expect(g.getByText("Grace Hopper")).toBeVisible();
    await expect(g.getByText("Should Not Save")).toHaveCount(0);
  });

  test("required validation rejects empty name and keeps editor", async ({
    page,
  }) => {
    const g = grid(page);
    await g.getByText("Alan Turing").dblclick();
    const input = g.locator("input.eg-editor");
    await input.fill("");
    await input.press("Enter");
    // reject mode: do not commit; stay in edit with empty draft
    await expect(g.locator("input.eg-editor")).toBeVisible();
    await expect(g.locator("input.eg-editor")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(g.locator("td.eg-td[aria-invalid='true']")).toBeVisible();
    const status = page.getByTestId("grid-objects-status");
    await expect(status).toHaveAttribute("data-has-error", "true");
    await expect(status).toContainText(/required/i);
    await input.press("Escape");
    await expect(g.getByText("Alan Turing")).toBeVisible();
  });

  test("cut clears a required name cell and shows validation error", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const g = grid(page);
    await g.getByText("Claude Shannon").click();
    await g.focus();
    await page.keyboard.press("ControlOrMeta+x");
    await expect(g.getByText("Claude Shannon")).toHaveCount(0);
    await expect(g.locator("td.eg-td[aria-invalid='true']").first()).toBeVisible();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain("Claude Shannon");
  });

  test("boolean checkbox toggles without text editor", async ({ page }) => {
    const g = grid(page);
    const box = g.locator("input.eg-checkbox").nth(2); // Alan Turing false
    await box.scrollIntoViewIfNeeded();
    const before = await box.isChecked();
    await box.click({ force: true });
    await expect(box).toHaveJSProperty("checked", !before);
  });

  test("select cell opens select editor on double-click", async ({ page }) => {
    const g = grid(page);
    const roleCell = g
      .getByRole("gridcell")
      .filter({ hasText: /^Engineer$/ })
      .first();
    await roleCell.dblclick();
    const select = g.locator("select.eg-editor");
    await expect(select).toBeVisible();
    await select.selectOption("Researcher");
    await expect(g.getByText("Researcher").first()).toBeVisible();
  });

  test("number cell edits score", async ({ page }) => {
    const g = grid(page);
    await g.getByText("98").first().dblclick();
    const input = g.locator("input.eg-editor");
    await expect(input).toBeVisible();
    await input.fill("88");
    await input.press("Enter");
    await expect(g.getByText("88")).toBeVisible();
  });

  test("shift-click extends selection range", async ({ page }) => {
    const g = grid(page);
    await g.getByText("Ada Lovelace").click();
    await page.keyboard.down("Shift");
    await g.getByText("Claude Shannon").click();
    await page.keyboard.up("Shift");
    const selected = g.locator('[aria-selected="true"]');
    await expect(selected.first()).toBeVisible();
    expect(await selected.count()).toBeGreaterThan(1);
  });

  test("column header click selects column", async ({ page }) => {
    const g = grid(page);
    await g.locator("th.eg-th-leaf", { hasText: "Name" }).click();
    const selected = g.locator('[aria-selected="true"]');
    await expect(selected.first()).toBeVisible();
    expect(await selected.count()).toBeGreaterThanOrEqual(1);
  });

  test("resizes a column via header edge handle", async ({ page }) => {
    const g = grid(page);
    const nameHeader = g.locator("th.eg-th-leaf", { hasText: "Name" });
    const boxBefore = await nameHeader.boundingBox();
    expect(boxBefore).toBeTruthy();
    const handle = nameHeader.locator(".eg-col-resizer");
    const handleBox = await handle.boundingBox();
    expect(handleBox).toBeTruthy();

    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2 + 80,
      handleBox!.y + handleBox!.height / 2,
      { steps: 5 },
    );
    await page.mouse.up();

    const boxAfter = await nameHeader.boundingBox();
    expect(boxAfter).toBeTruthy();
    expect(boxAfter!.width).toBeGreaterThan(boxBefore!.width + 40);
  });

  test("reorders columns by dragging leaf headers", async ({ page }) => {
    const g = grid(page);
    const nameHeader = g.locator("th.eg-th-leaf", { hasText: "Name" });
    const roleHeader = g.locator("th.eg-th-leaf", { hasText: "Role" });

    const leafHeaders = g.locator("th.eg-th-leaf");
    const textsBefore = await leafHeaders.allTextContents();
    const nameIndexBefore = textsBefore.findIndex((t) => t.includes("Name"));
    const roleIndexBefore = textsBefore.findIndex((t) => t.includes("Role"));
    expect(nameIndexBefore).toBeGreaterThanOrEqual(0);
    expect(roleIndexBefore).toBeGreaterThan(nameIndexBefore);

    await nameHeader.dragTo(roleHeader);

    const textsAfter = await leafHeaders.allTextContents();
    const nameIndexAfter = textsAfter.findIndex((t) => t.includes("Name"));
    expect(nameIndexAfter).not.toBe(nameIndexBefore);
  });

  test("copy selection writes to clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const g = grid(page);
    await g.getByText("Ada Lovelace").click();
    await g.focus();
    await page.keyboard.press("ControlOrMeta+c");
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain("Ada Lovelace");
  });

  test("paste from clipboard updates a cell", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const g = grid(page);
    await page.evaluate(() => navigator.clipboard.writeText("Pasted Name"));
    await g.getByText("Claude Shannon").click();
    await g.focus();
    await page.keyboard.press("ControlOrMeta+v");
    await expect(g.getByText("Pasted Name")).toBeVisible({ timeout: 5000 });
  });
});
