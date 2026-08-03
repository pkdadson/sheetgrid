# Recipe 08 — Theming

SheetGrid injects CSS variables on first mount. Override them on `.eg-root` or `:root`.

## Density

```tsx
<Grid density="comfortable" /* default */ />
<Grid density="compact" />
```

## CSS variables

```css
.eg-root {
  --eg-row-height: 36px;
  --eg-header-height: 40px;
  --eg-border: 1px solid #334155;
  --eg-bg: #0f172a;
  --eg-bg-header: #1e293b;
  --eg-bg-selected: #1e3a5f;
  --eg-bg-active: #1d4ed8;
  --eg-text: #f8fafc;
  --eg-error: #f87171;
  --eg-focus-ring: 0 0 0 2px #38bdf8;
  --eg-font: "IBM Plex Sans", system-ui, sans-serif;
}
```

## Scoped theme

```tsx
<div className="my-app-dark" style={{ height: 400 }}>
  <Grid rows={rows} columns={columns} className="my-app-dark" style={{ height: "100%" }} />
</div>
```

```css
.my-app-dark.eg-root {
  --eg-bg: #111;
  --eg-text: #eee;
}
```

## Tokens package

Optional explicit import (if you disable auto-inject later or want SSR CSS):

```ts
import "@sheetgrid/tokens/variables.css";
```

Auto-inject still runs by default and is idempotent (`#sheetgrid-tokens` style tag).

## Class hooks

| Class | Role |
|-------|------|
| `.eg-root` | Grid container |
| `.eg-th` / `.eg-th-group` / `.eg-th-leaf` | Headers |
| `.eg-td` | Cells |
| `.eg-editor` | Edit inputs |
| `.eg-checkbox` | Boolean cells |
| `.eg-group-row` | Row group headers |

Prefer variables for colors/spacing; use classes for structural overrides.
