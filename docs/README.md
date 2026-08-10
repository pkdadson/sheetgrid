# SheetGrid documentation

Start with the root [README](../README.md) for install and quickstarts, then use this index.

## Guides

| Doc | When to use it |
|-----|----------------|
| [API reference](api.md) | All `<Grid>` props, column defs, validators, exports |
| [TypeScript types](types.md) | Shapes for `GridRow`, `SortSpec`, `FormulaLimits`, `CommitReason`, etc. |
| [Keyboard & accessibility](keyboard-a11y.md) | Shortcuts, ARIA roles, focus, screen readers |
| [FAQ & troubleshooting](faq.md) | Height, IDs, controlled data, performance, SSR |
| [Core / headless guide](core-guide.md) | `@sheetgrid/core` store, custom renderers |
| [Formula function catalog](formulas-catalog.md) | Full list of spreadsheet functions |
| [Performance](performance.md) | Virtualization knobs, formula cost, measurement |

## Project

- [Changelog](../CHANGELOG.md) — release notes
- [Contributing](../CONTRIBUTING.md) — setup, PRs, testing
- [Publishing](publishing.md) — release mechanics

## Recipes (task-oriented)

1. [Install](recipes/01-install.md)
2. [Row objects](recipes/02-row-objects.md) — React + Vue
3. [2D data](recipes/03-2d-data.md) — React + Vue
4. [Built-in & custom cells](recipes/04-custom-cell.md) — React + Vue
5. [Validation](recipes/05-validation.md) — React + Vue
6. [Column & row groups](recipes/06-groups.md) — React + Vue
7. [Reorder](recipes/07-reorder.md) — React + Vue
8. [Theming](recipes/08-theming.md) — React + Vue
9. [Formulas](recipes/09-formulas.md) — React + Vue
10. [Sort](recipes/10-sort.md) — React + Vue
11. [Bring your own table (headless virtualization)](recipes/11-bring-your-own-table.md) — React + Vue, objects or 2D JSON

## Packages

| Package | Docs |
|---------|------|
| `@sheetgrid/react` | [package README](../packages/react/README.md) |
| `@sheetgrid/vue` | [package README](../packages/vue/README.md) — Vue 3 port; `useVirtualWindow` ships in 0.0.x |
| `@sheetgrid/core` | [package README](../packages/core/README.md) + [core guide](core-guide.md) |
| `@sheetgrid/tokens` | [package README](../packages/tokens/README.md) |
