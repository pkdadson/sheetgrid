# Docs screenshots — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `pnpm docs:shots` command that regenerates 7 documentation screenshots from the `demo/` app via Playwright, embed them in the docs, delete the drifted loose PNGs at the repo root, and document the workflow in CONTRIBUTING.md.

**Architecture:** A single new Playwright spec (`e2e/docs-shots.spec.ts`) runs under two new Playwright projects (`docs-shots` for desktop, `docs-shots-mobile` for Pixel 5). The existing `chromium` project ignores the new spec, so `pnpm test:e2e` is unchanged. Each test hardcodes its output path via `page.screenshot({ path: "docs/assets/<feature>/<name>.png" })` and pins itself to one project via `test.skip`.

**Tech Stack:** Playwright 1.49, pnpm workspaces, the existing `apps/demo` Vite app (port 5177). Helpers at `e2e/helpers.ts` provide `openDemo`, `goToObjects`, `goToMatrix`, `goToPerf`.

**Design deviation from spec:** The spec listed `docs/core-guide.md` as an embed target, but that doc is about the headless `@sheetgrid/core` API and has no natural spot for demo UI screenshots. The Objects and Matrix hero shots instead go into `README.md` in a new "Preview" section. Perf and a11y embeds land in `docs/performance.md` and `docs/keyboard-a11y.md` as planned.

**"Detail" shot content:** The spec left this deliberately open. Concrete choice for this plan: click `Ada Lovelace` in the Objects tab so the cell shows `data-active="true"` (the visible selection state). This is the simplest, most stable framing and demonstrates the selection feature.

---

## File structure

**New files:**
- `e2e/docs-shots.spec.ts` — the single Playwright spec that produces all 7 shots.
- `docs/assets/objects/desktop.png`, `docs/assets/objects/mobile.png`, `docs/assets/objects/detail.png`
- `docs/assets/matrix/desktop.png`
- `docs/assets/perf/desktop.png`, `docs/assets/perf/scrolled.png`
- `docs/assets/a11y/focus.png`

**Modified files:**
- `playwright.config.ts` — add two projects, add `testIgnore` on `chromium`.
- `package.json` — add `docs:shots` script.
- `README.md` — insert Preview section with 4 images.
- `docs/performance.md` — embed 2 perf images.
- `docs/keyboard-a11y.md` — embed focus image.
- `CONTRIBUTING.md` — add Docs screenshots subsection.

**Deleted files (repo root):**
- `focus-tab1.png`, `focus-tab3.png`, `matrix.png`, `mobile-objects.png`, `objects-light-compact.png`, `objects-light.png`, `objects-view.png`, `perf-scrolled.png`, `perf.png`

---

## Task 1: Wire up Playwright projects, npm script, and empty spec

**Files:**
- Modify: `playwright.config.ts`
- Modify: `package.json`
- Create: `e2e/docs-shots.spec.ts` (empty skeleton)

- [ ] **Step 1: Edit `playwright.config.ts` — add `testIgnore` on chromium and two new projects.**

Replace the `projects` array (currently lines 21-26) with:

```ts
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /docs-shots\.spec\.ts$/,
    },
    {
      name: "docs-shots",
      testMatch: /docs-shots\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], screenshot: "off" },
    },
    {
      name: "docs-shots-mobile",
      testMatch: /docs-shots\.spec\.ts$/,
      use: { ...devices["Pixel 5"], screenshot: "off" },
    },
  ],
```

- [ ] **Step 2: Edit `package.json` — add the `docs:shots` script.**

Insert this line into the `scripts` block, immediately after `"test:e2e:report"`:

```json
    "docs:shots": "playwright test --project=docs-shots --project=docs-shots-mobile",
```

- [ ] **Step 3: Create `e2e/docs-shots.spec.ts` with an empty skeleton.**

```ts
import { expect, test } from "@playwright/test";
import { goToMatrix, goToObjects, goToPerf, grid, openDemo } from "./helpers";

// One spec, two Playwright projects: `docs-shots` (desktop) and
// `docs-shots-mobile` (Pixel 5). Each test pins itself to one project via
// `test.skip` and writes to a hardcoded path under `docs/assets/`.
// Regenerate all shots: `pnpm docs:shots`.

const DESKTOP = "docs-shots";
const MOBILE = "docs-shots-mobile";

test.describe("docs screenshots", () => {
  // Tasks 2-5 add tests here.
});
```

- [ ] **Step 4: Confirm main e2e run is unaffected.**

Run: `pnpm test:e2e --list`
Expected: The output lists tests for `chromium` only and does not include anything from `docs-shots.spec.ts`. Test count should match what it was before this change.

- [ ] **Step 5: Confirm `docs:shots` sees the spec.**

