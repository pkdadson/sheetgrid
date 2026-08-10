# Recipe 04 — Built-in & custom cells

## Built-in types

Set `column.type` to use shipped renderers/editors:

| `type` | Display | Edit |
|--------|---------|------|
| `text` (default) | String | Text input |
| `number` | Number | Number input |
| `boolean` | Checkbox | Toggle in place (no modal editor) |
| `select` | Option label | `<select>` with `selectOptions` |

```tsx
import { Grid } from "@sheetgrid/react";

const columns = [
  { id: "name", header: "Name", type: "text" },
  { id: "score", header: "Score", type: "number" },
  { id: "active", header: "Active", type: "boolean" },
  {
    id: "status",
    header: "Status",
    type: "select",
    selectOptions: [
      { label: "Open", value: "open" },
      { label: "Done", value: "done" },
    ],
  },
];
```

## Custom renderer / editor per column

```tsx
{
  id: "score",
  header: "Score",
  cell: ({ value }) => <span className="badge">{String(value)}</span>,
  editor: ({ value, onChange, onCommit, onCancel }) => (
    <input
      autoFocus
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => onCommit()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter") onCommit();
      }}
    />
  ),
}
```

`column.cell` / `column.editor` override the built-in for that column.

## Register a reusable type

```tsx
import { registerCellType } from "@sheetgrid/react";

registerCellType("currency", {
  cell: ({ value }) => `$${Number(value).toFixed(2)}`,
  editor: ({ value, onChange, onCommit, onCancel }) => (
    <input
      autoFocus
      type="number"
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => onChange(Number(e.target.value))}
      onBlur={() => onCommit()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter") onCommit();
      }}
    />
  ),
});

// then:
// { id: "price", header: "Price", type: "currency" }
```

## Interactive cells

`onCommitValue` commits without opening the text editor (used by boolean):

```tsx
cell: ({ value, onCommitValue }) => (
  <button type="button" onClick={() => onCommitValue(!(value as boolean))}>
    {value ? "Yes" : "No"}
  </button>
)
```

### Vue

Register a reusable type with `registerCellType` from `@sheetgrid/vue`, passing Vue SFC components instead of JSX:

```ts
import { registerCellType } from "@sheetgrid/vue";
import MyCellComponent from "./MyCell.vue";
import MyEditorComponent from "./MyEditor.vue";

registerCellType("my-type", {
  cell: MyCellComponent,
  editor: MyEditorComponent,
});
// then: { id: "col", header: "Col", type: "my-type" }
```

**MyCell.vue** — renderer component:

```vue
<script setup lang="ts">
import type { CellRenderProps } from "@sheetgrid/vue";

const props = defineProps<CellRenderProps>();
</script>

<template>
  <span class="badge">{{ String(props.value ?? "") }}</span>
</template>
```

**MyEditor.vue** — editor component (focus on mount, Enter commits, Escape cancels):

```vue
<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { EditorRenderProps } from "@sheetgrid/vue";

const props = defineProps<EditorRenderProps>();
const inputRef = ref<HTMLInputElement | null>(null);

onMounted(() => inputRef.value?.focus());

function onKeyDown(e: KeyboardEvent) {
  e.stopPropagation(); // prevent grid from consuming the key
  if (e.key === "Enter") props.onCommit();
  if (e.key === "Escape") props.onCancel();
}
</script>

<template>
  <input
    ref="inputRef"
    :value="String(props.value ?? '')"
    @input="(e) => props.onChange((e.target as HTMLInputElement).value)"
    @blur="props.onCommit"
    @keydown="onKeyDown"
  />
</template>
```

For a full worked example (currency formatting, number input) see [`packages/vue/README.md` — Custom cells](../../packages/vue/README.md#editable-cells--cell-type-registry).

Interactive cells work the same way — `onCommitValue` is part of `CellRenderProps`:

```vue
<template>
  <button type="button" @click="props.onCommitValue(!(props.value as boolean))">
    {{ props.value ? "Yes" : "No" }}
  </button>
</template>
```
