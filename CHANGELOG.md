# Changelog

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
