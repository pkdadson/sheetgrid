# Recipe 11 — Virtualize your own table (no `<Grid />`)

Use SheetGrid **only as a windowing engine** so large tables stay fast without replacing markup, styles, selection, or popup anchors.

Works with **object rows** and **2D JSON matrices** (`unknown[][]` / `data[r][c]`). The hook never needs your data model — only a `count` and how to key/measure each index.

## Goals

| Keep | Change |
|------|--------|
| Your table / CSS / row components | How many body rows mount |
| Your scroll parent | None (we listen to it) |
| Dropdown / popover alignment | Unmount off-screen rows only |
| Expand/collapse behavior | Flatten first, then window |
| 2D matrix JSON as-is | Map `data[item.index]` (no need to convert to objects) |

**Non-goals:** SheetGrid does **not** inject a scroller, wrap your cells, or apply `transform` (those break fixed/popper math). Prefer full `<Grid data={matrix} />` when you want Excel chrome (edit, selection, formulas) — see [2D data](03-2d-data.md).

## Install

```bash
pnpm add @sheetgrid/react
# headless math only:
# pnpm add @sheetgrid/core
```

## 2D matrix JSON

If your source is a 2D array, pass `data.length` as `count` and read cells with `data[item.index][c]`. Index keys are fine when row identity *is* the row index.

```tsx
import { useRef } from "react";
import { useVirtualWindow } from "@sheetgrid/react";

export function MatrixTable({ data }: { data: unknown[][] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rowCount = data.length;
  const colCount = data[0]?.length ?? 0;

  const v = useVirtualWindow({
    count: rowCount,
    getItemKey: (i) => String(i),
    estimateSize: () => 32,
    getScrollElement: () => scrollerRef.current,
  });

  return (
    <div ref={scrollerRef} style={{ height: 400, overflow: "auto" }}>
      <table>
        <tbody>
          {v.padStart > 0 && (
            <tr aria-hidden="true" style={{ height: v.padStart }}>
              <td
                colSpan={colCount}
                style={{ padding: 0, border: 0, lineHeight: 0 }}
              />
            </tr>
          )}

          {v.virtualItems.map((item) => {
            const row = data[item.index]!;
            return (
              <tr
                key={item.key}
                data-index={item.index}
                ref={v.measureElement}
              >
                {row.map((cell, c) => (
                  <td key={c}>{String(cell ?? "")}</td>
                ))}
              </tr>
            );
          })}

          {v.padEnd > 0 && (
            <tr aria-hidden="true" style={{ height: v.padEnd }}>
              <td
                colSpan={colCount}
                style={{ padding: 0, border: 0, lineHeight: 0 }}
              />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

| 2D JSON | Hook / render |
|---------|----------------|
| `data.length` | `count` |
| `data[item.index]` | the visible row |
| `data[r][c]` | each cell |
| `data[0].length` | `colSpan` / column loop |

### Header row in the matrix

If the first JSON row is headers, keep it always mounted and window the body:

```tsx
const header = data[0] ?? [];
const bodyRowCount = Math.max(0, data.length - 1);

const v = useVirtualWindow({
  count: bodyRowCount,
  getItemKey: (i) => String(i + 1), // stable id for matrix row index
  estimateSize: () => 32,
  getScrollElement: () => scrollerRef.current,
});

// thead: header.map(...)
// tbody: virtualItems → data[item.index + 1]
```

### Many columns

For very wide matrices, a second `useVirtualWindow` with `horizontal: true` on the **same** scroller windows columns. Cell value is still `data[row.index][col.index]`. Most sheets only need the vertical window above.

## React: object rows + menus (`useVirtualWindow`)

```tsx
import { useRef, useState } from "react";
import { useVirtualWindow } from "@sheetgrid/react";

type Row = { id: string; name: string; expanded?: boolean };

