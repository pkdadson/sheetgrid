# Recipe 03 — 2D matrix data

Spreadsheet-style matrices are first-class — same grid, same virtualization.

```tsx
import { useState } from "react";
import { Grid } from "@sheetgrid/react";

export function MatrixSheet() {
  const [data, setData] = useState<unknown[][]>([
    ["Name", "Age"],
    ["Ada", 36],
    ["Grace", 40],
  ]);

  return (
    <Grid
      data={data}
      headerRow
      onDataChange={(next, meta) => {
        console.log(meta.reason);
        setData(next);
      }}
      style={{ height: 360 }}
    />
  );
}
```

## Without a header row

```tsx
<Grid data={[[1, 2], [3, 4]]} />
```

Columns become `col_0`, `col_1`, …

## Optional column metadata on matrices

Pass `columns` with the same length (or matching header ids) to attach validators and custom cells:

```tsx
<Grid
  data={matrix}
  headerRow
  columns={[
    { id: "name", header: "Name" },
    { id: "age", header: "Age", validate: required },
  ]}
/>
```

## Helpers

```ts
import { fromMatrix, toMatrix } from "@sheetgrid/react";

const { rows, columns } = fromMatrix(matrix, { headerRow: true });
const back = toMatrix(rows, columns, { headerRow: true });
```
