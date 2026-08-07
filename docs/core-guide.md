# Core / headless guide

`@sheetgrid/core` is the framework-agnostic engine behind `<Grid />`. Most apps should use **`@sheetgrid/react`** only. Use core when you need:

- A custom renderer (canvas, non-React, specialized DOM)
- Programmatic control of rows, columns, formulas, and order without mounting React
- Shared data adapters / validators / sort outside the React package

```bash
pnpm add @sheetgrid/core
```

## Mental model

```
rows + columns  →  createGridStore  →  subscribe + render yourself
                      │
                      ├─ getCell / setCell
                      ├─ columnOrder / moveColumn
                      ├─ validation errors map
                      └─ optional formulas
```

Internal row shape (not the flat `ObjectRow` React uses):

```ts
interface GridRow {
  id: string;
  values: Record<string, unknown>; // keyed by column id
}
```

## Minimal store

```ts
import {
  createGridStore,
  fromObjects,
  fromMatrix,
  toObjects,
  commitCell,
  required,
} from "@sheetgrid/core";

const columns = [
  { id: "name", header: "Name", validate: required },
  { id: "age", header: "Age", type: "number" },
];

const rows = fromObjects(
  [
    { id: "1", name: "Ada", age: 36 },
    { id: "2", name: "Grace", age: 40 },
  ],
  columns,
);

const store = createGridStore({ rows, columns });

store.subscribe(() => {
  console.log(toObjects(store.getRows()));
});

store.setCell("1", "age", 37, "api");
```

### From a matrix

```ts
const { rows, columns } = fromMatrix(
  [
    ["Name", "Age"],
    ["Ada", 36],
  ],
  { headerRow: true },
);
const store = createGridStore({ rows, columns });
const matrix = store.toMatrix({ headerRow: true });
```

## `GridStore` methods

### Read

| Method | Returns |
|--------|---------|
| `getRows()` | Current `GridRow[]` (source order) |
| `getColumns()` | Column defs as stored |
| `getOrderedColumns()` | Columns in `columnOrder` |
| `getColumnOrder()` | `ColumnId[]` |
| `getCell(rowId, columnId)` | Cell value |
| `getErrors()` | `Map<cellKey, CellError>` |
| `getLastReason()` | Last `CommitReason` or `null` |
| `toMatrix({ headerRow? })` | 2D snapshot |
| `isFormulasEnabled()` | boolean |
| `getFormulaEntry()` | `"auto-equals" \| "explicit-only"` |
| `getFormula(rowId, columnId)` | `{ source, result } \| null` |

### Write

| Method | Behavior |
|--------|----------|
| `setCell(rowId, columnId, value, reason)` | Writes value; triggers formula dirty recalc when enabled. Does **not** run column `validate` by itself — use `commitCell` for validation. |
| `replaceRows(rows)` | Replace all rows |
| `replaceColumns(columns)` | Replace column defs |
| `setColumnOrder(order)` | Set leaf order |
| `moveColumn(columnId, toIndex)` | Move one column |
| `swapColumns(a, b)` | Swap two columns |
| `moveRow(rowId, toIndex)` | Move one row |
| `swapRows(a, b)` | Swap two rows |
| `setError` / `clearError` | Manual error chrome |
| `setFormula(rowId, columnId, source)` | Parse + store formula; recalc |
| `clearFormula(rowId, columnId)` | Remove formula |

### Subscribe

```ts
const unsub = store.subscribe(() => {
  // re-read getRows / getErrors / getOrderedColumns
});
// later
unsub();
```

`CommitReason`: `"edit" | "paste" | "cut" | "api" | "reorder"`.

## Validated commits

Prefer `commitCell` when you want the same reject / commit-with-error rules as the React grid:

```ts
import { commitCell } from "@sheetgrid/core";

const result = await commitCell(store, {
  rowId: "1",
  columnId: "name",
  value: "",
  mode: "reject", // or "commit-with-error"
  reason: "edit",
});
// result.ok === false → store unchanged in reject mode; error set
// validate comes from the column def already on the store
```

## Selection (pure helpers)

Selection is **not** stored inside `createGridStore`. Compose it yourself (as React does):

```ts
import {
  createSelection,
  selectCell,
  extendTo,
  moveActive,
  selectAll,
  isCellSelected,
  toggleCell,
} from "@sheetgrid/core";

let selection = createSelection();
selection = selectCell(selection, { rowId: "1", columnId: "name" });
```

## Keyboard map

```ts
import { mapKeyToCommand } from "@sheetgrid/core";

const cmd = mapKeyToCommand(
  { key: "ArrowDown", code: "ArrowDown", shiftKey: false, ctrlKey: false, metaKey: false, altKey: false },
  "navigate", // or "edit"
);
// cmd.type: move | edit | editReplace | commit | cancel | selectAll | copy | cut | paste | none
```

