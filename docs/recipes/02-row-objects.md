# Recipe 02 — Row objects + TypeScript

Object rows are the best-typed path for app tables.

```tsx
import { useState } from "react";
import { Grid, type ObjectRow, required } from "@sheetgrid/react";

type Person = ObjectRow & {
  name: string;
  email: string;
};

const columns = [
  { id: "name", header: "Name", width: 160, validate: required },
  {
    id: "email",
    header: "Email",
    width: 220,
    validate: (v: unknown) =>
      String(v).includes("@")
        ? { ok: true as const }
        : { ok: false as const, message: "Invalid email" },
  },
];

export function PeopleTable() {
  const [rows, setRows] = useState<Person[]>([
    { id: "1", name: "Ada", email: "ada@example.com" },
  ]);

  return (
    <Grid
      rows={rows}
      columns={columns}
      onRowsChange={(next, meta) => {
        console.log(meta.reason); // edit | paste | cut | reorder | …
        setRows(next as Person[]);
      }}
      style={{ height: 360 }}
    />
  );
}
```

## Tips

- Every row **requires** a stable string `id` — selection, edit state, and
  reorder tracking key off it. If your data has no natural id, mint one once
  (e.g. `crypto.randomUUID()`) and store it with the row.
- `onRowsChange` receives flat objects (`{ id, ...fields }`), not internal `{ values }` shape.
- Default validation mode is `reject` (invalid edits are not committed).
