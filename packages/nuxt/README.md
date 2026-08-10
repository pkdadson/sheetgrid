# @sheetgrid/nuxt

Nuxt 3 module for `@sheetgrid/vue`. Auto-imports composables and registers `<SheetGrid>` + `<SortHeader>` globally. SSR-safe.

## Install

```bash
pnpm add @sheetgrid/nuxt
```

## Configure

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@sheetgrid/nuxt"],
});
```

## Use

```vue
<script setup lang="ts">
const rows = [{ id: "1", name: "Ada", age: 36 }];
const columns = [
  { id: "name", header: "Name" },
  { id: "age", header: "Age", type: "number" },
];
</script>

<template>
  <SheetGrid :rows="rows" :columns="columns" />
</template>
```

Composables like `useVirtualWindow`, `useGridStore`, `injectTokens`, `registerCellType`, `getCellType`, `resolveColumnType` are auto-imported — no explicit imports needed in your `.vue` files.

## Options

```ts
export default defineNuxtConfig({
  modules: ["@sheetgrid/nuxt"],
  sheetgrid: {
    prefix: "V", // Optional: registers as <VSheetGrid> and <VSortHeader>.
  },
});
```

## SSR

`@sheetgrid/vue` never touches `window` / `ResizeObserver` at module scope. On the server the grid renders header + empty body; the client mounts, measures viewport, and populates the virtualized window. Hydration matches by construction — no `<ClientOnly>` wrapper needed.

## License

MIT
