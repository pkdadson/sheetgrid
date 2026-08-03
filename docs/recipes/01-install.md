# Recipe 01 — Install and first grid

## Install

```bash
pnpm add @sheetgrid/react
# npm i @sheetgrid/react
```

**Peers:** `react` and `react-dom` ≥ 18.2.

Tokens inject automatically on first render. Optional explicit import:

```ts
import "@sheetgrid/tokens/variables.css";
```

## Minimal grid

```tsx
import { Grid } from "@sheetgrid/react";

export function App() {
  return (
    <div style={{ height: 400 }}>
      <Grid
        rows={[
          { id: "1", name: "Ada", age: 36 },
          { id: "2", name: "Grace", age: 40 },
        ]}
        columns={[
          { id: "name", header: "Name" },
          { id: "age", header: "Age" },
        ]}
      />
    </div>
  );
}
```

The grid fills its parent — give the container a height.

## Next steps

- [Row objects + TypeScript](02-row-objects.md)
- [2D matrix data](03-2d-data.md)
- [API reference](../api.md)
- [FAQ](../faq.md) (blank grid, SSR, peers)
- [Docs index](../README.md)
