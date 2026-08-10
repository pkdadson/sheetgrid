# @sheetgrid/vue

Excel-class **Vue 3** data grid — virtualized rows & columns, object or 2D data, edit, validation, clipboard, sort, column groups, built-in cell types, opt-in formulas. Bring-your-own-table virtualization via `useVirtualWindow`.

> **Status:** Alpha (0.1.x-alpha). Feature-complete for a first release: `<SheetGrid>` component (object + matrix data, row/column virtualization, selection, keyboard, clipboard, editable cells, cell-type registry with `text`/`number`/`boolean`/`select` + `registerCellType`, sort headers, column groups, opt-in formulas), plus the `useVirtualWindow` composable. Excel-style formula cell-pick is deferred to a follow-up.

## Install

```bash
pnpm add @sheetgrid/vue
# npm i @sheetgrid/vue
```

**Peer:** `vue >= 3.4`.

Transitive: `@sheetgrid/core`, `@sheetgrid/tokens`.

## Quickstart — `<SheetGrid>`

```vue
<script setup lang="ts">
import { SheetGrid } from "@sheetgrid/vue";

const rows = [
  { id: "1", name: "Ada", age: 36, active: true },
  { id: "2", name: "Grace", age: 40, active: false },
];
const columns = [
  { id: "name", header: "Name" },
  { id: "age", header: "Age", type: "number" as const },
  { id: "active", header: "Active", type: "boolean" as const },
];
</script>

<template>
  <SheetGrid :rows="rows" :columns="columns" />
</template>
```

Matrix (2D) mode:

```vue
<SheetGrid :data="[['Name', 'Age'], ['Ada', 36]]" header-row />
```

---

## `<SheetGrid>` — full API

### Data

| Prop | Type | Description |
|------|------|-------------|
| `rows` | `Record<string, unknown>[]` | Object rows. Each must have a unique `id` field. |
| `columns` | `ColumnDef[]` | Column definitions (id, header, type, width…). |
| `data` | `unknown[][]` | 2D matrix. Use with `headerRow` instead of `rows`/`columns`. |
| `headerRow` | `boolean` | Treat row 0 of `data` as headers. |

### Selection & Keyboard

Selection follows Excel conventions: click a cell to select; `Shift+Click` extends; `Ctrl/Cmd+Click` toggles individual cells. Arrow keys navigate, `Tab`/`Shift+Tab` moves within the selection. `Enter` begins edit; `Escape` cancels.

`mapKeyToCommand` from `@sheetgrid/core` translates `KeyboardEvent` → command name if you need to intercept or remap keys programmatically.

### Clipboard

`Ctrl/Cmd+C` copies the selection as TSV. `Ctrl/Cmd+X` cuts (clears values). `Ctrl/Cmd+V` pastes TSV from the clipboard into the active region. On a single formula-cell selection, copy writes the formula source rather than the display value.

### Editable cells & cell-type registry

Set `editable` on a column (or globally) to allow inline editing. The built-in types are:

| Type | Editor |
|------|--------|
| `text` | Plain text input |
| `number` | Numeric input with locale formatting |
| `boolean` | Checkbox toggle |
| `select` | Dropdown from `options` list |

Register custom types:

```ts
import { registerCellType } from "@sheetgrid/vue";

registerCellType("rating", {
  render: (value) => "★".repeat(Number(value)),
  editor: RatingEditorComponent,
});
```

### Sort

Click a `<SortHeader>` to sort ascending; click again for descending; `Shift+Click` adds a secondary sort key (multi-column). The active direction is reflected via `aria-sort`. Import and place `<SortHeader>` inside a column definition's header slot, or use the `sortable` column prop which wires it automatically.

```vue
<SheetGrid :rows="rows" :columns="columns" sortable />
```

Underlying helper: `sortRows` from `@sheetgrid/core`.

### Column groups

Pass `columnGroups` to render multi-level column headers:

```vue
<SheetGrid
  :rows="rows"
  :columns="columns"
  :column-groups="[
    { id: 'person', header: 'Person', children: ['name', 'age'] },
    { id: 'flags', header: 'Flags', children: ['active'] },
  ]"
/>
```

