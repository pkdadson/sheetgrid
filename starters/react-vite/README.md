# SheetGrid — React starter

Minimal Vite + React 18 project that installs `@sheetgrid/react@^0.2.0` from npm. Designed to be opened directly in StackBlitz — click the button in the [root README](../../README.md) or open [stackblitz.com/github/pkdadson/sheetgrid/tree/main/starters/react-vite](https://stackblitz.com/github/pkdadson/sheetgrid/tree/main/starters/react-vite).

## Local

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

## What's in the box

- `<Grid>` mounted with 5 rows × 4 columns
- One column of each built-in type: text, number, boolean (checkbox), select (dropdown)
- Sort headers, click-to-select cells, edit-on-Enter, TSV clipboard, keyboard nav
- `onRowsChange` wired to update local state

## Extend

- Add `columnGroups`, `rowGrouping`, `sortBy`, `formulas` per the [React package README](https://github.com/pkdadson/sheetgrid/blob/main/packages/react/README.md)
- Register custom cell types with `registerCellType` — see the [custom cells recipe](https://github.com/pkdadson/sheetgrid/blob/main/docs/recipes/04-custom-cell.md)
- Wire persistence via `onRowsChange` — see the [server-side data pattern](https://github.com/pkdadson/sheetgrid/blob/main/docs/recipes/05-validation.md)
- Bring-your-own-table via `useVirtualWindow` — see [recipe 11](https://github.com/pkdadson/sheetgrid/blob/main/docs/recipes/11-bring-your-own-table.md)

## Not a workspace member

This starter is deliberately outside `pnpm-workspace.yaml`'s package globs so that `pnpm install` here fetches `@sheetgrid/react` from npm (not from the monorepo). That's what StackBlitz will do when someone opens the folder.
