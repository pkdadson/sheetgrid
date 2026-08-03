# @sheetgrid/react

Excel-class **React** data grid — virtualized rows & columns, object or 2D data, edit, validation, clipboard, groups, built-in cell types.

```bash
pnpm add @sheetgrid/react
```

```tsx
import { Grid } from "@sheetgrid/react";

export function App() {
  return (
    <div style={{ height: 400 }}>
      <Grid
        rows={[{ id: "1", name: "Ada", age: 36 }]}
        columns={[
          { id: "name", header: "Name" },
          { id: "age", header: "Age", type: "number" },
        ]}
      />
    </div>
  );
}
```

See the monorepo root [README](../../README.md) and [recipes](../../docs/recipes/).

**Peers:** `react`, `react-dom` ≥ 18.2  
**License:** MIT
