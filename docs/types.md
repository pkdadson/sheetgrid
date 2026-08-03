# TypeScript types reference

Every public export ships with `.d.ts`. This page collects the shapes users hit most so you can browse without hovering in an IDE.

Import from `@sheetgrid/react` for React app code; `@sheetgrid/core` for headless / core-only use.

---

## Data

### `GridRow`

Internal row shape. You rarely construct these directly — `<Grid rows>` accepts flat objects and converts via `fromObjects`.

```ts
type RowId = string;
type ColumnId = string;

interface GridRow {
  id: RowId;
  values: Record<ColumnId, unknown>;
}
```

### `ObjectRow` (React)

The flat shape you pass to `<Grid rows>`:

```ts
type ObjectRow = Record<string, unknown> & { id: string };
```

Every row **must** have a stable string `id`. See [FAQ — Why do object rows need `id`?](faq.md#why-do-object-rows-need-id).

### `CellValue`

Values the core store round-trips without loss:

```ts
type CellValue = string | number | boolean | null | Date;
```

`unknown` is used at the boundary because renderers and validators may accept richer values; convert at commit time if you need strict typing.

---

## Columns

### `ColumnDef` (core)

```ts
interface ColumnDef {
  id: ColumnId;
  header: string;
  width?: number | "flex" | "auto";
  minWidth?: number;
  maxWidth?: number;
  editable?: boolean | ((row: GridRow) => boolean);
  validate?: (
    value: unknown,
    ctx: ValidateCtx,
  ) => ValidationResult | Promise<ValidationResult>;
  sortable?: boolean;               // default true
  type?: string;                    // drives default comparator + built-in cell type
  comparator?: Comparator;          // overrides the type default
}
```

### `ReactColumnDef`

Extends `ColumnDef` with render hooks. See [API — ReactColumnDef](api.md#reactcolumndef) for the full table.

### `ColumnGroupDef`

```ts
interface ColumnGroupDef {
  id: string;
  header: string;
  children: ColumnId[]; // leaf column ids in display order
}
```

---

## Sort

```ts
type SortDirection = "asc" | "desc";

interface SortSpec {
  columnId: ColumnId;
  direction: SortDirection;
}

type Comparator = (
  a: unknown,
  b: unknown,
  ctx: { rowA: GridRow; rowB: GridRow; direction: SortDirection },
) => number;
```

Nulls always sort last — the sort machinery short-circuits before calling your comparator when either side is null. See [Sort recipe](recipes/10-sort.md).

---

## Selection

```ts
interface CellCoord {
  rowId: RowId;
  columnId: ColumnId;
}

interface CellRange {
  start: CellCoord;
  end: CellCoord;
}

interface SelectionState {
  active: CellCoord | null;
  ranges: CellRange[];
  rowIds: RowId[];
  columnIds: ColumnId[];
}

type SelectionMode = "cell" | "range" | "rows" | "columns";
```

---

## Validation

```ts
type ValidationMode = "reject" | "commit-with-error";

type ValidationResult =
  | { ok: true }
  | { ok: false; message: string; code?: string };

interface ValidateCtx {
  rowId: RowId;
  columnId: ColumnId;
  row: GridRow;
  rows: GridRow[];
}

interface CellError {
  message: string;
  code?: string;
}
```

Where these surface in the UI: [Validation recipe → Where errors appear](recipes/05-validation.md#where-errors-appear).

---

## Change notifications

```ts
type CommitReason =
  | "edit"       // Cell commit: Enter, blur, type-to-replace, checkbox toggle
  | "paste"      // Clipboard paste
  | "cut"        // Cut selection
  | "reorder"    // Column drag reorder / related layout writes
  | "api";       // Programmatic store writes
```

Delivered on `onRowsChange` / `onDataChange`:

```ts
onRowsChange?: (rows: ObjectRow[], meta: { reason: CommitReason }) => void;
onDataChange?: (data: unknown[][], meta: { reason: CommitReason }) => void;
```

Both emit **source-array order**, not sorted display order — see [FAQ](faq.md#sort-does-not-change-my-rows-array--is-that-a-bug).

---

## Formulas

### `FormulaLimits`

Safety caps applied by the formula engine. Every field is a positive integer.

```ts
interface FormulaLimits {
  maxSourceLength: number;
  maxTokens: number;
  maxAstDepth: number;
  maxRangeCells: number;
  maxCellsTouched: number;
  maxStringLength: number;
  maxFactN: number;
  maxOffsetSize: number;
  maxEvalMsPerCell: number;
  maxEvalMsPerBatch: number;
}
```

Defaults from `defaultFormulaLimits`:

| Field | Default | Meaning |
|-------|---------|---------|
| `maxSourceLength` | `10_000` | Chars in a formula source |
| `maxTokens` | `2_000` | Tokens per formula |
| `maxAstDepth` | `64` | Nesting depth (parens / calls) |
| `maxRangeCells` | `100_000` | Cells a single range may reference (`A1:Z10000` etc.) |
| `maxCellsTouched` | `500_000` | Cells any one evaluation may read |
| `maxStringLength` | `32_768` | Chars in an intermediate string value |
| `maxFactN` | `170` | `FACT(n)` upper bound (double overflow beyond) |
| `maxOffsetSize` | `10_000` | `OFFSET` size cap |
| `maxEvalMsPerCell` | `50` | Wall-clock budget per cell |
| `maxEvalMsPerBatch` | `2_000` | Wall-clock budget per recalc batch |

Override per-Grid:

```tsx
<Grid formulas formulaLimits={{ maxRangeCells: 10_000 }} />
```

### `FormulaEngineOptions`

```ts
interface FormulaEngineOptions {
  limits?: Partial<FormulaLimits>;
  allowIndirect?: boolean;
  allowVolatile?: boolean;
}
```

### `FormulaEntryMode`

```ts
type FormulaEntryMode = "auto-equals" | "explicit-only";
```

- `"auto-equals"` (default) — any commit whose text starts with `=` becomes a formula.
- `"explicit-only"` — only formulas set through the store API become formulas; typed text stays text. Use for untrusted paste.

### `FormulaValue`

Runtime formula values (never raw host objects beyond `Date`):

```ts
type FormulaValue =
  | string
  | number
  | boolean
  | null
  | Date
  | FormulaError
  | FormulaValue[];
```

### `FormulaError`

```ts
type FormulaErrorType =
  | "DIV0" | "VALUE" | "REF" | "NAME"
  | "NA"   | "NUM"   | "CYCLE" | "LIMIT" | "PARSE";

interface FormulaError {
  readonly __formulaError: true;
  type: FormulaErrorType;
  message?: string;
}
```

Display codes: [formulas-catalog → Errors](formulas-catalog.md#errors).

### `FormulaRecord`

Persisted per-cell formula state on the store:

```ts
interface FormulaRecord {
  source: string;       // e.g. "=SUM(B1:E1)"
  result: FormulaValue; // last evaluated result
  deps: string[];       // "rowIndex:colIndex" serialized
  volatile: boolean;    // depends on RAND / NOW / TODAY
}
```

---

## Core store

```ts
interface CreateGridStoreInput {
  rows: GridRow[];
  columns: ColumnDef[];
  columnOrder?: ColumnId[];
  formulas?: boolean;
  formulaOptions?: FormulaEngineOptions;
  formulaEntry?: FormulaEntryMode;
}
```

Full store method surface: [Core guide](core-guide.md).

---

## Related

- [API reference](api.md) — props on `<Grid>`
- [Formulas catalog](formulas-catalog.md) — function-level types
- [Core guide](core-guide.md) — store methods
