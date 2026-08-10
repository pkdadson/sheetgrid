# Recipe 09 — Formulas

SheetGrid supports **opt-in spreadsheet formulas** with a secure, allowlist-only engine: no `eval`, no network, no host APIs.

**Full function list:** [Formula catalog](../formulas-catalog.md)

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

Type `=B1*0.1` in Bonus (or click Score after typing `=`) and commit. References use **A1** over the current column order and row order — **not** field names like `score`.

### Point mode — click-to-reference

Instead of memorizing A1 addresses, you can build formulas by clicking:

1. **Focus** the target cell (Bonus for Ada, row 1).
2. Press **Enter** (or start typing) to open the editor.
3. Type `=` — the draft is now a formula and point mode is active.
4. **Click the Score cell** (row 1, column D). The editor value becomes `=D1`.
5. Type an operator (`*`), then a literal or another cell click. Draft is now `=D1*0.1`.
6. Press **Enter** to commit. The cell displays the computed value (e.g. `9.8` for a Score of 98).

You can also **drag** across cells while the draft starts with `=` to insert a range, e.g. `=SUM(B1:E1)` by dragging from B1 to E1 after typing `=SUM(`.

**Which A1 does a click produce?** The A1 address is computed from the **current column order and source row order** — the same rules the engine uses to resolve references. Sorting the view does not change the address a click produces.

**Escape** cancels the whole draft (including any refs inserted by clicks). Nothing is committed.

## Security defaults

| Option | Default | Notes |
|--------|---------|--------|
| `formulas` | `false` | Zero behavior change until enabled |
| `formulaEntry` | `"auto-equals"` | Strings starting with `=` become formulas on commit |
| `allowIndirect` | `false` | `INDIRECT` returns `#REF!` unless enabled |
| `allowVolatile` | `true` | `RAND`, `NOW`, `TODAY` |
| `formulaLimits` | see catalog | Caps on range size, depth, eval time |

For **untrusted paste** (multi-tenant, public forms), use:

```tsx
<Grid formulas formulaEntry="explicit-only" /* set formulas via API only */ />
```

Or strip leading `=`, `+`, `-`, `@` from pasted cells before commit.

Exporting to CSV/Excel: prefix text fields that look like formulas so desktop Excel does not execute them (standard CSV injection hygiene).

## References

- A1 notation over **current** column order and row order (`A1`, `$B$2`, `A1:C10`)
- Sheet qualifiers (`Sheet1!A1`) are rejected
- Sort is display-only — `=A1` still means source row 0 / first ordered column, not “top of sorted view”

## Functions (overview)

| Category | Examples |
|----------|----------|
| Logical | `IF`, `AND`, `OR`, `IFS`, `SWITCH` |
| Math | `SUM`, `ROUND`, `POWER`, `MOD`, `RAND` |
| Stats | `AVERAGE`, `STDEV`, `SUMIF`, `COUNTIFS` |
| Text | `LEFT`, `TEXTJOIN`, `SUBSTITUTE`, `UPPER` |
| Lookup | `VLOOKUP`, `XLOOKUP`, `INDEX`, `MATCH` |
| Date | `TODAY`, `DATE`, `DATEDIF`, `NETWORKDAYS` |
| Financial | `PMT`, `PV`, `NPV`, `IRR` |

Complete tables + error codes + limits: **[formulas-catalog.md](../formulas-catalog.md)**

```ts
import { listFunctions } from "@sheetgrid/core";
console.log(listFunctions());
```

Unknown names → `#NAME?`. Limits → `#LIMIT!`. Cycles → `#CYCLE!`.

## Store API (core)

```ts
import { createGridStore } from "@sheetgrid/core";

// after createGridStore({ …, formulas: true })
store.setFormula(rowId, columnId, "=A1+1");
store.getFormula(rowId, columnId); // { source, result }
store.clearFormula(rowId, columnId);
```

More: [Core guide — formulas](../core-guide.md#formulas-on-the-store)

### Vue

The `formulas` prop and all formula options are identical in Vue — only the binding syntax changes:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { SheetGrid } from "@sheetgrid/vue";

const rows = ref([
  { id: "1", name: "Ada", score: 98, bonus: 0 },
  { id: "2", name: "Grace", score: 99, bonus: 0 },
]);

const columns = [
  { id: "name", header: "Name" },
  { id: "score", header: "Score", type: "number" as const },
  { id: "bonus", header: "Bonus", type: "number" as const },
];
</script>

<template>
  <SheetGrid
    :rows="rows"
    :columns="columns"
    :formulas="true"
    :formula-entry="'auto-equals'"
    :allow-indirect="false"
    :allow-volatile="true"
    @rows-change="(next) => { rows = next; }"
    style="height: 400px"
  />
</template>
```

Usage: click the **Bonus** cell for Ada, press **Enter**, type `=B1*0.1`, press **Enter** to commit. The cell displays the computed value.

**Cell-pick mode:** type `=` to activate formula entry, then click any other cell to insert its A1 reference into the draft. Drag across cells to insert a range (e.g. `=SUM(B1:E1)`). Press **Escape** to cancel the whole draft.

**Clipboard:** copying a single formula cell writes the formula source string (`=B1*0.1`), not the result — consistent with spreadsheet conventions.

For untrusted paste environments, use `:formula-entry="'explicit-only'"` to prevent `=`-prefixed text from becoming formulas.
