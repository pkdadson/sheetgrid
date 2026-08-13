# Changelog

## 2026-08-13

### `@sheetgrid/agent@0.1.0-alpha.0` (new package)

- Framework-agnostic `GridController` for agent-driven grid access.
- `describeGridTools(controller)` returns SDK-agnostic LLM tool descriptors (24 tools).
- Full read/write/history/snapshot/batch surface with structured `OpResult` returns.
- Three-layer safety: `readOnly`, per-column `agentWritable`, dynamic `authorize()` callback.

### `@sheetgrid/core@0.3.0`

- Internal: every mutation refactored behind a `Command` interface with reversible inverses.
- New: `History` class exposed as `store.__history` for undo/redo (bounded, transactions, events).
- New: `addRow` / `updateRow` / `deleteRow`, `addColumn` / `updateColumn` / `deleteColumn`, `setSort` / `setFilter` on the public `GridStore`.
- New: `snapshot()` / `applySnapshot()` for opaque state serialization.
- New: `evaluateFilter` + `filterRowIds` helpers exposed publicly.
- Additive `agentWritable` and `description` fields on `ColumnDef`.
- Additive `./commands` subpath export for downstream agent package consumption.

### `@sheetgrid/react@0.3.0`

- New: `useGridController()` hook + `controller` prop on `<Grid>`.
- Paste via `controller.setCells` dispatches as a single `CompoundCommand` for atomic undo.
- `@sheetgrid/agent` added as optional peer dependency.

### `@sheetgrid/vue@0.1.0-alpha.5`

- New: `useGridController()` composable + `controller` prop on `<SheetGrid>`.
- Paste via `controller.setCells` dispatches as a single `CompoundCommand`.
- `@sheetgrid/agent` added as optional peer dependency.

### `@sheetgrid/nuxt@0.1.0-alpha.5`

- `useGridController` auto-imported alongside `useGridStore`.

## Unreleased

### Added — `@sheetgrid/vue@0.1.0-alpha.4` additional scoped slots

- `#cell` scoped slot — per-cell display override; payload `{ row, column, value, rowId, error, isSelected }`. Editor still shows on edit.
- `#header` scoped slot — leaf-header override; payload `{ column, label, direction, priority, sortable, cycleSort }`.
- `#row` scoped slot — replaces the default `<td>` cells inside each data `<tr>`; payload `{ row, index, columns }`. Wrapper `<tr>` still rendered around slot content.
- `#loading` slot + `:loading` boolean prop — replaces tbody body when loading (falls back to a plain "Loading…" text if slot omitted). Takes precedence over `#empty`.

### Added — `@sheetgrid/vue@0.1.0-alpha.3` customization hooks

- `:selection` prop (controlled) + `@selection-change` emit — sync selection state with parent.
- `:selection-mode="row"` — clicking a cell selects the entire row (still cell-mode by default).
- `:row-class-fn(row, index)` and `:cell-class-fn(row, column)` — per-row / per-cell class overrides.
- `@column-widths-change(widths)` — fires after each resize drag; persist widths yourself.
- `:clipboard-enabled` (default true) — set false to disable Ctrl/Cmd+C/X/V + native paste event.
- Three named `<template>` slots: `#toolbar` (above grid), `#empty` (no-data body), `#status` ({ error } scoped, replaces footer).

### Fix — downstream packages now accept core patch upgrades

`@sheetgrid/react`, `@sheetgrid/vue`, `@sheetgrid/nuxt` previously used `"@sheetgrid/core": "workspace:*"` which pnpm transformed to an EXACT version on publish. Downstream consumers never auto-upgraded to `@sheetgrid/core` patch releases (would miss e.g. 0.2.1 security fixes). Switched to `workspace:^`, which transforms to `^X.Y.Z`. New patch versions:

| Package | Old | New |
|---------|-----|-----|
| `@sheetgrid/react` | 0.2.0 | **0.2.1** |
| `@sheetgrid/vue` | 0.1.0-alpha.1 | **0.1.0-alpha.4** |
| `@sheetgrid/nuxt` | 0.1.0-alpha.1 | **0.1.0-alpha.2** |

