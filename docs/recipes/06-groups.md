# Recipe 06 — Column header groups & row grouping

## Column header groups

Nest leaf columns under band labels with `columnGroups`:

```tsx
import { Grid } from "@sheetgrid/react";

const columns = [
  { id: "name", header: "Name" },
  { id: "role", header: "Role" },
  { id: "region", header: "Region" },
  { id: "score", header: "Score" },
];

const columnGroups = [
  { id: "person", header: "Person", children: ["name", "role"] },
  { id: "work", header: "Work", children: ["region", "score"] },
];

export function GroupedGrid({ rows }: { rows: Array<Record<string, unknown>> }) {
  return (
    <Grid
      rows={rows}
      columns={columns}
      columnGroups={columnGroups}
      style={{ height: 400 }}
    />
  );
}
```

### Behavior

| Layer | Interaction |
|-------|-------------|
| Group band | Label + colSpan only (not draggable) |
| Leaf header | Drag to reorder, edge to resize, click to select column |

Leaf order follows `columnOrder` / drag reorder. Group bands recompute colSpan automatically.

## Row grouping

```tsx
<Grid
  rows={rows}
  columns={columns}
  rowGrouping={{ columns: ["region"] }}
/>
```

- Group header rows appear in the virtualized list
- Click the chevron to expand/collapse
- Nested group-by fields: `rowGrouping={{ columns: ["region", "team"] }}`

## Both together

```tsx
<Grid
  rows={rows}
  columns={columns}
  columnGroups={columnGroups}
  rowGrouping={{ columns: ["region"] }}
  style={{ height: 480 }}
/>
```