Wire `cmd` into selection + store in your UI layer. Shortcut table: [keyboard-a11y.md](keyboard-a11y.md).

## Virtualization math

```ts
import { computeWindow, computeVariableWindow } from "@sheetgrid/core";

const { startIndex, endIndex } = computeWindow({
  scrollOffset: 0,
  viewportSize: 400,
  itemSize: 32,
  itemCount: 10_000,
  overscan: 5,
});
// render rows startIndex..endIndex only
```

### Variable size + size cache (bring-your-own table)

For collapsible / measured rows without mounting `<Grid />`, use the size cache and prefix window helpers. Prefer **spacers** (`padStart` / `padEnd`) over CSS transforms so popovers stay aligned.

```ts
import {
  createSizeCache,
  buildPrefixSums,
  windowFromPrefix,
  expandWindowForPins,
  computePads,
  anchorScrollDelta,
} from "@sheetgrid/core";

const cache = createSizeCache();
const keys = visibleItems.map((r) => r.id);
const sizes = cache.buildSizes(keys, (i) => (visibleItems[i]!.expanded ? 120 : 40));
const prefix = buildPrefixSums(sizes);
const win = windowFromPrefix(prefix, scrollTop, clientHeight, 4);
const range = expandWindowForPins(win.startIndex, win.endIndex, keys.length, pinIndexes);
const { padStart, padEnd, totalSize } = computePads(prefix, range.startIndex, range.endIndex);
```

In React, use **`useVirtualWindow`** from `@sheetgrid/react` (listens to *your* scroll parent, `measureElement` ref on *your* row, optional `pinKeys` for open menus). Full recipe: [Bring your own table](recipes/11-bring-your-own-table.md).

Also: `resolveColumnWidths`, `setColumnWidth`, `buildVisibleRows` (row groups), `flattenColumnGroups` (header bands).

## Clipboard TSV

```ts
import { parseTsv, serializeTsv, applyPaste, extractRange } from "@sheetgrid/core";
```

Use with your selection ranges and `store.setCell` / `commitCell`.

## Formulas on the store

```ts
const store = createGridStore({
  rows,
  columns,
  formulas: true,
  formulaEntry: "auto-equals",
  formulaOptions: {
    allowIndirect: false,
    allowVolatile: true,
    limits: { maxRangeCells: 50_000 },
  },
});

store.setFormula("1", "bonus", "=B1*0.1");
console.log(store.getFormula("1", "bonus"));
// { source: "=B1*0.1", result: number | FormulaError | ... }
```

A1 indices follow **current** `getOrderedColumns()` and row array order. Catalog: [formulas-catalog.md](formulas-catalog.md).

## Sort outside React

```ts
import { sortRows, type SortSpec } from "@sheetgrid/core";

const specs: SortSpec[] = [{ columnId: "age", direction: "desc" }];
const sorted = sortRows(store.getRows(), store.getOrderedColumns(), specs);
// store rows remain unsorted unless you replaceRows(sorted)
```

## Building a custom React renderer (sketch)

```tsx
function HeadlessGrid({ store }: { store: GridStore }) {
  const rows = useSyncExternalStore(store.subscribe, () => store.getRows());
  const cols = store.getOrderedColumns();

  return (
    <table>
      <thead>
        <tr>
          {cols.map((c) => (
            <th key={c.id}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            {cols.map((c) => (
              <td key={c.id}>{String(store.getCell(r.id, c.id) ?? "")}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

For production, add selection state, `mapKeyToCommand`, virtualization windows, and `commitCell` — same pieces `@sheetgrid/react` composes.

## Exports map (common)

| Area | Exports |
|------|---------|
| Store | `createGridStore`, `commitCell` |
| Adapters | `fromMatrix`, `toMatrix`, `fromObjects`, `toObjects`, `cellKey` |
| Validators | `required`, `number`, `min`, `max`, `pattern` |
| Selection | `createSelection`, `selectCell`, `extendTo`, `moveActive`, … |
| Keyboard | `mapKeyToCommand` |
| Virtual | `computeWindow`, `computeVariableWindow`, `createSizeCache`, `buildPrefixSums`, `windowFromPrefix`, `expandWindowForPins`, `computePads`, `anchorScrollDelta` |
| Layout | `resolveColumnWidths`, `buildVisibleRows`, `flattenColumnGroups`, `moveItem` |
| Clipboard | `parseTsv`, `serializeTsv`, `applyPaste`, `extractRange` |
| Sort | `sortRows`, `pickDefaultComparator`, `withNullsLast` |
| Formulas | `listFunctions`, `parseFormula`, `recalcFormulas`, `formatA1`, … |

## Related

- [API reference](api.md)
- [Formulas recipe](recipes/09-formulas.md)
- Package [README](../packages/core/README.md)
