# SheetGrid — Vue 3 starter

Minimal Vite + Vue 3 project that installs `@sheetgrid/vue@next` from npm. Designed to be opened directly in StackBlitz — click the button in the [root README](../../README.md) or open [stackblitz.com/github/pkdadson/sheetgrid/tree/main/starters/vue-vite](https://stackblitz.com/github/pkdadson/sheetgrid/tree/main/starters/vue-vite).

## Local

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

## What's in the box

- `<SheetGrid>` mounted with 5 rows × 4 columns
- One column of each built-in type: text, number, boolean (checkbox), select (dropdown)
- Sort headers, click-to-select cells, edit-on-Enter, TSV clipboard, keyboard nav
- `@rows-change` wired to update the local `ref`

## Extend

- Add `:column-groups`, `:row-grouping`, `:sort-by`, `:formulas="true"` per the [Vue package README](https://github.com/pkdadson/sheetgrid/blob/main/packages/vue/README.md)
- Register custom cell types with `registerCellType` — see the [custom cells recipe](https://github.com/pkdadson/sheetgrid/blob/main/docs/recipes/04-custom-cell.md#vue)
- Wire persistence via `@rows-change` — see the [server-side data recipe](https://github.com/pkdadson/sheetgrid/blob/main/packages/vue/README.md#server-side-data)

## Not a workspace member

This starter is deliberately outside `pnpm-workspace.yaml`'s package globs so that `pnpm install` here fetches `@sheetgrid/vue` from npm (not from the monorepo). That's what StackBlitz will do when someone opens the folder.
