# @sheetgrid/vue

Excel-class **Vue 3** data grid — virtualized rows & columns, object or 2D data, edit, validation, clipboard, groups, sort, built-in cell types, opt-in formulas.

> **Status:** `0.0.x` ships the `useVirtualWindow` composable for bring-your-own-table virtualization. The `<SheetGrid>` component and cell/editor system land in subsequent releases.

## Install

```bash
pnpm add @sheetgrid/vue
# npm i @sheetgrid/vue
```

**Peer:** `vue >= 3.4` (needed for `defineModel` in later milestones).

Transitive: `@sheetgrid/core`, `@sheetgrid/tokens`.

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
  getScrollElement: () => scrollerRef.value,
});
</script>

<template>
  <div ref="scrollerRef" style="height: 400px; overflow: auto">
    <table>
      <tbody>
        <tr v-if="v.padStart.value > 0" aria-hidden="true" :style="{ height: v.padStart.value + 'px' }">
          <td :colspan="data[0]?.length ?? 0" style="padding: 0; border: 0" />
        </tr>
        <tr
          v-for="item in v.virtualItems.value"
          :key="item.key"
          :data-index="item.index"
          :ref="(el) => v.measureElement(el as Element | null)"
        >
          <td v-for="(cell, c) in data[item.index]!" :key="c">{{ cell }}</td>
        </tr>
        <tr v-if="v.padEnd.value > 0" aria-hidden="true" :style="{ height: v.padEnd.value + 'px' }">
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
| `getScrollElement` | `() => HTMLElement \| null` | — | Their overflow container. |
| `overscan` | `MaybeRefOrGetter<number>` | `3` | Extra items outside the viewport. |
| `horizontal` | `MaybeRefOrGetter<boolean>` | `false` | Column virtualization mode. |
| `pinKeys` | `MaybeRefOrGetter<readonly string[]>` | `undefined` | Keep these keys mounted (e.g. row with an open dropdown). |
| `pinIndexes` | `MaybeRefOrGetter<readonly number[]>` | `undefined` | Same as `pinKeys` but by index. |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | When false, exposes the full range. |

### Returns

`virtualItems`, `padStart`, `padEnd`, `totalSize`, `startIndex`, `endIndex` — all `ComputedRef`. `measureElement(el)` and `scrollToIndex(i, align?)` — plain functions.

## SSR / Nuxt

`useVirtualWindow` is SSR-safe: no `window` / `ResizeObserver` access at module scope. On the server it returns empty; the client re-runs after mount and populates. Hydration matches by construction.

Nuxt module ships as `@sheetgrid/nuxt` in a later milestone.

## License

MIT
