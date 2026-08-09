# API reference

Public surface for app developers. Types are exported from `@sheetgrid/react` and `@sheetgrid/core` and ship with JSDoc in `.d.ts`.

## `<Grid />` (`@sheetgrid/react`)

```tsx
import { Grid, type GridProps } from "@sheetgrid/react";
```

Pass **either** object rows **or** a 2D matrix (not both as the primary data path). When `data` is set, the grid runs in matrix mode; otherwise it uses `rows` + `columns`.

### Data — object rows

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rows` | `ObjectRow[]` | — | Row objects. Every row **must** have a stable string `id`. |
| `columns` | `ReactColumnDef[]` | — | Column definitions (order = display order initially). |
| `onRowsChange` | `(rows, meta) => void` | — | Fires after committed data changes. See [change meta](#change-meta). |

```ts
type ObjectRow = Record<string, unknown> & { id: string };
```

### Data — 2D matrix

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `unknown[][]` | — | Matrix of cell values. |
| `headerRow` | `boolean` | `false` | First matrix row is headers; column ids derived from headers (or `col_N` without headers). |
| `onDataChange` | `(data, meta) => void` | — | Fires after committed matrix changes. |
| `columns` | `ReactColumnDef[]` | — | Optional: same length / matching header ids for validators, types, custom cells. |

### Validation

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `validationMode` | `"reject" \| "commit-with-error"` | `"reject"` | How invalid commits behave (see [Validation recipe](recipes/05-validation.md)). |

### Layout & grouping

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columnGroups` | `ColumnGroupDef[]` | — | Nested header bands. `children` are leaf column ids. |
| `rowGrouping` | `{ columns: string[] }` | — | Group body rows by field id(s); supports nesting. |
| `density` | `"comfortable" \| "compact"` | `"comfortable"` | Row / header height tokens. |
| `theme` | `"light" \| "dark"` | inherits | Sets `data-theme` on the root; omit to inherit ancestor `data-theme`. |
| `zebra` | `boolean` | `false` | Alternating row backgrounds. |
| `statusBar` | `boolean` | `true` | Footer status strip (validation / edit hints). |
| `className` | `string` | — | Extra class on the grid root (`.eg-root`). |
| `style` | `CSSProperties` | — | Inline styles; **set a height** (or parent height). |
| `overscan` | `number` | internal default | Extra virtualized rows/cols rendered outside the viewport. |
| `virtualizeColumns` | `boolean` | `true` | Window columns horizontally. Set `false` for few wide columns if needed. |
| `data-testid` | `string` | `"sheetgrid"` | Test id on the scroll/focus root. Status bar is `` `${id}-status` ``. |

