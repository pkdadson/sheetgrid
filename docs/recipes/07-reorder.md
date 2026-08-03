# Recipe 07 — Column & row reorder

## Column reorder (built-in)

Drag a **leaf** header onto another leaf header. Group bands are not draggable.

Resize by dragging the **right edge** of a leaf header.

```tsx
<Grid rows={rows} columns={columns} onRowsChange={setRows} />
```

When controlled, listen for `meta.reason === "reorder"`:

```tsx
<Grid
  rows={rows}
  columns={columns}
  onRowsChange={(next, meta) => {
    if (meta.reason === "reorder") {
      // next is the new row order if you also reorder rows;
      // column order is internal unless you control columns externally
    }
    setRows(next);
  }}
/>
```

## Programmatic column order (core)

If you use `@sheetgrid/core` store APIs (advanced):

```ts
import { createGridStore, fromObjects } from "@sheetgrid/core";

const columns = [
  { id: "a", header: "A" },
  { id: "b", header: "B" },
];
const rows = fromObjects([{ id: "1", a: 1, b: 2 }], columns);
const store = createGridStore({ rows, columns });

store.moveColumn("a", 1); // move A after B
store.swapColumns("a", "b");
console.log(store.getColumnOrder());
```

## Row order

Row order is the order of the `rows` array. Reordering rows in app state re-renders the grid:

```tsx
function moveRowUp(rows: ObjectRow[], id: string) {
  const i = rows.findIndex((r) => r.id === id);
  if (i <= 0) return rows;
  const next = [...rows];
  [next[i - 1], next[i]] = [next[i], next[i - 1]];
  return next;
}
```

Drag-handle row reorder UI can be added later; today use array order or core `store.moveRow`.

## Tips

- Keep stable `id`s on rows so reorder does not break selection identity.
- Leaf column reorder preserves header group membership via `columnGroups` children ids.
