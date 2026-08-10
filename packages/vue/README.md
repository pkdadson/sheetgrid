# @sheetgrid/vue

Excel-class **Vue 3** data grid — virtualized rows & columns, object or 2D data, edit, validation, clipboard, groups, sort, built-in cell types, opt-in formulas.

> **Status:** `0.0.x` ships the `useVirtualWindow` composable and the `<SheetGrid>` component (data-only render, object rows and 2D matrix). Row/column virtualization, selection, keyboard, and clipboard land in the next release; cell types + editors follow.

## Install

```bash
pnpm add @sheetgrid/vue
# npm i @sheetgrid/vue
```

**Peer:** `vue >= 3.4` (needed for `defineModel` in later milestones).

Transitive: `@sheetgrid/core`, `@sheetgrid/tokens`.

## `<SheetGrid>` (data-only render, m2a preview)

```vue
<script setup lang="ts">
import { SheetGrid } from "@sheetgrid/vue";

const rows = [
  { id: "1", name: "Ada", age: 36 },
  { id: "2", name: "Grace", age: 40 },
];
const columns = [
  { id: "name", header: "Name" },
  { id: "age", header: "Age" },
];
</script>

<template>
  <SheetGrid :rows="rows" :columns="columns" />
</template>
```

Matrix mode:

```vue
<SheetGrid :data="[['Name', 'Age'], ['Ada', 36]]" header-row />
```

**Current props:** `rows`, `columns`, `data`, `headerRow`, `density`, `theme`, `zebra`, `className`. Row/column virtualization, selection, keyboard, and clipboard ship in the next release; cell types and editors follow.

## `useVirtualWindow`

Window an existing scroll parent and row markup without wrappers or CSS transforms. Popup-safe. Works with object rows or 2D JSON matrices.

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
| `count` | `MaybeRefOrGetter<number>` | — | Length of the flattened list (post expand/collapse). |
| `getItemKey` | `(index) => string` | — | Stable key; include expand state when height depends on it. |
| `estimateSize` | `(index) => number` | — | Size until measured. |
| `scrollElement` | `MaybeRefOrGetter<HTMLElement \| null>` | — | Your scroll parent — pass a template ref, a getter, or a raw element. |
| `overscan` | `MaybeRefOrGetter<number>` | `3` | Extra items outside the viewport. |
| `horizontal` | `MaybeRefOrGetter<boolean>` | `false` | Column virtualization mode. |
| `pinKeys` | `MaybeRefOrGetter<readonly string[]>` | `undefined` | Keep these keys mounted (e.g. row with an open dropdown). |
| `pinIndexes` | `MaybeRefOrGetter<readonly number[]>` | `undefined` | Same as `pinKeys` but by index. |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | When false, exposes the full range. |

### Returns

The result is a `reactive({...})` object: `virtualItems`, `padStart`, `padEnd`, `totalSize`, `startIndex`, `endIndex` read as plain values (auto-unwrapped in both script and template — no `.value`). `measureElement(el)` and `scrollToIndex(i, align?)` are plain functions. If you destructure the result, use `toRefs()` first to preserve reactivity.

## Scroll anchoring

The composable sets `overflow-anchor: none` on your scroll element while it is bound and restores the previous value on unmount. This is required — without it the browser's native scroll anchoring fights the growing/shrinking `padStart` spacer and produces runaway scroll. You do not need to set this in your own CSS.

## SSR / Nuxt

`useVirtualWindow` is SSR-safe: no `window` / `ResizeObserver` access at module scope. On the server it returns empty; the client re-runs after mount and populates. Hydration matches by construction.

Nuxt module ships as `@sheetgrid/nuxt` in a later milestone.

## License

MIT
