# Recipe 08 — Theming

SheetGrid injects CSS variables on first mount. Override them on `.eg-root` or `:root`.

## Density

```tsx
<Grid density="comfortable" /* default */ />
<Grid density="compact" />
```

Compact sets `--eg-row-height: 28px` and `--eg-header-height: 30px`.

## Theme prop

```tsx
<Grid theme="light" /* ... */ />
<Grid theme="dark" /* ... */ />
// omit theme to inherit ancestor / html [data-theme="dark"]
```

## CSS variables (full set)

Defaults live in `@sheetgrid/tokens/variables.css`. Common overrides:

```css
.eg-root {
  /* Layout */
  --eg-row-height: 32px;
  --eg-header-height: 36px;
  --eg-radius: 2px;
  --eg-transition: 150ms ease;
  --eg-resizer-hit: 8px;

  /* Type */
  --eg-font: system-ui, -apple-system, "Segoe UI", sans-serif;
  --eg-font-size: 13px;
  --eg-font-size-group: 12px;

  /* Surfaces */
  --eg-border-color: #e2e8f0;
  --eg-border: 1px solid var(--eg-border-color);
  --eg-bg: #ffffff;
  --eg-bg-header: #f8fafc;
  --eg-bg-group: #e2e8f0;
  --eg-bg-group-border: #cbd5e1;
  --eg-bg-selected: #dbeafe;
  --eg-bg-active: #bfdbfe;
  --eg-bg-hover: #f1f5f9;
  --eg-bg-zebra: #f8fafc;

  /* Text */
  --eg-text: #0f172a;
  --eg-text-muted: #64748b;
  --eg-text-header-group: #475569;

  /* State */
  --eg-error: #dc2626;
  --eg-error-bg: #fef2f2;
  --eg-focus-ring: 0 0 0 2px #3b82f6;
  --eg-accent: #2563eb;
  --eg-accent-soft: rgba(59, 130, 246, 0.35);

  /* Status bar */
  --eg-status-bg: #f8fafc;
  --eg-status-border: #e2e8f0;

  /* Sort chrome */
  --eg-sort-icon-color: var(--eg-text-muted);
  --eg-sort-icon-active-color: var(--eg-accent);
  --eg-sort-icon-size: 12px;
  --eg-sort-badge-color: var(--eg-text-muted);
  --eg-sort-badge-size: 10px;
}
```

`prefers-reduced-motion: reduce` forces `--eg-transition: 0ms`.

## Scoped theme

```tsx
<div style={{ height: 400 }}>
  <Grid
    rows={rows}
    columns={columns}
    className="my-app-dark"
    style={{ height: "100%" }}
  />
</div>
```

```css
.my-app-dark.eg-root {
  --eg-bg: #111;
  --eg-text: #eee;
  --eg-bg-header: #1a1a1a;
  --eg-border-color: #333;
}
```

### Selector specificity

`<Grid>` applies its class to the same element as `.eg-root`. Compound the selector (**no space**) to win specificity against the injected defaults:

```css
/* ✓ wins — same element, 0-2-0 */
.my-app-dark.eg-root { --eg-bg: #111; }

/* ✗ same specificity as defaults; unreliable */
.eg-root { --eg-bg: #111; }

/* ✗ ancestor selector — descends into cells but is easily out-specificity'd */
.my-app-dark .eg-td { color: #eee; }
```

For unscoped overrides, prefer `:root`:

```css
:root {
  --eg-accent: #7c3aed;
}
```

## Density-aware overrides

`density="compact"` sets `--eg-row-height` and `--eg-header-height` inline. To customize per density, target the modifier class:

```css
.eg-root[data-density="compact"] {
  --eg-font-size: 12px;
  --eg-row-height: 26px;
}

.eg-root[data-density="comfortable"] {
  --eg-font-size: 14px;
}
```

The `data-density` attribute is set on the grid root by `<Grid density>`.

## Tokens package

Optional explicit import (SSR or bundler CSS pipeline):

```ts
import "@sheetgrid/tokens/variables.css";
```

Auto-inject still runs by default and is idempotent (`#sheetgrid-tokens` style tag).

## Class hooks

| Class | Role |
|-------|------|
| `.eg-root` / `.eg-frame` | Grid container / frame |
| `.eg-th` / `.eg-th-group` / `.eg-th-leaf` | Headers |
| `.eg-td` | Cells |
| `.eg-editor` | Edit inputs |
| `.eg-checkbox` | Boolean cells |
| `.eg-group-row` | Row group headers |
| `.eg-sort-btn` / `.eg-sort-arrow` / `.eg-sort-badge` | Sortable header chrome |
| `.eg-status` / `.eg-status-icon` | Footer status strip |

Prefer variables for colors/spacing; use classes for structural overrides.

### Vue

All theming props (`theme`, `density`, `zebra`) are the same as React, bound with Vue's `:prop` syntax:

```vue
<script setup lang="ts">
import { SheetGrid } from "@sheetgrid/vue";

const props = defineProps<{ rows: unknown[]; columns: unknown[] }>();
</script>

<template>
  <!-- Dark theme via prop -->
  <SheetGrid :rows="rows" :columns="columns" :theme="'dark'" />

  <!-- Compact density -->
  <SheetGrid :rows="rows" :columns="columns" :density="'compact'" />

  <!-- Zebra stripes -->
  <SheetGrid :rows="rows" :columns="columns" :zebra="true" />
</template>
```

Alternatively, set `data-theme="dark"` on an ancestor element — `<SheetGrid>` inherits it without the prop.

CSS variable overrides are framework-agnostic: target `.eg-root` or `:root` exactly as shown in the CSS sections above.

If you need to inject the token stylesheet manually (e.g. in an SSR/Nuxt context without automatic injection), `@sheetgrid/vue` exports `injectTokens()`:

```ts
import { injectTokens } from "@sheetgrid/vue";

// Call once at app startup — idempotent, safe to call multiple times
injectTokens();
```

This inserts the same `#sheetgrid-tokens` `<style>` tag that the component injects automatically on mount.

## Related

- [FAQ — SSR / dark mode](../faq.md#theming--ssr)
- [API — density / theme / zebra](../api.md)