Run: `pnpm docs:shots --list`
Expected: The output shows `Total: 0 tests` (the describe block is empty). No error about missing spec file.

- [ ] **Step 6: Commit.**

```bash
git add playwright.config.ts package.json e2e/docs-shots.spec.ts
git commit -m "test(docs-shots): add Playwright projects and empty spec"
```

---

## Task 2: Objects shots (desktop, mobile, detail)

**Files:**
- Modify: `e2e/docs-shots.spec.ts`
- Produces: `docs/assets/objects/desktop.png`, `docs/assets/objects/mobile.png`, `docs/assets/objects/detail.png`

- [ ] **Step 1: Add three Objects tests to `e2e/docs-shots.spec.ts`.**

Insert inside the `test.describe("docs screenshots", ...)` block:

```ts
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
```

- [ ] **Step 2: Run docs:shots and confirm the three files exist.**

Run: `pnpm docs:shots`
Expected: Playwright output shows 3 passing tests (desktop skips mobile-only, mobile skips desktop-only, so 4 skipped + 2 desktop passing + 1 mobile passing = 3 files produced).

Then verify the files:

```bash
ls -la docs/assets/objects/
```

Expected output includes `desktop.png`, `mobile.png`, `detail.png`, each non-zero size.

- [ ] **Step 3: Confirm regular e2e still passes.**

Run: `pnpm test:e2e`
Expected: All existing tests pass; no new failures.

- [ ] **Step 4: Commit.**

```bash
git add e2e/docs-shots.spec.ts docs/assets/objects/
git commit -m "test(docs-shots): add Objects tab screenshots"
```

---

## Task 3: Matrix shot

**Files:**
- Modify: `e2e/docs-shots.spec.ts`
- Produces: `docs/assets/matrix/desktop.png`

- [ ] **Step 1: Add the Matrix test to `e2e/docs-shots.spec.ts`.**

Append inside the `test.describe(...)` block:

```ts
  test("matrix — desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP, "desktop-only");
    await openDemo(page);
    await goToMatrix(page);
    await expect(grid(page, "grid-matrix").getByText("Widgets")).toBeVisible();
    await page.screenshot({ path: "docs/assets/matrix/desktop.png", fullPage: false });
  });
```

- [ ] **Step 2: Run docs:shots and confirm the file exists.**

Run: `pnpm docs:shots`
Expected: Passes; `docs/assets/matrix/desktop.png` exists and is non-zero.

- [ ] **Step 3: Commit.**

```bash
git add e2e/docs-shots.spec.ts docs/assets/matrix/
git commit -m "test(docs-shots): add Matrix tab screenshot"
```

---

## Task 4: Perf shots (initial + scrolled)

**Files:**
- Modify: `e2e/docs-shots.spec.ts`
- Produces: `docs/assets/perf/desktop.png`, `docs/assets/perf/scrolled.png`

- [ ] **Step 1: Add two Perf tests to `e2e/docs-shots.spec.ts`.**

Append inside the `test.describe(...)` block:

```ts
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
```

- [ ] **Step 2: Run docs:shots and confirm files exist.**

Run: `pnpm docs:shots`
Expected: Both files created under `docs/assets/perf/`, non-zero.

- [ ] **Step 3: Commit.**

```bash
git add e2e/docs-shots.spec.ts docs/assets/perf/
git commit -m "test(docs-shots): add Perf tab screenshots"
```

---

## Task 5: A11y focus shot

**Files:**
- Modify: `e2e/docs-shots.spec.ts`
- Produces: `docs/assets/a11y/focus.png`

- [ ] **Step 1: Add the focus test to `e2e/docs-shots.spec.ts`.**

Append inside the `test.describe(...)` block:

```ts
  test("a11y — keyboard focus ring", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP, "desktop-only");
    await openDemo(page);
    await goToObjects(page);
    const g = grid(page, "grid-objects");
    // Focus a cell via keyboard so the focus ring renders naturally.
    await g.getByText("Ada Lovelace").click();
    await g.focus();
    await page.keyboard.press("Tab");
    await expect(g.locator('[data-active="true"]')).toBeVisible();
    await page.screenshot({ path: "docs/assets/a11y/focus.png", fullPage: false });
  });
```

- [ ] **Step 2: Run docs:shots and confirm the file exists.**

Run: `pnpm docs:shots`
Expected: Passes; `docs/assets/a11y/focus.png` exists and is non-zero.

- [ ] **Step 3: Commit.**

```bash
git add e2e/docs-shots.spec.ts docs/assets/a11y/
git commit -m "test(docs-shots): add keyboard focus screenshot"
```

---

## Task 6: Delete loose PNGs at repo root

**Files:**
- Delete: 9 PNGs at the repo root.

- [ ] **Step 1: Confirm nothing references the loose PNGs.**

