# SheetGrid

**Excel-class React data grid** — virtualized, customizable, container-responsive. Built from scratch for developer experience.

> Independent monorepo at `sheetgrid/`. Not part of canvas-lib / Ananse.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Why SheetGrid

| Need | What you get |
|------|----------------|
| Install & render | `@sheetgrid/react` + typed rows or 2D matrices |
| Scale | DOM virtualization for **rows and columns** (demo: 10k×100) |
| Excel feel | Selection, keyboard, edit, TSV clipboard, resize, column reorder |
| Customize | Cell types, validators, `registerCellType`, CSS variable themes |
| Data shapes | **First-class** object rows **and** 2D matrices |

## Install

```bash
pnpm add @sheetgrid/react
# npm i @sheetgrid/react
```

**Peers:** `react`, `react-dom` ≥ 18.2 (React 19 supported).

`@sheetgrid/core` and `@sheetgrid/tokens` install as transitive dependencies.

## Quickstart — objects

```tsx
import { Grid } from "@sheetgrid/react";

export function App() {
  return (
    <div style={{ height: 400 }}>
      <Grid
        rows={[
          { id: "1", name: "Ada", age: 36 },
          { id: "2", name: "Grace", age: 40 },
        ]}
        columns={[
          { id: "name", header: "Name" },
          { id: "age", header: "Age", type: "number" },
        ]}
      />
    </div>
  );
}
```

## Quickstart — 2D data

```tsx
import { Grid } from "@sheetgrid/react";

<Grid
  data={[
    ["Name", "Age"],
    ["Ada", 36],
  ]}
  headerRow
  onDataChange={(next) => console.log(next)}
  style={{ height: 400 }}
/>
```

## Features

- Virtualized body rows **and** columns (DOM)
- Object rows + 2D matrix inputs
- Cell selection (click, shift, ctrl/cmd), keyboard navigation
- Inline edit + validation (`reject` / `commit-with-error`)
- Built-in validators: `required`, `number`, `min`, `max`, `pattern`
- Clipboard: Cmd/Ctrl+C / X / V (TSV)
- Column resize and drag reorder
- Column header groups + row grouping
- Click-to-sort headers, shift+click multi-column, custom per-column comparators
- Built-in cell types: `text`, `number`, `boolean`, `select`
- `registerCellType` + custom cell/editor props
- Theme tokens (CSS variables, density)
- Opt-in **formulas** (`formulas` prop): secure AST engine, A1 refs, full pure function catalog

## Demo

```bash
cd sheetgrid
pnpm install
pnpm dev:demo
```

Open [http://localhost:5177](http://localhost:5177):

- **Objects** — types, groups, validation
- **2D Matrix** — matrix API + paste
- **10k Perf** — row × column virtualization playground

## Recipes

1. [Install](docs/recipes/01-install.md)
2. [Row objects](docs/recipes/02-row-objects.md)
3. [2D data](docs/recipes/03-2d-data.md)
4. [Built-in & custom cells](docs/recipes/04-custom-cell.md)
5. [Validation](docs/recipes/05-validation.md)
6. [Column & row groups](docs/recipes/06-groups.md)
7. [Reorder](docs/recipes/07-reorder.md)
8. [Theming](docs/recipes/08-theming.md)
9. [Formulas](docs/recipes/09-formulas.md)
10. [Sort](docs/recipes/10-sort.md)

## Packages

| Package | Role |
|---------|------|
| `@sheetgrid/react` | Public React `<Grid />` |
| `@sheetgrid/core` | Engine (also published; used by react) |
| `@sheetgrid/tokens` | CSS variables |

## Develop

```bash
pnpm install
pnpm test            # unit (vitest)
pnpm build
pnpm dev:demo
pnpm exec playwright install chromium   # once
pnpm test:e2e        # Playwright UI/UX against demo
pnpm publish:check   # test + build + npm dry-run
```

## Publishing (maintainers)

1. Ensure `pnpm publish:check` passes  
2. Log in to npm (`npm login`) with access to the `@sheetgrid` scope  
3. Publish in dependency order:

```bash
pnpm --filter @sheetgrid/tokens publish --access public
pnpm --filter @sheetgrid/core publish --access public
pnpm --filter @sheetgrid/react publish --access public
```

Or use changesets / a release script when the repo is on GitHub.

Version is currently **0.1.0** for all packages. Bump together for the first release.

## Roadmap

- Fill handle (v1.1)
- Multi-sheet (later)
- Canvas renderer (later)

## License

MIT — see [LICENSE](LICENSE)
