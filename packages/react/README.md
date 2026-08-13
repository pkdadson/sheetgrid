# @sheetgrid/react

Excel-class **React** data grid — virtualized rows & columns, object or 2D data, edit, validation, clipboard, groups, sort, built-in cell types, opt-in formulas.

**Bring-your-own table:** `useVirtualWindow` virtualizes an existing scroll parent and row markup without wrappers or CSS transforms (popup-safe). Works with object rows or **2D JSON** (`data[r][c]`). See [recipe 11](../../docs/recipes/11-bring-your-own-table.md).

## Install

```bash
pnpm add @sheetgrid/react
# npm i @sheetgrid/react
```

**Peers:** `react`, `react-dom` ≥ 18.2 (React 19 supported).

Transitive: `@sheetgrid/core`, `@sheetgrid/tokens` (tokens auto-inject on first render).

**Try live in StackBlitz** → [stackblitz.com/github/pkdadson/sheetgrid/tree/main/starters/react-vite](https://stackblitz.com/github/pkdadson/sheetgrid/tree/main/starters/react-vite) — no install needed, opens a Vite + React 18 project with `@sheetgrid/react@^0.2.0` from npm.

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
| `useVirtualWindow` | Bring-your-own table/matrix virtualization |
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

## Agent controller (optional)

Install `@sheetgrid/agent` to give an in-app agent structured access to the grid:

```tsx
import { Grid, useGridController } from "@sheetgrid/react";

function App() {
  const controller = useGridController();
  return (
    <Grid
      controller={controller}
      rows={rows}
      columns={columns}
    />
  );
}
```

The controller exposes `getSchema`, `getData`, `setCell`, `setCells`, `addRow`, `undo`, `snapshot`, and more — see [@sheetgrid/agent README](../agent/README.md).

### Chat UI with `<AgentChat>`

```tsx
import { AgentChat, useGridController, Grid } from "@sheetgrid/react";

const controller = useGridController();

<AgentChat
  controller={controller}
  send={async ({ messages, tools, systemPrompt, signal }) => {
    // Call your LLM (Anthropic, OpenAI, Vercel AI, or your backend).
    // Return { content: [{ type: 'text' | 'tool_use' }], stop_reason }.
  }}
/>
```

See [@sheetgrid/agent README](../agent/README.md) for full API + SDK adapters.