export function TheirTable({ rows }: { rows: Row[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [menuRowId, setMenuRowId] = useState<string | null>(null);

  // Collapsible: build the flat list you intend to paint
  const items = flattenVisible(rows); // your expand/collapse logic

  const v = useVirtualWindow({
    count: items.length,
    getItemKey: (i) => items[i]!.id,
    // Include expand state in the key when open rows are taller:
    // getItemKey: (i) => `${items[i].id}:${items[i].expanded ? "open" : "closed"}`,
    estimateSize: (i) => (items[i]!.expanded ? 120 : 40),
    overscan: 4,
    getScrollElement: () => scrollerRef.current,
    // Keep the anchor row mounted while a menu is open
    pinKeys: menuRowId ? [menuRowId] : [],
  });

  const colCount = 3;

  return (
    <div ref={scrollerRef} style={{ height: 400, overflow: "auto" }}>
      <table className="their-table">
        <thead>{/* unchanged */}</thead>
        <tbody>
          {v.padStart > 0 && (
            <tr aria-hidden="true" style={{ height: v.padStart }}>
              <td
                colSpan={colCount}
                style={{ padding: 0, border: 0, lineHeight: 0 }}
              />
            </tr>
          )}

          {v.virtualItems.map((item) => {
            const row = items[item.index]!;
            return (
              <tr
                key={item.key}
                data-index={item.index}
                ref={v.measureElement}
                aria-rowindex={item.index + 1}
              >
                <td>{row.name}</td>
                <td>
                  <button type="button" onClick={() => setMenuRowId(row.id)}>
                    ⋮
                  </button>
                  {/* their existing menu; portal optional */}
                </td>
              </tr>
            );
          })}

          {v.padEnd > 0 && (
            <tr aria-hidden="true" style={{ height: v.padEnd }}>
              <td
                colSpan={colCount}
                style={{ padding: 0, border: 0, lineHeight: 0 }}
              />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function flattenVisible(rows: Row[]): Row[] {
  // Example: omit children of collapsed groups; keep your real logic
  return rows;
}
```

### Contract (popup-safe)

1. **`getScrollElement`** — your existing overflow container.  
2. **`data-index={item.index}`** + **`ref={v.measureElement}`** on the **same** node you already use as the row root (no wrapper).  
3. **Spacers only** for `padStart` / `padEnd` — never `transform: translateY`.  
4. **`pinKeys`** while a dropdown is open so the anchor row is not unmounted.  
5. Sort / filter / select-all run on the **full** dataset, not `virtualItems`.

### Accessibility

```tsx
<table aria-rowcount={items.length + 1 /* header */}>
  …
  <tr aria-rowindex={item.index + 1} … />
```

Spacers: `aria-hidden="true"`.  
Keyboard: if focus moves to an unmounted index, call `v.scrollToIndex(i)` then focus.

## Vue: `useVirtualWindow`

The same composable, Vue-idiomatic — `MaybeRefOrGetter` inputs, `reactive({...})` result (no `.value` in templates), `scrollElement` accepts a template ref.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useVirtualWindow } from "@sheetgrid/vue";

const props = defineProps<{ data: unknown[][] }>();
const scrollerRef = ref<HTMLDivElement | null>(null);
const colCount = () => props.data[0]?.length ?? 0;

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
          <td :colspan="colCount()" style="padding: 0; border: 0; line-height: 0" />
        </tr>

        <tr
          v-for="item in v.virtualItems"
          :key="item.key"
          :data-index="item.index"
          :ref="(el) => v.measureElement(el as Element | null)"
        >
          <td v-for="(cell, c) in data[item.index]!" :key="c">{{ String(cell ?? "") }}</td>
        </tr>

        <tr v-if="v.padEnd > 0" aria-hidden="true" :style="{ height: v.padEnd + 'px' }">
          <td :colspan="colCount()" style="padding: 0; border: 0; line-height: 0" />
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

### Pinning open menus

Pass a reactive `pinKeys` so the row hosting an open dropdown never unmounts under the popup:

```ts
const openMenuId = ref<string | null>(null);
const v = useVirtualWindow({
  count: () => rows.value.length,
  getItemKey: (i) => rows.value[i]!.id,
  estimateSize: () => 40,
  scrollElement: scrollerRef,
  pinKeys: () => (openMenuId.value ? [openMenuId.value] : []),
});
```

### Destructuring

`reactive({...})` results lose reactivity when destructured. Use `toRefs` first:

```ts
import { toRefs } from "vue";
const { padStart, virtualItems } = toRefs(v);
```

### Scroll anchoring

The composable sets `overflow-anchor: none` on your scroll element while it is bound and restores the previous value on unmount. Without this the browser's native scroll anchoring would fight the growing `padStart` spacer and produce runaway scroll as you scroll into the list. You do not need to set this in your own CSS.

### SSR / Nuxt

`useVirtualWindow` never touches `window` at module scope. On the server it returns empty; the client re-runs after mount and populates. Hydration matches. A `@sheetgrid/nuxt` module ships in a later milestone.

## Headless (no React)

```ts
import {
  createSizeCache,
  buildPrefixSums,
  windowFromPrefix,
  expandWindowForPins,
  computePads,
  anchorScrollDelta,
} from "@sheetgrid/core";

const cache = createSizeCache();
// on scroll:
const keys = items.map((r) => r.id);
const sizes = cache.buildSizes(keys, () => 40);
const prefix = buildPrefixSums(sizes);
const win = windowFromPrefix(prefix, scrollTop, clientHeight, 4);
const { startIndex, endIndex } = expandWindowForPins(
  win.startIndex,
  win.endIndex,
  items.length,
  pinIndexes,
);
const { padStart, padEnd, totalSize } = computePads(
  prefix,
  startIndex,
  endIndex,
);
// render items[startIndex..endIndex], spacers padStart/padEnd
```

## Collapsible / variable height

| Model | Approach |
|-------|----------|
| Group open/close removes children | Flatten → fixed or variable window on the short list |
| Accordion grows a row | `estimateSize` open vs closed; key includes expand state; measure updates cache |
| Huge detail panel | Cap outer height + scroll **inside** the detail, or nest a second `useVirtualWindow` |

Measurements use `ResizeObserver` on **your** row node. Size changes fully above the viewport adjust `scrollTop` (`anchorScrollDelta`) so the list does not jump under a cursor/menu.

## What this addition is not

- Not a restyle of your table  
- Not `<Grid />` (use that when you want the full Excel-class chrome)  
- Not transform-based recycling  

## Related

- [2D data](03-2d-data.md) — `<Grid data={matrix} />` when you want full grid chrome  
- [Core / headless guide](../core-guide.md) — store, selection, keyboard if you adopt more later  
- [Performance](../performance.md) — full `<Grid />` knobs  
- API: `useVirtualWindow` in `@sheetgrid/react` and `@sheetgrid/vue`; size/window helpers in `@sheetgrid/core`
