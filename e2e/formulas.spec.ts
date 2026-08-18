import { type Locator, type Page, expect, test } from "@playwright/test";
import { goToMatrix, goToObjects, grid, openDemo } from "./helpers";

/**
 * Columns: Product | Q1 | Q2 | Q3 | Q4 | Total | Note
 * First body row (Widgets) is A1 in formula space.
 */
async function selectWidgetsTotal(page: Page, g: Locator) {
  // Always the Product column (first match), not a formula result that also says Widgets
  await g
    .getByRole("gridcell", { name: "Widgets", exact: true })
    .first()
    .click();
  await g.focus();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("ArrowRight");
  }
  const active = g.locator('[data-active="true"]');
  await expect(active).toBeVisible();
  return active;
}

async function commitFormula(page: Page, g: Locator, formula: string) {
  await page.keyboard.press("Enter");
  const input = g.locator("input.eg-editor");
  await expect(input).toBeVisible();
  await input.fill(formula);
  await input.press("Enter");
}

test.describe("Matrix formulas", () => {
  test.beforeEach(async ({ page }) => {
    await openDemo(page);
    await goToMatrix(page);
  });

  test("panel advertises formulas and Total column", async ({ page }) => {
    await expect(page.getByTestId("panel-matrix")).toContainText("formulas");
    const g = grid(page, "grid-matrix");
    await expect(g.getByRole("columnheader", { name: "Total" })).toBeVisible();
  });

  test("enters SUM formula and shows computed result", async ({ page }) => {
    const g = grid(page, "grid-matrix");
    await selectWidgetsTotal(page, g);
    // Widgets Q1..Q4: 120+140+135+160 = 555
    await commitFormula(page, g, "=SUM(B1:E1)");
    await expect(
      g.getByRole("gridcell", { name: "555", exact: true }),
    ).toBeVisible();
  });

  test("recalculates when a dependency changes", async ({ page }) => {
    const g = grid(page, "grid-matrix");
    await selectWidgetsTotal(page, g);
    await commitFormula(page, g, "=SUM(B1:E1)");
    await expect(
      g.getByRole("gridcell", { name: "555", exact: true }),
    ).toBeVisible();

    // Edit Q1 (120 → 220): click Widgets, one right to Q1
    await g
      .getByRole("gridcell", { name: "Widgets", exact: true })
      .first()
      .click();
    await g.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    const input = g.locator("input.eg-editor");
    await expect(input).toBeVisible();
    await input.fill("220");
    await input.press("Enter");

    // 220+140+135+160 = 655
    await expect(
      g.getByRole("gridcell", { name: "655", exact: true }),
    ).toBeVisible();
  });

  test("re-editing a formula cell shows formula source", async ({ page }) => {
    const g = grid(page, "grid-matrix");
    await selectWidgetsTotal(page, g);
    await commitFormula(page, g, "=B1+C1");
    await expect(
      g.getByRole("gridcell", { name: "260", exact: true }),
    ).toBeVisible();

    // Total is still active after commit in many grids; re-select Total and edit
    await selectWidgetsTotal(page, g);
    await page.keyboard.press("Enter");
    const input = g.locator("input.eg-editor");
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("=B1+C1");
    await input.press("Escape");
  });

  test("IF formula evaluates correctly", async ({ page }) => {
    const g = grid(page, "grid-matrix");
    // Note column is 6 steps right from Product
    await g
      .getByRole("gridcell", { name: "Widgets", exact: true })
      .first()
      .click();
    await g.focus();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("ArrowRight");
    }
    // Use a distinctive string that won't substring-match other cells
    await commitFormula(page, g, '=IF(B1>100,"big-q1","small-q1")');
    await expect(
      g.getByRole("gridcell", { name: "big-q1", exact: true }),
    ).toBeVisible();
  });

  test("division by zero surfaces #DIV/0!", async ({ page }) => {
    const g = grid(page, "grid-matrix");
    await selectWidgetsTotal(page, g);
    await commitFormula(page, g, "=1/0");
    await expect(
      g.getByRole("gridcell", { name: "#DIV/0!", exact: true }),
    ).toBeVisible();
  });

  test("unknown function surfaces #NAME?", async ({ page }) => {
    const g = grid(page, "grid-matrix");
    await selectWidgetsTotal(page, g);
    await commitFormula(page, g, "=NOTAFUNC(1)");
    await expect(
      g.getByRole("gridcell", { name: "#NAME?", exact: true }),
    ).toBeVisible();
  });

  test("arithmetic formula across cells", async ({ page }) => {
    const g = grid(page, "grid-matrix");
    await selectWidgetsTotal(page, g);
    await commitFormula(page, g, "=B1+C1");
    // 120+140
    await expect(
      g.getByRole("gridcell", { name: "260", exact: true }),
    ).toBeVisible();
  });

  test("paste formula with leading = commits as formula", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const g = grid(page, "grid-matrix");
    await selectWidgetsTotal(page, g);
    await page.evaluate(() => navigator.clipboard.writeText("=B1*2"));
    await g.focus();
    await page.keyboard.press("ControlOrMeta+v");
    // 120*2
    await expect(
      g.getByRole("gridcell", { name: "240", exact: true }),
    ).toBeVisible({
      timeout: 5000,
    });
  });

  test("click cells while editing formula inserts A1 refs", async ({
    page,
  }) => {
    const g = grid(page, "grid-matrix");
    await selectWidgetsTotal(page, g);
    await page.keyboard.press("Enter");
    const input = g.locator("input.eg-editor");
    await expect(input).toBeVisible();
    await input.fill("=");

    // Click Q1 (120) → should insert B1 without leaving edit mode
    await g.getByRole("gridcell", { name: "120", exact: true }).first().click();
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("=B1");
    await expect(g.locator("[data-formula-ref]")).toHaveCount(1);

    // Type operator then click Q2 (140) → append C1
    await input.focus();
    await input.press("End");
    await page.keyboard.type("+");
    await g.getByRole("gridcell", { name: "140", exact: true }).first().click();
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("=B1+C1");

    await input.press("Enter");
    await expect(
      g.getByRole("gridcell", { name: "260", exact: true }),
    ).toBeVisible();
  });

  test("drag across cells inserts a range into the formula", async ({
    page,
  }) => {
    const g = grid(page, "grid-matrix");
    await selectWidgetsTotal(page, g);
    await page.keyboard.press("Enter");
    const input = g.locator("input.eg-editor");
    await expect(input).toBeVisible();
    await input.fill("=SUM(");

    const q1 = g.getByRole("gridcell", { name: "120", exact: true }).first();
    const q4 = g.getByRole("gridcell", { name: "160", exact: true }).first();
    const b1 = await q1.boundingBox();
    const b4 = await q4.boundingBox();
    expect(b1 && b4).toBeTruthy();
    await page.mouse.move(b1!.x + b1!.width / 2, b1!.y + b1!.height / 2);
    await page.mouse.down();
    await page.mouse.move(b4!.x + b4!.width / 2, b4!.y + b4!.height / 2, {
      steps: 8,
    });
    await page.mouse.up();

    await expect(input).toBeVisible();
    const value = await input.inputValue();
    // B1:E1 for Widgets Q1..Q4
    expect(value).toMatch(/=SUM\(B1:E1\)?/);
    // close paren if user didn't type it — still valid if we only insert range
    if (!value.endsWith(")")) {
      await input.focus();
      await input.press("End");
      await page.keyboard.type(")");
    }
    await input.press("Enter");
    await expect(
      g.getByRole("gridcell", { name: "555", exact: true }),
    ).toBeVisible();
  });
});