### Sort

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sortBy` | `SortSpec[]` | — | **Controlled** sort. Clicks call `onSortChange` only; parent must update this prop. |
| `defaultSortBy` | `SortSpec[]` | `[]` | **Uncontrolled** initial sort. Later changes ignored. |
| `onSortChange` | `(next: SortSpec[]) => void` | — | Fires on sort changes in both modes. |

```ts
type SortDirection = "asc" | "desc";
interface SortSpec {
  columnId: string;
  direction: SortDirection;
}
```

### Formulas

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `formulas` | `boolean` | `false` | Enable formula engine. |
| `formulaEntry` | `"auto-equals" \| "explicit-only"` | `"auto-equals"` | Whether strings starting with `=` become formulas on commit. |
| `formulaLimits` | `Partial<FormulaLimits>` | defaults | Safety caps (source length, range size, eval time, …). |
| `allowIndirect` | `boolean` | `false` | Allow `INDIRECT` (disabled by default). |
| `allowVolatile` | `boolean` | `true` | Allow `RAND`, `NOW`, `TODAY`. |

See [Formulas recipe](recipes/09-formulas.md) and [function catalog](formulas-catalog.md).

---

## Change meta

```ts
meta: { reason: string }
```

| `reason` | When |
|----------|------|
| `"edit"` | Cell commit (Enter, blur, type-to-replace, checkbox, …) |
| `"paste"` | Clipboard paste |
| `"cut"` | Cut |
| `"reorder"` | Column drag reorder (and related layout writes that notify via store) |
| `"api"` | Programmatic store writes |

`onRowsChange` / `onDataChange` emit **source-array order**, not the sorted *display* order. See [Sort](recipes/10-sort.md).

---

## `ReactColumnDef`

Extends core `ColumnDef` with React cell/editor hooks.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `string` | required | Stable column id (also used as object field key). |
| `header` | `string` | required | Header label. |
| `width` | `number \| "flex" \| "auto"` | — | Preferred width. |
| `minWidth` | `number` | — | Min width when resizing / flexing. |
| `maxWidth` | `number` | — | Max width. |
| `editable` | `boolean \| (row) => boolean` | `true` | Whether the cell can enter edit. |
| `validate` | `(value, ctx) => ValidationResult \| Promise<…>` | — | Runs on commit / paste. |
| `sortable` | `boolean` | `true` | Header click sort. |
| `type` | `BuiltInCellType \| string` | `"text"` | Built-in or [registered](recipes/04-custom-cell.md) type. |
| `comparator` | `Comparator` | from `type` | Custom sort; nulls still sort last. |
| `selectOptions` | `{ label, value }[]` | — | For `type: "select"`. |
| `cell` | `(props) => ReactNode` | — | Per-column display override. |
| `editor` | `(props) => ReactNode` | — | Per-column editor override. |

### Built-in `type` values

| `type` | Display | Edit |
|--------|---------|------|
| `text` | String | Text input |
| `number` | Number | Number input |
| `boolean` | Checkbox | In-place toggle |
| `select` | Option label | `<select>` + `selectOptions` |

### Cell / editor props

```ts
// cell renderer
{
  value: unknown;
  row: GridRow;           // internal { id, values }
  column: ReactColumnDef;
  rowId: string;
  isSelected: boolean;
  isEditing: boolean;
  error?: string;
  onCommitValue: (value: unknown) => void; // commit without text editor
}

// editor
{
  value: unknown;
  column: ReactColumnDef;
  onChange: (value: unknown) => void;
  onCommit: (value?: unknown) => void; // optional value commits immediately
  onCancel: () => void;
  error?: string;
}
```

### Validation result

```ts
type ValidationResult =
  | { ok: true }
  | { ok: false; message: string; code?: string };

interface ValidateCtx {
  rowId: string;
  columnId: string;
  row: GridRow;
  rows: GridRow[];
}
```

### Column groups

```ts
interface ColumnGroupDef {
  id: string;
  header: string;
  children: string[]; // leaf column ids
}
```

---

## Validators (`@sheetgrid/react` / `@sheetgrid/core`)

| Export | Signature | Behavior |
|--------|-----------|----------|
| `required` | `(value) => ValidationResult` | Rejects null/undefined/blank string. |
| `number` | `(value) => ValidationResult` | Empty ok; else finite number or numeric string. |
| `min` | `(n) => (value) => ValidationResult` | Value ≥ n. |
| `max` | `(n) => (value) => ValidationResult` | Value ≤ n. |
| `pattern` | `(re, msg?) => (value) => ValidationResult` | RegExp match; empty ok. |

Compose in your own `validate` function — no Zod dependency.

---

## Cell type registry

```ts
import {
  registerCellType,
  getCellType,
  resolveColumnType,
  type CellTypeDefinition,
  type BuiltInCellType,
} from "@sheetgrid/react";

