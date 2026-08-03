# Recipe 04 — Built-in & custom cells

## Built-in types

Set `column.type` to use shipped renderers/editors:

| `type` | Display | Edit |
|--------|---------|------|
| `text` (default) | String | Text input |
| `number` | Number | Number input |
| `boolean` | Checkbox | Toggle in place (no modal editor) |
| `select` | Option label | `<select>` with `selectOptions` |

```tsx
import { Grid } from "@sheetgrid/react";

const columns = [
  { id: "name", header: "Name", type: "text" },
  { id: "score", header: "Score", type: "number" },
  { id: "active", header: "Active", type: "boolean" },
  {
    id: "status",
    header: "Status",
    type: "select",
    selectOptions: [
      { label: "Open", value: "open" },
      { label: "Done", value: "done" },
    ],
  },
];
```

## Custom renderer / editor per column

```tsx
{
  id: "score",
  header: "Score",
  cell: ({ value }) => <span className="badge">{String(value)}</span>,
  editor: ({ value, onChange, onCommit, onCancel }) => (
    <input
      autoFocus
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => onCommit()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter") onCommit();
      }}
    />
  ),
}
```

`column.cell` / `column.editor` override the built-in for that column.

## Register a reusable type

```tsx
import { registerCellType } from "@sheetgrid/react";

registerCellType("currency", {
  cell: ({ value }) => `$${Number(value).toFixed(2)}`,
  editor: ({ value, onChange, onCommit, onCancel }) => (
    <input
      autoFocus
      type="number"
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => onChange(Number(e.target.value))}
      onBlur={() => onCommit()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter") onCommit();
      }}
    />
  ),
});

// then:
// { id: "price", header: "Price", type: "currency" }
```

## Interactive cells

`onCommitValue` commits without opening the text editor (used by boolean):

```tsx
cell: ({ value, onCommitValue }) => (
  <button type="button" onClick={() => onCommitValue(!(value as boolean))}>
    {value ? "Yes" : "No"}
  </button>
)
```
