# @sheetgrid/core

Framework-agnostic engine for [SheetGrid](https://github.com/): data adapters, grid store, validation, selection, virtualization math, layout, clipboard TSV, keyboard map.

Most apps should install **`@sheetgrid/react`** instead. Use this package if you are building a custom renderer or headless integration.

```bash
pnpm add @sheetgrid/core
```

```ts
import { fromMatrix, createGridStore, commitCell } from "@sheetgrid/core";

const { rows, columns } = fromMatrix(
  [
    ["Name", "Age"],
    ["Ada", 36],
  ],
  { headerRow: true },
);
const store = createGridStore({ rows, columns });
```

License: MIT
