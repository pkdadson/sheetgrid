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

## Where errors appear

When a `validate` returns `{ ok: false, message, code? }`, SheetGrid
surfaces it in three coordinated places. The exact combination depends on
`validationMode`:

| Surface | Element / attribute | `reject` mode | `commit-with-error` mode |
|---------|---------------------|---------------|--------------------------|
| **Status bar** | `role="status"`, `aria-live="polite"`, `data-has-error="true"`, red `!` icon (`.eg-status-icon`, `aria-hidden`) + message text | Shown while editor is open OR active cell has a lingering error | Shown while editor is open OR active cell has an error |
| **Cell** | `role="gridcell"`, `aria-invalid="true"` | Cleared on Escape / successful re-edit (value did not change) | Persists — value is committed but still marked invalid |
| **Editor** | Input carries `aria-invalid="true"` while error is active | Editor stays open so the user can fix or Escape | Editor closes on commit; cell keeps `aria-invalid` |

Programmatic hooks:

- `onRowsChange` / `onDataChange` **do not** fire in `reject` mode when
  validation fails — the store never wrote the value.
- In `commit-with-error` mode they fire normally; use `code` in your
  `ValidationResult` to disambiguate error types.

Screen readers announce the status region politely, so the error message
comes in after the cell value. See
[Keyboard & a11y — Validation & a11y](../keyboard-a11y.md#validation--a11y).

### Custom error UI

The status bar and `aria-invalid` are built in. For richer inline UI
(icons in every failing cell, tooltip on hover), use a custom `cell`
renderer and read the `error` prop:

```tsx
{
  id: "email",
  header: "Email",
  cell: ({ value, error }) => (
    <span title={error ?? undefined}>
      {String(value ?? "")}
      {error ? <span aria-hidden="true"> ⚠</span> : null}
    </span>
  ),
  validate: /* ... */,
}
```

### Vue

Validators from `@sheetgrid/core` are framework-agnostic — import and compose them exactly as in the React version:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { SheetGrid } from "@sheetgrid/vue";
import { required, number, min, max, pattern } from "@sheetgrid/core";

const columns = [
  {
    id: "email",
    header: "Email",
    validate: (value: unknown) => {
      const r = required(value);
      if (!r.ok) return r;
      return pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email")(value);
    },
  },
  {
    id: "age",
    header: "Age",
    type: "number" as const,
    validate: (value: unknown) => {
      const n = number(value);
      if (!n.ok) return n;
      const lo = min(0)(value);
      if (!lo.ok) return lo;
      return max(120)(value);
    },
  },
];

const rows = ref([
  { id: "1", email: "ada@example.com", age: 36 },
]);
</script>

<template>
  <!-- reject mode (default): invalid edits are not committed -->
  <SheetGrid
    :rows="rows"
    :columns="columns"
    :validation-mode="'reject'"
    @rows-change="(next) => { rows = next; }"
    style="height: 360px"
  />
</template>
```

Switch to `commit-with-error` to persist values even when validation fails:

```vue
<SheetGrid :rows="rows" :columns="columns" :validation-mode="'commit-with-error'" />
```

`aria-invalid` is set on the cell element and the status bar (`:status-bar`) renders the first error message automatically — no extra wiring needed.