test.describe("Object-row formulas", () => {
  test.beforeEach(async ({ page }) => {
    await openDemo(page);
    await goToObjects(page);
  });

  test("panel advertises formulas and Bonus column", async ({ page }) => {
    await expect(page.getByTestId("panel-objects")).toContainText("formulas");
    const g = grid(page, "grid-objects");
    await expect(g.getByRole("columnheader", { name: "Bonus" })).toBeVisible();
  });

  test("formula on object rows: typed A1 ref to Score", async ({ page }) => {
    const g = grid(page, "grid-objects");
    // Columns: A name, B role, C region, D score, E bonus, F active
    // Ada is store row 1 (A1). Score 98 → D1. Bonus =D1*0.1 → 9.8
    await g
      .getByRole("gridcell", { name: "Ada Lovelace", exact: true })
      .click();
    await g.focus();
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("ArrowRight");
    }
    await page.keyboard.press("Enter");
    const input = g.locator("input.eg-editor");
    await expect(input).toBeVisible();
    await input.fill("=D1*0.1");
    await input.press("Enter");
    await expect(
      g.getByRole("gridcell", { name: "9.8", exact: true }),
    ).toBeVisible();
  });

  test("click Score while editing Bonus inserts A1 ref", async ({ page }) => {
    const g = grid(page, "grid-objects");
    await g
      .getByRole("gridcell", { name: "Ada Lovelace", exact: true })
      .click();
    await g.focus();
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("ArrowRight");
    }
    await page.keyboard.press("Enter");
    const input = g.locator("input.eg-editor");
    await expect(input).toBeVisible();
    await input.fill("=");
    // Ada's score is 98
    await g.getByRole("gridcell", { name: "98", exact: true }).click();
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("=D1");
    await input.press("Enter");
    await expect(
      g.getByRole("gridcell", { name: "98", exact: true }),
    ).toHaveCount(2);
  });
});
