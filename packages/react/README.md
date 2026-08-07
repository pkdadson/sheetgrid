# @sheetgrid/react

Excel-class **React** data grid — virtualized rows & columns, object or 2D data, edit, validation, clipboard, groups, sort, built-in cell types, opt-in formulas.

**Bring-your-own table:** `useVirtualWindow` virtualizes an existing scroll parent and row markup without wrappers or CSS transforms (popup-safe). See [recipe 11](../../docs/recipes/11-bring-your-own-table.md).

## Install

```bash
pnpm add @sheetgrid/react
# npm i @sheetgrid/react
```

**Peers:** `react`, `react-dom` ≥ 18.2 (React 19 supported).

Transitive: `@sheetgrid/core`, `@sheetgrid/tokens` (tokens auto-inject on first render).

## Quickstart

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
          { id: "age", header: "Age", type: "number" },
        ]}
      />
    </div>
  );
}
```

Matrix mode:

```tsx
<Grid
  data={[
    ["Name", "Age"],
    ["Ada", 36],
  ]}
  headerRow
  onDataChange={(next) => console.log(next)}
  style={{ height: 400 }}
/>
```

## Main exports

| Export | Role |
|--------|------|
| `Grid` | Public component |
| `GridProps`, `ObjectRow`, `ReactColumnDef`, `SelectOption` | Types (`ObjectRow` is the row shape) |
| `registerCellType`, `getCellType` | Custom reusable cell types |
| `required`, `number`, `min`, `max`, `pattern` | Validators (from core) |
| `fromMatrix`, `toMatrix`, `fromObjects`, `toObjects` | Data adapters |
| Built-in cells/editors | `TextCell`, `NumberCell`, `BooleanCell`, `SelectCell`, … |

## Documentation

| Doc | Link |
|-----|------|
| Monorepo overview | [../../README.md](../../README.md) |
| **API reference** | [../../docs/api.md](../../docs/api.md) |
| Keyboard & a11y | [../../docs/keyboard-a11y.md](../../docs/keyboard-a11y.md) |
| FAQ | [../../docs/faq.md](../../docs/faq.md) |
| Recipes | [../../docs/recipes/](../../docs/recipes/) |
| Formula catalog | [../../docs/formulas-catalog.md](../../docs/formulas-catalog.md) |

## License

MIT
