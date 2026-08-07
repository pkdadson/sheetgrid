# FAQ & troubleshooting

## Setup

### Why is the grid blank / zero height?

The grid fills its **parent**. Give either the parent or `style` a definite height:

```tsx
<div style={{ height: 400 }}>
  <Grid rows={rows} columns={columns} />
</div>
// or
<Grid rows={rows} columns={columns} style={{ height: 400 }} />
```

`height: 100%` only works if every ancestor has a resolved height.

### Do I need to import CSS?

Usually **no**. `@sheetgrid/react` injects design tokens on first mount (idempotent `#sheetgrid-tokens` style tag).

For SSR or to load CSS via your bundler:

```ts
import "@sheetgrid/tokens/variables.css";
```

### Which package do I install?

```bash
pnpm add @sheetgrid/react
```

Peers: `react` and `react-dom` ≥ 18.2 (React 19 supported).  
`@sheetgrid/core` and `@sheetgrid/tokens` come in as transitive dependencies. Install `@sheetgrid/core` only if you build a headless or custom renderer (see [core guide](core-guide.md)).

### Can I virtualize my existing table without replacing it with `<Grid />`?

Yes. Use **`useVirtualWindow`** from `@sheetgrid/react` (or the size/window helpers in `@sheetgrid/core`). Keep your scroll parent, row components, and popover anchors; only mount the visible slice and render top/bottom spacers. Do not use CSS transforms for windowing. Recipe: [Bring your own table](recipes/11-bring-your-own-table.md).

---

## Data model

### Why do object rows need `id`?

Selection, edit state, validation errors, and reorder tracking key off a **stable string id**. Without it, React re-renders and keyboard selection desync.

```ts
// mint once and persist with your data
{ id: crypto.randomUUID(), name: "Ada", age: 36 }
```

### Object rows vs matrix — which should I use?

| Use | Prefer |
|-----|--------|
| App tables, TypeScript models, field names | `rows` + `columns` |
| Spreadsheet import, paste-heavy sheets, A1 formulas over grid coords | `data` + optional `headerRow` |

Both share virtualization, edit, clipboard, and formulas.

### Controlled vs uncontrolled data

SheetGrid does **not** own your source of truth for long. Pattern:

```tsx
const [rows, setRows] = useState(initial);

<Grid
  rows={rows}
  columns={columns}
  onRowsChange={(next, meta) => {
    // meta.reason: edit | paste | cut | reorder | api | …
    setRows(next);
  }}
/>
```

If you omit `onRowsChange` / `onDataChange`, edits still update the **internal** store for the session, but you will not see them in React state (fine for demos; not for saving).

Replacing `rows` / `data` from the parent remounts or resyncs the store from props — keep ids stable across updates.

### Sort does not change my `rows` array — is that a bug?

No. Sort is a **display transform**. `onRowsChange` / `onDataChange` emit **source order**. Formulas (`=A1`) also refer to source order / current column layout, not the sorted visual top row.

To export sorted data:

```ts
import { sortRows, type SortSpec } from "@sheetgrid/core";
const sorted = sortRows(storeRows, columns, sortBy);
```

Or keep controlled `sortBy` and apply the same specs outside the grid.

### Column reorder did not update my `columns` prop

Correct today: **leaf column order lives in the grid store**. Drag-reorder updates internal `columnOrder`. Your `columns` array definition is not rewritten.

- **Rows:** controlled via `onRowsChange` (row order = array order).
- **Columns:** visual order is store-managed; to *drive* order from app state, use `@sheetgrid/core` `setColumnOrder` / rebuild `columns` in the order you want and remount or replace columns.

See [Reorder recipe](recipes/07-reorder.md).

---

## Editing & validation

### Edits disappear after Enter

Usually **`validationMode="reject"`** (default) with a failing `validate`. Check `aria-invalid` on the editor and the status bar. Fix the value, or use `commit-with-error` for draft-invalid workflows.

### Async validation

`validate` may return a `Promise`. Paste and commit wait for per-cell results. Keep requests fast or debounce at the app layer if you hit servers.

### Clipboard does nothing

