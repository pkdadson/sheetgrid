# @sheetgrid/tokens

CSS design tokens (variables) for SheetGrid.

## Install

Usually you do **not** need this package directly — `@sheetgrid/react` depends on it and **injects** the stylesheet on first mount (`#sheetgrid-tokens`, idempotent).

```bash
pnpm add @sheetgrid/tokens
```

## Explicit import

Use when you want CSS in the bundler pipeline or for SSR first paint:

```ts
import "@sheetgrid/tokens/variables.css";
```

## What it defines

- Light defaults on `:root` / `.eg-root` / `.eg-frame`
- Dark theme under `[data-theme="dark"]` (and `.eg-root[data-theme="dark"]`)
- Compact density under `[data-density="compact"]`
- Sort header chrome and `prefers-reduced-motion`

Override variables in your app CSS:

```css
.eg-root {
  --eg-bg: #0f172a;
  --eg-text: #f8fafc;
  --eg-accent: #38bdf8;
}
```

Full variable list and class hooks: [Theming recipe](../../docs/recipes/08-theming.md)

## Documentation

- [Theming](../../docs/recipes/08-theming.md)
- [FAQ — SSR](../../docs/faq.md#theming--ssr)
- [Monorepo README](../../README.md)

## License

MIT
