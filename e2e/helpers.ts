import { type Locator, type Page, expect } from "@playwright/test";

export async function openDemo(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("demo-nav")).toBeVisible();
}

export async function goToObjects(page: Page) {
  await page.getByTestId("nav-objects").click();
  await expect(page.getByTestId("panel-objects")).toBeVisible();
  await expect(page.getByTestId("grid-objects")).toBeVisible();
}

export async function goToMatrix(page: Page) {
  await page.getByTestId("nav-matrix").click();
  await expect(page.getByTestId("panel-matrix")).toBeVisible();
  await expect(page.getByTestId("grid-matrix")).toBeVisible();
}

export async function goToPerf(page: Page) {
  await page.getByTestId("nav-perf").click();
  await expect(page.getByTestId("panel-perf")).toBeVisible();
  await expect(page.getByTestId("grid-perf")).toBeVisible();
}

export function grid(page: Page, testId = "grid-objects"): Locator {
  return page.getByTestId(testId);
}

export function cells(page: Page, testId = "grid-objects"): Locator {
  return grid(page, testId).getByRole("gridcell");
}

export function headers(page: Page, testId = "grid-objects"): Locator {
  return grid(page, testId).getByRole("columnheader");
}

/** Double-click a cell by visible text, edit, commit with Enter. */
export async function editCellByText(
  page: Page,
  cellText: string,
  nextValue: string,
  testId = "grid-objects",
) {
  const cell = grid(page, testId)
    .getByRole("gridcell", { name: cellText })
    .first();
  await cell.dblclick();
  const input = grid(page, testId).locator("input.eg-editor, select.eg-editor");
  await expect(input).toBeVisible();
  if (await input.evaluate((el) => el.tagName === "SELECT")) {
    await input.selectOption(nextValue);
  } else {
    await input.fill(nextValue);
    await input.press("Enter");
  }
}
