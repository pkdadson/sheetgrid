# Recipe 07 — Column & row reorder

## Mental model

| What | Who owns order? | How it changes |
|------|-----------------|----------------|
| **Rows** | Your React state (`rows` array) | Array order *is* display order. Drag-row UI is not built-in; reorder the array yourself or call core `moveRow`. |
| **Columns** | Grid **store** (`columnOrder`) | Drag a leaf header onto another leaf. Internal order updates; your `columns` prop is **not** rewritten. |

Resize: drag the **right edge** of a leaf header. Group band headers are not draggable.

## Column reorder (built-in UI)

```tsx
import { useState } from "react";
import { Grid, type ObjectRow } from "@sheetgrid/react";

const columns = [
  { id: "name", header: "Name", width: 160 },
  { id: "role", header: "Role", width: 140 },
  { id: "score", header: "Score", width: 100, type: "number" as const },
];

export function ReorderableTable() {
  const [rows, setRows] = useState<ObjectRow[]>([
    { id: "1", name: "Ada", role: "Eng", score: 98 },
  ]);

  return (
    <Grid
      rows={rows}
      columns={columns}
      onRowsChange={(next, meta) => {
        // meta.reason === "reorder" may fire for store-driven updates
        // that notify through the change path; column visual order is
        // still internal unless you mirror it yourself (see below).
        setRows(next);
      }}
      style={{ height: 360 }}
    />
  );
}
```

### What you should expect

1. User drags **Name** after **Score** → grid shows Name last.
2. `columns` prop is still `[name, role, score]` in code.
3. Object fields still use ids (`row.name`, `row.score`) — only **visual** order changes.
4. Formulas A1 columns follow the **new** visual order (`A` = first visible leaf).

There is **no** `onColumnOrderChange` prop on `<Grid>` today. If the app must persist column order:

### Persist column order (workarounds)

**A. Control by prop order (simple)**  
Keep `columns` in the order you want and remount when order changes:

```tsx
const [cols, setCols] = useState(columns);

// When you load a saved order of ids:
function applyOrder(order: string[]) {
  const byId = new Map(cols.map((c) => [c.id, c]));
  setCols(order.map((id) => byId.get(id)!).filter(Boolean));
}

// key forces store to re-init with new default order = columns array order
<Grid key={cols.map((c) => c.id).join(",")} columns={cols} rows={rows} onRowsChange={setRows} />
```

**B. Use `@sheetgrid/core` store (advanced)**  
Build a custom UI on the store and call:

```ts
import { createGridStore, fromObjects } from "@sheetgrid/core";

const store = createGridStore({
  rows: fromObjects(objects, columns),
  columns,
  columnOrder: ["score", "name", "role"], // initial
});

store.moveColumn("name", 2);
store.swapColumns("name", "role");
console.log(store.getColumnOrder()); // persist this array
store.setColumnOrder(["role", "name", "score"]);
```

See [Core guide](../core-guide.md).

## Row order

Row order is the order of the `rows` array you pass in. Reorder in app state:

```tsx
function moveRowUp(rows: ObjectRow[], id: string): ObjectRow[] {
  const i = rows.findIndex((r) => r.id === id);
  if (i <= 0) return rows;
  const next = [...rows];
  [next[i - 1], next[i]] = [next[i], next[i - 1]];
  return next;
}

// then setRows(moveRowUp(rows, id)) and pass rows back to <Grid />
```

Or with core:

```ts
store.moveRow(rowId, toIndex);
store.swapRows(a, b);
// then push toObjects(store.getRows()) into React state if controlled
```

Drag-handle row reorder UI is not shipped; compose a handle column with `onCommitValue` / buttons that rewrite the array.

## Groups

- Only **leaf** headers reorder.
- `columnGroups` membership is by **id** (`children: ["name", "role"]`), so leaf reorder keeps bands correct; colSpan recomputes.

## Tips

- Keep stable string `id`s on every row so selection survives reorder.
- Sort is independent of column reorder — sort uses column **ids**, not positions.
- After column drag, formula `=A1` may point at a different field than before the drag (A follows visual order).

### Vue

Column reorder is drag-and-drop on the header — no props needed to enable. Row reorder is the same as React: rewrite the `rows` ref.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { SheetGrid, type ObjectRow } from "@sheetgrid/vue";

const columns = [
  { id: "name", header: "Name", width: 160 },
  { id: "role", header: "Role", width: 140 },
  { id: "score", header: "Score", width: 100, type: "number" as const },
];

const rows = ref<ObjectRow[]>([
  { id: "1", name: "Ada", role: "Eng", score: 98 },
]);
</script>

<template>
  <SheetGrid
    :rows="rows"
    :columns="columns"
    @rows-change="(next, meta) => {
      // meta.reason === 'reorder' when a store-driven column change
      // propagates through the change path
      rows = next;
    }"
    style="height: 360px"
  />
</template>
```

To persist column order, pass `columns` in the desired order and use a `:key` to re-initialize the store when the order changes — same workaround as React:

```vue
<SheetGrid
  :key="columns.map((c) => c.id).join(',')"
  :rows="rows"
  :columns="columns"
/>
```

## Related

- [API reference](../api.md)
- [Groups recipe](06-groups.md)
- [FAQ — column reorder](../faq.md#column-reorder-did-not-update-my-columns-prop)