- Focus the grid first.
- Browser may block clipboard without user gesture or HTTPS.
- Check for custom `onKeyDown` capture higher in the tree that calls `preventDefault` on Cmd/Ctrl+C/V.

---

## Performance

### How big can the grid get?

DOM virtualization covers **rows and columns**. The demo includes a 10k×100 playground. Cost scales with:

- Visible cells + `overscan`
- Complexity of custom `cell` / `editor` renderers
- Formula recalculation when `formulas` is on (dirty graph + range sizes)

Tips:

- Keep cell renderers light (no heavy layout per cell).
- Prefer built-in types where possible.
- Tune `overscan` (higher = smoother scroll, more DOM).
- Set `virtualizeColumns={false}` only when you have few columns and need simpler layout.
- Avoid putting the entire app state inside every cell prop (stable column defs help).

### Scroll jank with formulas

Large ranges (`A1:Z10000`) and volatile functions (`RAND`, `NOW`) force more work. Tighten `formulaLimits`, avoid volatile where possible, or disable `allowVolatile`.

---

## Theming & SSR

### Dark mode

```tsx
<Grid theme="dark" /* ... */ />
// or set data-theme="dark" on an ancestor / html
```

Override CSS variables on `.eg-root` — [Theming](recipes/08-theming.md).

### SSR / Next.js

- Import CSS from `@sheetgrid/tokens/variables.css` in a layout if you need styles before hydrate.
- Auto-inject runs in `useEffect`-time on the client; first paint may briefly lack tokens if you rely only on inject — prefer the CSS import for SSR apps.
- Grid needs a browser for clipboard and layout measurement; render it only on the client (`"use client"` / dynamic `ssr: false`) if your framework requires it.

### Hydration mismatch warning

If you render `<Grid>` on the server without importing the token CSS,
you may see a **hydration mismatch** the first time the client
`useEffect` injects `#sheetgrid-tokens` — the server HTML has no style
tag, the client HTML gains one, and React flags the difference.

Two safe fixes:

1. **Import the CSS statically** in your root layout so the tag exists
   in the server HTML as well:

   ```ts
   // app/layout.tsx (Next.js)
   import "@sheetgrid/tokens/variables.css";
   ```

2. **Render client-only** if the grid isn't needed for SEO:

   ```tsx
   // Next.js App Router
   "use client";
   import dynamic from "next/dynamic";
   const Grid = dynamic(() => import("@sheetgrid/react").then((m) => m.Grid), {
     ssr: false,
   });
   ```

Do **not** disable the auto-inject unconditionally — the tag is
idempotent (checked by id) and adds nothing if the CSS is already
present.

### Theme flash on first paint

The `theme` prop writes `data-theme` in `useEffect`. If you set an
ancestor `[data-theme="dark"]` on `<html>` or `<body>` (Next.js theme
providers usually do this before hydration), the grid inherits it
immediately with no flash. Passing `theme="dark"` on `<Grid>` alone
runs one paint late.

---

## Formulas

### Why is `=score*0.1` wrong?

Formulas use **A1 addresses** over the **current column order and row order**, not object field names. Prefer `=B1*0.1` (or click the Score cell in point mode).

### Can users paste `=cmd|...` style attacks?

The engine is allowlist AST — no `eval`, no host APIs, no network. Still harden untrusted paste:

```tsx
<Grid formulas formulaEntry="explicit-only" />
```

Or strip leading `=`, `+`, `-`, `@` before commit. When exporting to Excel/CSV, prefix risky text fields (CSV injection hygiene).

Full list: [formulas-catalog.md](formulas-catalog.md).

---

## Accessibility

See [Keyboard & accessibility](keyboard-a11y.md) for shortcuts, roles, and testing selectors.

---

## Development of SheetGrid itself

```bash
pnpm install
pnpm test            # unit
pnpm build
pnpm dev:demo        # http://localhost:5177
pnpm test:e2e        # Playwright against demo
```

---

## Still stuck?

1. Check the [API reference](api.md) for the prop you are using.  
2. Compare with a [recipe](README.md#recipes-task-oriented).  
3. Open the demo app and match the Objects / Matrix / Perf pages.  
4. Inspect `meta.reason` in `onRowsChange` / `onDataChange`.