Consumers of these upgraded versions will pick up `@sheetgrid/core@0.2.1` (with the M1-M3, L1-L3 security fixes from #13) via pnpm/npm's normal caret resolution.

### Features

- **Bring-your-own-table virtualization** — adopt windowing without mounting `<Grid />` or wrapping cells:
  - `@sheetgrid/core`: `createSizeCache`, `buildPrefixSums`, `windowFromPrefix`, `expandWindowForPins`, `computePads`, `anchorScrollDelta` (variable sizes, pin ranges, scroll anchoring; no transforms)
  - `@sheetgrid/react`: `useVirtualWindow` — uses *your* scroll element, `measureElement` on *your* row, spacers via `padStart`/`padEnd`, optional `pinKeys` so open dropdowns keep their anchor mounted
- Recipe: [Bring your own table](docs/recipes/11-bring-your-own-table.md)

### Docs

- Document **2D JSON + `useVirtualWindow`** on the root README, recipe 11 (matrix section), FAQ, API, 2D recipe cross-link, and `@sheetgrid/react` package README

### Added

- `@sheetgrid/vue@0.1.0-alpha.0` — Vue 3 port of `<Grid>`. `<SheetGrid>` component (object rows + 2D matrix, row/column virtualization, mouse selection with shift/ctrl, keyboard nav via `mapKeyToCommand`, TSV clipboard `Ctrl+C/X/V`, editable cells, cell-type registry with `text`/`number`/`boolean`/`select` + `registerCellType`, `SortHeader` with click / shift-click multi-sort / `aria-sort`, column groups via `columnGroups`, opt-in formulas via `formulas` prop). Composables: `useVirtualWindow` (bring-your-own table, `reactive({...})` result, template-ref-friendly `scrollElement`, auto-disable `overflow-anchor`), `useGridStore`. SSR-safe (verified via `renderToString`); no `window`/`ResizeObserver` at module scope. Full parity with `@sheetgrid/react` except the Excel-style formula cell-pick mode (deferred to a follow-up).
- `@sheetgrid/nuxt@0.1.0-alpha.0` — Nuxt 3 module. Auto-imports composables (`useVirtualWindow`, `useGridStore`, `injectTokens`, `registerCellType`, `getCellType`, `resolveColumnType`) and registers `<SheetGrid>` / `<SortHeader>` globally. Optional `sheetgrid.prefix` config for name-spaced components. Transpiles `@sheetgrid/vue` for the Nuxt build.

### Security

- **`@sheetgrid/core@0.2.1`**: formula engine defense-in-depth hardening:
  - **M1** — `matchAt` wildcard matcher now caps at 100 000 iterations and returns `false` on overrun, preventing DoS on adversarial COUNTIF/SUMIF criteria patterns.
  - **M2** — `SUBSTITUTE` global-replace path checks projected output size before joining and returns `#VALUE!` if it would exceed `maxStringLength` (32 768 by default); instance-replace path has the same guard.
  - **M3** — `collectDeps` in `deps.ts` validates row/col counts with `Number.isFinite` before multiplying, falling back to corner-only tracking for oversized ranges like `A1:ZZZ99999`.
  - **L1** — `INDIRECT` range path now applies the same four-way bounds check (`r1 ≥ 0`, `c1 ≥ 0`, `r2 < rowCount`, `c2 < colCount`) as the cell-ref path; out-of-bounds ranges return `#REF!`.
  - **L2** — Clarified (docs only) that `maxCellsTouched` is a per-formula-evaluation budget, not per-recalc-batch; updated JSDoc on `FormulaLimits.maxCellsTouched` and added a comment in `recalc.ts`.
  - **L3** — `MIN` and `MAX` implementations replaced `Math.min(...nums)` / `Math.max(...nums)` spreads with explicit reduce loops, avoiding V8's ~65 k argument-count limit on large ranges.
- **`@sheetgrid/core`**: fix O(2ⁿ) DoS in `matchesCriteria` wildcard matcher (`COUNTIF` / `SUMIF` / `AVERAGEIF`). Rewrote `matchAt` as iterative two-pointer with backtracking to the last `*`. Same public API, same behavior on valid inputs, no exponential blowup on pathological patterns like `"*a*a*a*a*a*a*a*a*a*a*b"`. Regression test added.

### Fixes

- **`@sheetgrid/vue`**: `<TextEditor>` / `<NumberEditor>` / `<SelectEditor>` now `stopPropagation` on Enter/Escape so the same event does not bubble to the grid and immediately re-open the editor after commit. Discovered by end-to-end Playwright testing.
- **`@sheetgrid/vue`**: editor `display` is now a `computed` (was a mount-time constant) so external draft updates — e.g. formula cell-pick mode inserting `=B2` into the current editing draft — reflect in the input.
- **`@sheetgrid/vue`**: `<component :on-change>` handler on the editor no longer relies on inline template ref-write (which Vue's compiler does not auto-unwrap for writes); replaced with an `onEditorChange(v)` function that uses `editing.value = ...` explicitly.
- **`apps/demo-vue`**: `styles.css` now targets `#app` (Vue mount ID) instead of `#root` (React). Fixed a case where the Perf demo mounted 150 000 cells instead of 240 because the scroll-parent height didn't cascade.

### DX

- **`@sheetgrid/vue`**: peer dep loosened to `vue >=3.3.0` (was `>=3.4.0`); we don't use `defineModel` anywhere so 3.3 is the honest minimum.
- **`@sheetgrid/vue`**: `useGridStore(input, { autoWatch: true })` opts into automatic `store.replaceRows` / `replaceColumns` when the reactive input changes. Default remains `false` (backward compatible; `<SheetGrid>` continues to manage replacement explicitly).
- **`@sheetgrid/vue`** + **`@sheetgrid/nuxt`**: publish under the `next` dist-tag so `pnpm add @sheetgrid/vue@next` works cleanly (was: users needed `@0.1.0-alpha.0` explicitly).
- **`@sheetgrid/vue`** README: new "Custom cells" and "Server-side data" recipes.

## 0.2.0

### Packages

| Package | Version |
|---------|---------|
| `@sheetgrid/core` | **0.2.0** — new virtualization primitives exported |
| `@sheetgrid/react` | **0.2.0** — adds `useVirtualWindow` (BYO-table) |
| `@sheetgrid/vue` | **0.1.0-alpha.1** — republished with pinned core dep |
| `@sheetgrid/nuxt` | **0.1.0-alpha.1** — republished with pinned vue dep |
| `@sheetgrid/tokens` | 0.1.0 (unchanged) |

### Fix — broken fresh install for `@sheetgrid/vue@0.1.0-alpha.0`

The first Vue alpha (0.1.0-alpha.0) pinned `@sheetgrid/core@0.1.0` at publish time, but the code called into new core exports (`createSizeCache`, `buildPrefixSums`, `windowFromPrefix`, `expandWindowForPins`, `computePads`, `anchorScrollDelta`, `offsetOf`, `sizeAt`) that were added in the workspace after `@sheetgrid/core@0.1.0` shipped to npm. Fresh `pnpm add @sheetgrid/vue@next` succeeded but any subsequent `vite build` failed with `"createSizeCache" is not exported by "@sheetgrid/core"`.

This release bumps core to 0.2.0 with the new virtualization primitives exported. Vue and Nuxt are republished as `0.1.0-alpha.1` so their pinned core dep resolves to the new version. React is bumped to 0.2.0 to expose the same `useVirtualWindow` hook.

### Added

- `@sheetgrid/core@0.2.0`: `createSizeCache`, `buildPrefixSums`, `windowFromPrefix`, `expandWindowForPins`, `computePads`, `anchorScrollDelta`, `offsetOf`, `sizeAt` — the pure-function virtualization primitives used by both `@sheetgrid/react`'s and `@sheetgrid/vue`'s `useVirtualWindow`.
- `@sheetgrid/react@0.2.0`: `useVirtualWindow` hook — bring-your-own-table virtualization mirroring the Vue composable.

## 0.1.2

### Fixes

- **Escape no longer commits the cell draft** — canceling edit unmounts the editor; a blur-induced commit was saving the discarded value. Editors and `Grid` now suppress that commit path.
- Demo/e2e resolve package **sources** via Vite aliases so local fixes are testable without a stale `dist`.
- CI builds packages **before** tests so `@sheetgrid/core` `dist` exports resolve.
- E2E expectations for reject-mode validation match product behavior (close editor, restore value, error chrome; Escape clears error).

### Packages

| Package | Version |
|---------|---------|
| `@sheetgrid/react` | **0.1.2** |
| `@sheetgrid/core` | 0.1.0 |
| `@sheetgrid/tokens` | 0.1.0 |

## 0.1.1

### Packages

| Package | Version | Notes |
|---------|---------|--------|
| `@sheetgrid/react` | **0.1.1** | Patch release on npm |
| `@sheetgrid/core` | 0.1.0 | Unchanged |
| `@sheetgrid/tokens` | 0.1.0 | Unchanged |

### Distribution

- GitHub Release `v0.1.1` with npm-compatible tarballs
- GitHub Packages mirrors: `@pkdadson/sheetgrid-*` (scope required by GitHub)
- CI pnpm setup fixed (`packageManager` field only)

## 0.1.0

### Features

- Excel-class React data grid (`@sheetgrid/react`)
- First-class object rows and 2D matrix data
- DOM virtualization for rows and columns
- Selection, keyboard navigation, inline edit
- Validation (`reject` / `commit-with-error`) + helpers
- Clipboard TSV copy/cut/paste
- Column resize and drag reorder
- Column header groups and row grouping
- Built-in cell types: text, number, boolean, select
- `registerCellType` for custom types
- Theme tokens (CSS variables, density)
- Demo app and recipes

### Documentation

- API reference, keyboard/a11y guide, FAQ, core/headless guide
- Formula function catalog; expanded package READMEs and recipes

### Packages

| Package | npm |
|---------|-----|
| `@sheetgrid/react` | public |
| `@sheetgrid/core` | public (engine; used by react) |
| `@sheetgrid/tokens` | public |