Run:

```bash
grep -rn --include='*.md' -E 'focus-tab1|focus-tab3|matrix\.png|mobile-objects|objects-light-compact|objects-light|objects-view|perf-scrolled|perf\.png' . || echo "no references"
```

Expected: `no references` (or grep exits 1 with no output).

- [ ] **Step 2: Delete the PNGs.**

```bash
git rm focus-tab1.png focus-tab3.png matrix.png mobile-objects.png objects-light-compact.png objects-light.png objects-view.png perf-scrolled.png perf.png
```

- [ ] **Step 3: Commit.**

```bash
git commit -m "chore: remove drifted screenshots superseded by docs/assets/"
```

---

## Task 7: Embed images in README, performance, and keyboard-a11y docs

**Files:**
- Modify: `README.md`
- Modify: `docs/performance.md`
- Modify: `docs/keyboard-a11y.md`

- [ ] **Step 1: Add a Preview section to `README.md`.**

Insert this section between the "SheetGrid" intro block and the "Why SheetGrid" table (i.e. immediately before the line `## Why SheetGrid`):

```markdown
## Preview

<p align="center">
  <img src="docs/assets/objects/desktop.png" alt="SheetGrid Objects tab — desktop" width="820" />
</p>

| Objects (detail) | 2D Matrix | Mobile |
|---|---|---|
| <img src="docs/assets/objects/detail.png" alt="Selected cell" width="260" /> | <img src="docs/assets/matrix/desktop.png" alt="2D Matrix tab" width="260" /> | <img src="docs/assets/objects/mobile.png" alt="Objects on mobile" width="140" /> |

```

- [ ] **Step 2: Embed perf images in `docs/performance.md`.**

Insert this block immediately after the "Try it" section (i.e. after the line `Open **10k Perf**. Resize the browser or change the \`Rows\`/\`Columns\` selectors. Only the visible window mounts — scroll and check DevTools → Elements to confirm.`) and before `## Knobs`:

```markdown

![10k Perf initial](assets/perf/desktop.png)

After scrolling — only the newly visible rows are mounted:

![10k Perf after scroll](assets/perf/scrolled.png)

```

- [ ] **Step 3: Embed the focus image in `docs/keyboard-a11y.md`.**

Insert this line immediately after the "Give the grid (or its parent) a height so the virtualized viewport is visible." line and before `## Keyboard shortcuts`:

```markdown

![Focused cell with active ring](assets/a11y/focus.png)

```

- [ ] **Step 4: Sanity-check the paths.**

Run:

```bash
grep -oE 'docs/assets/[^" )]+\.png|assets/[^" )]+\.png' README.md docs/performance.md docs/keyboard-a11y.md | sort -u
```

For each path in the output, confirm the file exists:

```bash
ls docs/assets/objects/desktop.png docs/assets/objects/mobile.png docs/assets/objects/detail.png docs/assets/matrix/desktop.png docs/assets/perf/desktop.png docs/assets/perf/scrolled.png docs/assets/a11y/focus.png
```

Expected: `ls` prints all 7 files with no "No such file" errors.

- [ ] **Step 5: Commit.**

```bash
git add README.md docs/performance.md docs/keyboard-a11y.md
git commit -m "docs: embed generated screenshots into README and doc pages"
```

---

## Task 8: Document the workflow in CONTRIBUTING.md

**Files:**
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Add a "Docs screenshots" subsection under the existing Docs heading.**

Find the `## Docs` section (currently one paragraph ending "Prefer editing an existing doc over adding a new one."). Insert this immediately after that paragraph:

```markdown

### Docs screenshots

UI-affecting changes must regenerate screenshots:

```bash
pnpm docs:shots
```

Commit the updated files under `docs/assets/`. Screenshots are produced by `e2e/docs-shots.spec.ts` — add a step there for any new user-facing surface. This is advisory (no CI gate), but PRs that ship visible UI changes without updated shots will get requested changes.

```

- [ ] **Step 2: Confirm the addition renders as intended.**

Run: `head -90 CONTRIBUTING.md`
Expected: The new "### Docs screenshots" subsection appears under `## Docs`, above the next `##` heading.

- [ ] **Step 3: Commit.**

```bash
git add CONTRIBUTING.md
git commit -m "docs(contributing): document pnpm docs:shots workflow"
```

---

## Success criteria

- `pnpm docs:shots` produces all 7 files under `docs/assets/` from a clean checkout.
- `pnpm test:e2e` runtime and pass/fail count are unchanged.
- The 9 loose root PNGs are gone.
- `README.md` shows a Preview section; `docs/performance.md` and `docs/keyboard-a11y.md` embed the relevant shots; every embed points to a file that exists.
- `CONTRIBUTING.md` documents the workflow.
