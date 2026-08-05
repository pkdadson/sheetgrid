# Docs screenshots — design

Date: 2026-08-05
Status: Approved, ready for implementation plan

## Problem

The `docs/` pages describe SheetGrid features in prose only. New contributors have no visual reference for what "Objects tab", "2D Matrix", or "10k Perf" look like before running the demo. Nine loose PNGs sit at the repo root (`objects-view.png`, `matrix.png`, `perf.png`, etc.) but no doc references them, and they have no defined regeneration process — so they are drifting from the UI.

## Goal

Establish a repeatable, low-friction standard for docs screenshots:

1. Screenshots are produced by Playwright driving the `demo/` app, not captured manually.
2. Contributors regenerate them with one command when they change UI.
3. Docs (`docs/*.md`, `README.md`) reference the produced files directly.

Non-goals: visual regression testing, dark theme coverage, CI-enforced drift detection, image optimization pipeline.

## Decisions

Four decisions locked in during brainstorming:

| # | Decision | Value |
|---|---|---|
| 1 | Enforcement level | **Advisory** — script exists, CONTRIBUTING asks contributors to run it; no CI gate |
| 2 | Fate of existing PNGs | **Regenerate + curate** — produce a smaller set (7 shots) under `docs/assets/`, delete the 9 loose PNGs |
| 3 | Viewports / themes | **Desktop + mobile, light theme only** |
| 4 | Storage layout | **Grouped by feature** — `docs/assets/<feature>/<viewport>.png` |

**Approach:** Dedicated Playwright spec file + two new Playwright projects (one desktop, one mobile). The existing `chromium` project ignores the new spec, so `pnpm test:e2e` is unchanged.

Rationale for the dedicated-spec approach over tagging assertion specs or writing a standalone Node script: keeps assertion-oriented e2e specs clean, reuses Playwright's `webServer` auto-start, and using two Playwright projects is the idiomatic way to run the same test at two viewports.

## Architecture

### File changes

- **New:** `e2e/docs-shots.spec.ts` — produces the 7 shots, no assertions.
- **New dir:** `docs/assets/{objects,matrix,perf,a11y}/`.
- **Modified:** `playwright.config.ts` — add `docs-shots` + `docs-shots-mobile` projects, add `testIgnore` on the main `chromium` project.
- **Modified:** `package.json` — add `docs:shots` script.
- **Modified:** `CONTRIBUTING.md` — new "Docs screenshots" subsection under Docs.
- **Modified:** `README.md`, `docs/core-guide.md`, `docs/performance.md`, `docs/keyboard-a11y.md` — embed the new images.
- **Deleted:** 9 loose PNGs at repo root (`focus-tab1.png`, `focus-tab3.png`, `matrix.png`, `mobile-objects.png`, `objects-light-compact.png`, `objects-light.png`, `objects-view.png`, `perf-scrolled.png`, `perf.png`).

### Playwright config shape

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
]
```

`screenshot: "off"` overrides the top-level `screenshot: "only-on-failure"` so the docs projects don't produce noise into `test-results/` on top of the intentional `page.screenshot({ path })` calls.

### Shot set (7 total)

| Feature | Desktop | Mobile |
|---|---|---|
| Objects tab, default | `docs/assets/objects/desktop.png` | `docs/assets/objects/mobile.png` |
| Objects tab, detail state | `docs/assets/objects/detail.png` | — |
| 2D Matrix tab | `docs/assets/matrix/desktop.png` | — |
| 10k Perf tab, initial | `docs/assets/perf/desktop.png` | — |
| 10k Perf tab, scrolled | `docs/assets/perf/scrolled.png` | — |
| Keyboard focus | `docs/assets/a11y/focus.png` | — |

"Detail state" replaces the existing loose `objects-view.png`; the exact interaction (which cell is active, whether a row group is expanded/collapsed, etc.) is decided at implementation time by matching the framing of the current PNG, so the new shot slots into `README.md` and `docs/core-guide.md` cleanly.

**Filename ownership.** Each `test()` block hardcodes its own output path via `page.screenshot({ path: "docs/assets/<feature>/<name>.png" })`. Viewport selection is not derived from filenames — each test uses `test.skip(testInfo.project.name !== "<project>", ...)` at the top to pin itself to either `docs-shots` (desktop tests) or `docs-shots-mobile` (mobile tests). The two projects share the same spec file so the tests can share helpers, but they don't share output paths.

### npm script

```json
"docs:shots": "playwright test --project=docs-shots --project=docs-shots-mobile"
```

### CONTRIBUTING.md addition

Under the existing **Docs** section, add:

> **Docs screenshots.** UI-affecting changes must regenerate screenshots: run `pnpm docs:shots` and commit the updated files under `docs/assets/`. Screenshots are produced by `e2e/docs-shots.spec.ts` — add a step there for any new user-facing surface.

### Doc embeds

- `README.md` — hero: `docs/assets/objects/desktop.png` near the top.
- `docs/core-guide.md` — `docs/assets/objects/desktop.png` and `docs/assets/objects/detail.png` next to the Objects section; `docs/assets/matrix/desktop.png` next to the Matrix section.
- `docs/performance.md` — `docs/assets/perf/desktop.png` and `docs/assets/perf/scrolled.png` next to the virtualization discussion.
- `docs/keyboard-a11y.md` — `docs/assets/a11y/focus.png` next to the focus-ring section.

## Success criteria

- `pnpm docs:shots` produces all 7 files under `docs/assets/` from a clean checkout.
- `pnpm test:e2e` runtime and pass/fail status are unchanged (no new assertions in the main run).
- The 9 loose root PNGs are gone; every doc embed points to a file that exists.
- CONTRIBUTING documents the workflow.

## Risks and mitigations

- **Flakiness from animation / async data.** The Objects/Perf tabs may not be visually settled the moment the page loads. Mitigation: each shot step uses an explicit wait (e.g. `expect(locator).toBeVisible()` or `waitForFunction`) before `page.screenshot()`, mirroring what existing e2e specs already do in `helpers.ts`.
- **Font rendering differences across machines.** Committed PNGs will differ slightly between contributors' machines. Since enforcement is advisory (Decision 1), we accept small diffs; contributors regenerate on the machine that ships the change.
- **Viewport creep.** If mobile shots proliferate, filenames stay clean because of the per-feature grouping. Adding a tablet viewport later is one new project entry, not a naming refactor.

## Out of scope

- CI-enforced screenshot drift detection.
- Dark-theme variants.
- Pixel-diff / visual regression tooling.
- Image compression / optimization pipeline.
- Auto-publishing screenshots to a CDN or docs site.