### Opt-in formulas

```vue
<SheetGrid
  :rows="rows"
  :columns="columns"
  :formulas="{ enabled: true }"
/>
```

Editing a cell and typing `=SUM(B2:B5)` commits the formula. The cell displays the evaluated result. Supported: A1 refs, a full pure-function catalog (SUM, AVERAGE, IF, VLOOKUP…). Indirect references and volatile functions are opt-in via `allowIndirect` / `allowVolatile`. Excel-style cell-pick (clicking cells while editing to insert refs) is deferred to a follow-up.

---

## `useVirtualWindow`

Window an existing scroll parent and row markup without wrappers or CSS transforms. Works with object rows or 2D JSON matrices. Popup-safe.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useVirtualWindow } from "@sheetgrid/vue";

const props = defineProps<{ data: unknown[][] }>();
const scrollerRef = ref<HTMLDivElement | null>(null);

const v = useVirtualWindow({
  count: () => props.data.length,
  getItemKey: (i) => String(i),
  estimateSize: () => 32,
  scrollElement: scrollerRef,
});
</script>

<template>
  <div ref="scrollerRef" style="height: 400px; overflow: auto">
    <table>
      <tbody>
        <tr v-if="v.padStart > 0" aria-hidden="true" :style="{ height: v.padStart + 'px' }">
          <td :colspan="data[0]?.length ?? 0" style="padding: 0; border: 0" />
        </tr>
        <tr
          v-for="item in v.virtualItems"
          :key="item.key"
          :data-index="item.index"
          :ref="(el) => v.measureElement(el as Element | null)"
        >
          <td v-for="(cell, c) in data[item.index]!" :key="c">{{ cell }}</td>
        </tr>
        <tr v-if="v.padEnd > 0" aria-hidden="true" :style="{ height: v.padEnd + 'px' }">
          <td :colspan="data[0]?.length ?? 0" style="padding: 0; border: 0" />
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `count` | `MaybeRefOrGetter<number>` | — | Length of the flattened list. |
| `getItemKey` | `(index) => string` | — | Stable key; include expand state when height depends on it. |
| `estimateSize` | `(index) => number` | — | Size until measured. |
| `scrollElement` | `MaybeRefOrGetter<HTMLElement \| null>` | — | Your scroll parent — pass a template ref, a getter, or a raw element. |
| `overscan` | `MaybeRefOrGetter<number>` | `3` | Extra items outside the viewport. |
| `horizontal` | `MaybeRefOrGetter<boolean>` | `false` | Column virtualization mode. |
| `pinKeys` | `MaybeRefOrGetter<readonly string[]>` | `undefined` | Keep these keys mounted (e.g. row with an open dropdown). |
| `pinIndexes` | `MaybeRefOrGetter<readonly number[]>` | `undefined` | Same as `pinKeys` but by index. |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | When false, exposes the full range. |

### Returns

The result is a `reactive({...})` object: `virtualItems`, `padStart`, `padEnd`, `totalSize`, `startIndex`, `endIndex` read as plain values (no `.value` in template or script). `measureElement(el)` and `scrollToIndex(i, align?)` are plain functions. If you destructure, wrap with `toRefs()` first to preserve reactivity.

The composable sets `overflow-anchor: none` on your scroll element while bound, which is required to prevent the browser's native scroll anchoring from fighting the `padStart` spacer. The previous value is restored on unmount — you do not need to set this in CSS yourself.

---

## SSR / Nuxt

`useVirtualWindow` and `<SheetGrid>` are SSR-safe: no `window` / `ResizeObserver` access at module scope. On the server the grid renders header + empty body; the client populates on mount. Hydration matches by construction — no `<ClientOnly>` wrapper needed.

For Nuxt 3, use **`@sheetgrid/nuxt`** — it auto-imports composables and registers `<SheetGrid>` / `<SortHeader>` globally. See [`packages/nuxt/README.md`](../nuxt/README.md).

---

## License

MIT