registerCellType("currency", {
  cell: ({ value }) => `$${Number(value).toFixed(2)}`,
  editor: /* optional */ ...,
});
```

Built-in renderers/editors are also exported: `TextCell`, `NumberCell`, `BooleanCell`, `SelectCell`, `TextEditor`, `NumberEditor`, `SelectEditor`.

---

## Data adapters

```ts
import {
  fromMatrix,
  toMatrix,
  fromObjects,
  toObjects,
  cellKey,
} from "@sheetgrid/react"; // re-exported from core
```

| Function | Role |
|----------|------|
| `fromMatrix(data, { headerRow? })` | → `{ rows, columns }` internal shape |
| `toMatrix(rows, columns, { headerRow? })` | Internal → 2D |
| `fromObjects(objects, columns)` | Flat objects → `GridRow[]` |
| `toObjects(rows)` | `GridRow[]` → flat `{ id, ...fields }` |
| `cellKey(rowId, columnId)` | Stable map key for errors / formulas |

---

## Sort helpers (`@sheetgrid/core`)

```ts
import { sortRows, pickDefaultComparator, withNullsLast } from "@sheetgrid/core";
import type { SortSpec, Comparator } from "@sheetgrid/core";
```

Use `sortRows` when you need the **display** order outside the grid (exports, reports). The grid itself does not rewrite `rows` / `data` when sorting.

---

## Formula helpers (`@sheetgrid/core`)

```ts
import {
  listFunctions,
  getFunction,
  formatA1,
  formatA1Range,
  colIndexToLetters,
  lettersToColIndex,
  defaultFormulaLimits,
} from "@sheetgrid/core";
```

Full function list: [formulas-catalog.md](formulas-catalog.md).

---

## `useVirtualWindow` (bring-your-own table)

```tsx
import { useVirtualWindow } from "@sheetgrid/react";
```

Window an **existing** scroll parent and row markup without mounting `<Grid />`. No extra scroller, no cell wrappers, no CSS transforms (safe for dropdowns / popovers).

Works with object lists or **2D matrices**: `count: data.length`, paint `data[item.index][c]`. Index keys (`String(i)`) are fine when the row index is the identity.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `count` | `number` | — | Length of the flattened list (after expand/collapse). For a matrix, `data.length`. |
| `getItemKey` | `(index) => string` | — | Stable key; include expand state when height depends on it. |
| `estimateSize` | `(index) => number` | — | Size until measured. |
| `getScrollElement` | `() => HTMLElement \| null` | — | **Their** overflow container. |
| `overscan` | `number` | `3` | Extra items outside the viewport. |
| `horizontal` | `boolean` | `false` | Use horizontal scroll metrics. |
| `pinKeys` / `pinIndexes` | `readonly string[]` / `number[]` | — | Force-include items (e.g. open menu row). |
| `enabled` | `boolean` | `true` | When `false`, exposes the full range. |

| Return | Description |
|--------|-------------|
| `virtualItems` | `{ index, key, start, size }[]` to map |
| `padStart` / `padEnd` / `totalSize` | Spacer heights (or widths if horizontal) |
| `measureElement` | Callback ref; set `data-index={index}` on the **same** node |
| `scrollToIndex` | Programmatic scroll (`start` \| `center` \| `end` \| `auto`) |

Full recipe: [Bring your own table](recipes/11-bring-your-own-table.md). Core helpers: `createSizeCache`, `buildPrefixSums`, `windowFromPrefix`, `expandWindowForPins`, `computePads`, `anchorScrollDelta`.

---

## Core store (advanced)

```ts
import { createGridStore, type GridStore } from "@sheetgrid/core";
```

See [Core / headless guide](core-guide.md) for the full method table and integration pattern.

### `createGridStore` input

| Field | Type | Description |
|-------|------|-------------|
| `rows` | `GridRow[]` | `{ id, values }` rows |
| `columns` | `ColumnDef[]` | Core column defs |
| `columnOrder?` | `string[]` | Leaf order override |
| `formulas?` | `boolean` | Enable engine |
| `formulaOptions?` | `FormulaEngineOptions` | limits, allowIndirect, allowVolatile |
| `formulaEntry?` | `FormulaEntryMode` | auto-equals / explicit-only |

---

## Tokens

```ts
import { injectTokens } from "@sheetgrid/react";
// or
import "@sheetgrid/tokens/variables.css";
```

`<Grid>` injects tokens automatically on first mount (idempotent style tag `#sheetgrid-tokens`). CSS variables and class hooks: [Theming recipe](recipes/08-theming.md).

---

## Related

- [Keyboard & a11y](keyboard-a11y.md)
- [FAQ](faq.md)
- [Recipes](README.md#recipes-task-oriented)
