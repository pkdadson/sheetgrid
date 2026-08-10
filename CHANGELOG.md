# Changelog

## Unreleased

### Features

- **Bring-your-own-table virtualization** — adopt windowing without mounting `<Grid />` or wrapping cells:
  - `@sheetgrid/core`: `createSizeCache`, `buildPrefixSums`, `windowFromPrefix`, `expandWindowForPins`, `computePads`, `anchorScrollDelta` (variable sizes, pin ranges, scroll anchoring; no transforms)
  - `@sheetgrid/react`: `useVirtualWindow` — uses *your* scroll element, `measureElement` on *your* row, spacers via `padStart`/`padEnd`, optional `pinKeys` so open dropdowns keep their anchor mounted
- Recipe: [Bring your own table](docs/recipes/11-bring-your-own-table.md)

### Docs

- Document **2D JSON + `useVirtualWindow`** on the root README, recipe 11 (matrix section), FAQ, API, 2D recipe cross-link, and `@sheetgrid/react` package README

### Added

- `@sheetgrid/vue`: `<SheetGrid>` opts into `@sheetgrid/core`'s formula engine via `formulas` prop (+ `formulaEntry`, `formulaLimits`, `allowIndirect`, `allowVolatile`). Editing a cell with a leading `=` commits as a formula; the cell displays the evaluated result; copy on a single formula cell writes the source. The Excel-style cell-pick mode (click cells while editing to insert A1 refs) is deferred to a subsequent release.
- `@sheetgrid/vue`: new package (0.0.1). Ships `useVirtualWindow` composable — bring-your-own-table virtualization for Vue 3. Vue-idiomatic surface: `MaybeRefOrGetter` inputs, `reactive({...})` result (no `.value` in templates), `scrollElement` accepts a template ref. Object rows and 2D JSON matrices supported. SSR-safe. Documented on root README, docs/README index, docs/api reference, FAQ, and recipes 03 and 11 (Vue section alongside React).

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
