# @sheetgrid/core

Framework-agnostic **engine** for [SheetGrid](https://github.com/): data adapters, grid store, validation, selection, virtualization math, layout, clipboard TSV, keyboard map, sort, formulas.

Most apps should install **`@sheetgrid/react`** instead. Use this package if you are building a custom renderer or headless integration.

## Install

```bash
pnpm add @sheetgrid/core
```

## Quickstart

```ts
import { fromMatrix, createGridStore, commitCell, required } from "@sheetgrid/core";

const { rows, columns } = fromMatrix(
  [
    ["Name", "Age"],
    ["Ada", 36],
  ],
  { headerRow: true },
);

const store = createGridStore({ rows, columns });

store.subscribe(() => {
  console.log(store.getRows());
});

store.setCell(rows[0]!.id, "age", 37, "api");
```

With formulas:

```ts
const store = createGridStore({
  rows,
  columns,
  formulas: true,
  formulaEntry: "auto-equals",
});
store.setFormula(rowId, columnId, "=A1+1");
```

## What you get

| Area | Highlights |
|------|------------|
| Store | `createGridStore` — rows, column order, errors, formulas |
| Adapters | `fromMatrix` / `toMatrix` / `fromObjects` / `toObjects` |
| Validation | `commitCell`, `required`, `number`, `min`, `max`, `pattern` |
| Selection | Pure helpers: `selectCell`, `extendTo`, `moveActive`, … |
| Keyboard | `mapKeyToCommand` → move / edit / copy / paste / … |
| Virtual | `computeWindow`, `computeVariableWindow` |
| Clipboard | TSV `parse` / `serialize` / `applyPaste` |
| Sort | `sortRows`, comparators |
| Formulas | AST engine, `listFunctions`, A1 helpers |

## Documentation

| Doc | Link |
|-----|------|
| **Core / headless guide** | [../../docs/core-guide.md](../../docs/core-guide.md) |
| API (React + core surface) | [../../docs/api.md](../../docs/api.md) |
| Formula catalog | [../../docs/formulas-catalog.md](../../docs/formulas-catalog.md) |
| Keyboard map usage | [../../docs/keyboard-a11y.md](../../docs/keyboard-a11y.md) |
| Monorepo overview | [../../README.md](../../README.md) |

## License

MIT
