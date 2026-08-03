# Recipe 05 — Validation

SheetGrid validates on **commit** (Enter, blur, paste). Default mode is `reject` — invalid values are not written.

## Column validators

```tsx
import { Grid, required, number, min, max, pattern } from "@sheetgrid/react";

const columns = [
  {
    id: "email",
    header: "Email",
    validate: (value) => {
      const r = required(value);
      if (!r.ok) return r;
      return pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email")(value);
    },
  },
  {
    id: "age",
    header: "Age",
    type: "number",
    validate: (value) => {
      const n = number(value);
      if (!n.ok) return n;
      const lo = min(0)(value);
      if (!lo.ok) return lo;
      return max(120)(value);
    },
  },
];

export function FormGrid({ rows, onRowsChange }) {
  return (
    <Grid
      rows={rows}
      columns={columns}
      onRowsChange={onRowsChange}
      validationMode="reject"
      style={{ height: 360 }}
    />
  );
}
```

## Validation modes

| Mode | Behavior |
|------|----------|
| `reject` (default) | Do not commit; cell keeps previous value; error shown |
| `commit-with-error` | Commit value and mark cell invalid (form-style) |

```tsx
<Grid validationMode="commit-with-error" /* ... */ />
```

## Async validation

```tsx
{
  id: "username",
  header: "Username",
  validate: async (value) => {
    const res = await fetch(`/api/check?u=${encodeURIComponent(String(value))}`);
    const { available } = await res.json();
    return available
      ? { ok: true }
      : { ok: false, message: "Username taken", code: "unique" };
  },
}
```

## Paste

Paste runs validators **per cell**. Valid cells commit; invalid cells are flagged (and not written in `reject` mode).

## Built-in helpers

| Helper | Use |
|--------|-----|
| `required(value)` | Non-empty |
| `number(value)` | Finite number / numeric string |
| `min(n)(value)` | ≥ n |
| `max(n)(value)` | ≤ n |
| `pattern(re, msg?)(value)` | RegExp match |

Compose them in your own `validate` function — no Zod hard dependency.
