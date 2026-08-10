# 10. Sort

Sort rows by clicking column headers. Shift+click to add a secondary sort.

## Basics

All columns are sortable by default. Nothing to enable.

```tsx
<Grid
  rows={[
    { id: "1", name: "Ada", score: 98 },
    { id: "2", name: "Grace", score: 99 },
  ]}
  columns={[
    { id: "name", header: "Name" },
    { id: "score", header: "Score", type: "number" },
  ]}
/>
```

Click **Score** → asc; click again → desc; click a third time → no sort.

## Opt out per column

```tsx
{ id: "actions", header: "", sortable: false }
```

## Multi-column sort

Hold **Shift** while clicking additional headers. Numbered badges (1, 2, 3…)
appear next to the arrows to show priority.

## Custom comparators

```tsx
{
  id: "priority",
  header: "Priority",
  comparator: (a, b) => rank(a as string) - rank(b as string),
}
```

- `comparator` overrides the default derived from `column.type`.
- Nulls / undefined always sort last — the sort machinery skips your
  comparator when either value is null so you never have to handle them.
- Third argument is `{ rowA, rowB, direction }` for row-dependent sorts.

## Defaults per type

| `column.type` | Default sort |
|---|---|
| `number` | numeric, NaN treated as null |
| `boolean` | `false` < `true` |
| `text`, `select`, other | `Intl.Collator` (locale-aware, numeric-aware) |

## Controlled sort state

Give `<Grid>` a `sortBy` prop to own the state yourself. Clicks fire
`onSortChange` but the view will not update until you set new `sortBy`:

```tsx
import type { SortSpec } from "@sheetgrid/core";

const [sortBy, setSortBy] = useState<SortSpec[]>([]);

<Grid
  rows={rows}
  columns={columns}
  sortBy={sortBy}
  onSortChange={setSortBy}
/>
```

For uncontrolled use with an initial value, use `defaultSortBy`.

## Grouping

- Sort by a non-grouped column → sorts within each group; group order
  unchanged.
- Sort by the grouped column → reorders the groups themselves.
- Combine via shift+click (grouped column first, then within-group).

### Collapse / expand

Sort state is **independent of** collapse state. Collapsing a group hides
its rows but the current `SortSpec[]` still applies — expanding the group
brings the same sorted order back. The grid does not recompute sort on
collapse.

### Controlled `sortBy` + `rowGrouping`

When you own `sortBy`, you also decide whether group reorder is
persistent. Nothing special is required — the `SortSpec` for a grouped
column still fires through `onSortChange`, and your state update controls
the view:

```tsx
const [sortBy, setSortBy] = useState<SortSpec[]>([
  { columnId: "region", direction: "asc" }, // groups by region alphabetically
]);

<Grid
  rows={rows}
  columns={columns}
  rowGrouping={{ columns: ["region"] }}
  sortBy={sortBy}
  onSortChange={setSortBy}
/>
```

If you strip out the grouped-column `SortSpec` in your reducer, groups
snap back to their source-array order.

## What does NOT change

Sort is a display transform. Formulas continue to see source-array order
(e.g. `=D1` still refers to `rows[0]`, not the top-of-view row). `onRowsChange`
and `onDataChange` also emit source order — apply `sortRows(...)` from
`@sheetgrid/core` if you need the sorted output.

```ts
import { sortRows, type SortSpec } from "@sheetgrid/core";
```

### Vue

Sort works identically in Vue. Uncontrolled (initial sort set via `:default-sort-by`):

```vue
<script setup lang="ts">
import { SheetGrid } from "@sheetgrid/vue";

const rows = [
  { id: "1", name: "Ada", age: 36 },
  { id: "2", name: "Grace", age: 40 },
];
const columns = [
  { id: "name", header: "Name" },
  { id: "age", header: "Age", type: "number" as const },
  { id: "actions", header: "", sortable: false },
];
</script>

<template>
  <!-- Uncontrolled: grid owns sort state; initial sort is desc by age -->
  <SheetGrid
    :rows="rows"
    :columns="columns"
    :default-sort-by="[{ columnId: 'age', direction: 'desc' }]"
  />
</template>
```

Controlled sort (you own the state, grid stays in sync):

```vue
<script setup lang="ts">
import { ref } from "vue";
import { SheetGrid } from "@sheetgrid/vue";
import type { SortSpec } from "@sheetgrid/core";

const rows = [
  { id: "1", name: "Ada", age: 36 },
  { id: "2", name: "Grace", age: 40 },
];
const columns = [
  { id: "name", header: "Name" },
  { id: "age", header: "Age", type: "number" as const },
];

const sortState = ref<SortSpec[]>([]);
</script>

<template>
  <SheetGrid
    :rows="rows"
    :columns="columns"
    :sort-by="sortState"
    @sort-change="(next) => (sortState = next)"
  />
</template>
```

Keyboard: **Enter** or **Space** on a focused sort header triggers the same cycle (asc → desc → none) as a click. **Shift+click** (or **Shift+Enter**) adds a secondary sort key with a numbered priority badge.
