# Formulas

SheetGrid supports **opt-in spreadsheet formulas** with a secure, allowlist-only engine: no `eval`, no network, no host APIs.

## Enable

Works for **both** 2D matrices and object rows — same `formulas` prop.

### Matrix

```tsx
import { Grid } from "@sheetgrid/react";

<Grid
  formulas
  data={[
    ["A", "B", "Total"],
    [10, 20, 0],
  ]}
  headerRow
  onDataChange={(next) => console.log(next)}
  style={{ height: 400 }}
/>
```

### Object rows

```tsx
<Grid
  formulas
  rows={[
    { id: "1", name: "Ada", score: 98, bonus: 0 },
    { id: "2", name: "Grace", score: 99, bonus: 0 },
  ]}
  columns={[
    { id: "name", header: "Name" },
    { id: "score", header: "Score", type: "number" },
    { id: "bonus", header: "Bonus", type: "number" },
  ]}
  onRowsChange={(next) => console.log(next)}
  style={{ height: 400 }}
/>
```

Type `=B1*0.1` in Bonus (or click Score after typing `=`) and commit. References use **A1** over the current column order and row order — not field names like `score`.

### Point mode

While the editor draft starts with `=`, **click** another cell to insert its A1 address, or **drag** to insert a range. Highlight shows the pick. Type operators between picks; Enter commits.

## Security defaults

| Option | Default | Notes |
|--------|---------|--------|
| `formulas` | `false` | Zero behavior change until enabled |
| `formulaEntry` | `"auto-equals"` | Strings starting with `=` become formulas on commit |
| `allowIndirect` | `false` | `INDIRECT` returns `#REF!` unless enabled |
| `allowVolatile` | `true` | `RAND`, `NOW`, `TODAY` |

For **untrusted paste** (multi-tenant, public forms), use:

```tsx
<Grid formulas formulaEntry="explicit-only" /* set formulas via API only */ />
```

Or strip leading `=`, `+`, `-`, `@` from pasted cells before commit.

Exporting to CSV/Excel: prefix text fields that look like formulas so desktop Excel does not execute them (standard CSV injection hygiene).

## References

- A1 notation over **current** column order and row order (`A1`, `$B$2`, `A1:C10`)
- Sheet qualifiers (`Sheet1!A1`) are rejected

## Functions

Pure Excel-class functions only (logical, math, stats, text, lookup, date, financial). List names at runtime:

```ts
import { listFunctions } from "@sheetgrid/core";
console.log(listFunctions());
```

Unknown names → `#NAME?`. Limits (depth, range size, string length) → `#LIMIT!`. Cycles → `#CYCLE!`.

## Store API (core)

```ts
store.setFormula(rowId, columnId, "=A1+1");
store.getFormula(rowId, columnId); // { source, result }
store.clearFormula(rowId, columnId);
```
