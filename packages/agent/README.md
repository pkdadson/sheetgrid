# @sheetgrid/agent

**Framework-agnostic controller and LLM tool descriptors for driving SheetGrid from an agent.**

Pair with `@sheetgrid/react` or `@sheetgrid/vue` to make a grid that your app's AI agent can read, mutate, and undo — with typed operations, structured error returns, and paste/multi-cell atomicity out of the box.

## Install

```bash
pnpm add @sheetgrid/agent
# Plus your framework binding:
pnpm add @sheetgrid/react   # or @sheetgrid/vue@next
```

Peer: `@sheetgrid/core >= 0.3.0` (installed transitively).

## Quickstart — React

```tsx
import { Grid, useGridController } from "@sheetgrid/react";
import { describeGridTools } from "@sheetgrid/agent";

function App() {
  const controller = useGridController({
    // Optional: lock the whole grid.
    readOnly: false,
    // Optional: dynamic authorization.
    authorize: (op) => {
      if (op.type === "grid.delete_row" && !userIsAdmin) return "admins only";
      return true;
    },
  });

  // Get the tool descriptors to hand to your LLM SDK.
  const tools = describeGridTools(controller);

  // Anthropic example:
  // await anthropic.messages.create({ model, tools, messages });

  return (
    <Grid
      controller={controller}
      rows={[
        { id: "r1", name: "Ada", age: 36 },
        { id: "r2", name: "Grace", age: 40 },
      ]}
      columns={[
        { id: "name", header: "Name" },
        { id: "age", header: "Age", type: "number" },
      ]}
    />
  );
}
```

## Quickstart — Vue

```vue
<script setup lang="ts">
import { SheetGrid, useGridController } from "@sheetgrid/vue";
import { describeGridTools } from "@sheetgrid/agent";

const controller = useGridController();
const tools = describeGridTools(controller);
</script>

<template>
  <SheetGrid :controller="controller" :rows="rows" :columns="columns" />
</template>
```

## Controller API — reads

```ts
controller.getSchema();
controller.getData({ rowIds?, columnIds?, range?, includeFormulaSources? });
controller.getCell(rowId, columnId);
controller.queryRows(whereClause);
controller.getSelection();
controller.describe();  // human-readable summary for prompt context
```

## Controller API — writes

Every write returns `{ ok: true } | { ok: false, code, message, details? }`.

```ts
controller.setCell(rowId, columnId, value);
controller.setCells(patches);   // partial-success report

controller.addRow(values, { at?, id? });
controller.updateRow(rowId, patch);
controller.deleteRow(rowId);
controller.moveRow(rowId, toIndex);

controller.addColumn(def, { at? });
controller.updateColumn(columnId, patch);
controller.deleteColumn(columnId);
controller.moveColumn(columnId, toIndex);

controller.setSort([{ columnId, direction }]);
controller.clearSort();
controller.setFilter({ column, op, value });
controller.select({ rowId, columnId });

controller.setFormula(rowId, columnId, source);
controller.clearFormula(rowId, columnId);
```

## Transactions

```ts
await controller.batch(async (tx) => {
  tx.setCell("r1", "amount", 100);
  tx.setCell("r1", "tax", 15);
  // Throw to roll back. One undo reverses the whole batch.
});
```

## History and snapshots

```ts
controller.undo();
controller.redo();
controller.canUndo();

const snap = controller.snapshot();
controller.restore(snap);   // itself undoable
```

## Safety layers

Three composable levers (all optional):

```ts
useGridController({
  readOnly: true,                                       // grid-wide lock
  authorize: (op) => op.type !== "grid.delete_row"      // dynamic policy
    ? true
    : "deletes require admin",
});
```

Per-column: mark `{ agentWritable: false }` on any column def to lock it.

## Events

```ts
controller.on("cell.changed", (e) => console.log(e));
controller.on("*", (e) => log(e));   // all events
```

Every event carries a `source` tag: `{ kind: 'agent' | 'user' | 'system', ... }` so multi-actor sessions stay coherent.

## LLM tool descriptors

`describeGridTools(controller)` returns SDK-agnostic descriptors:

```ts
{
  name: 'grid_set_cell',
  description: 'Write a single cell...',
  input_schema: { /* JSON Schema */ },
  execute(input) => Promise<OpResult>;
}
```

### Convert for your SDK

**Anthropic** (matches directly):

```ts
const tools = describeGridTools(controller).map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.input_schema,
}));
```

**OpenAI** (rename `input_schema` → `parameters`):

```ts
const tools = describeGridTools(controller).map((t) => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  },
}));
```

**Vercel AI SDK**:

```ts
import { tool } from "ai";

const tools = Object.fromEntries(
  describeGridTools(controller).map((t) => [
    t.name,
    tool({
      description: t.description,
      parameters: /* your schema converter */,
      execute: async (args) => (await t.execute(args)),
    }),
  ]),
);
```

## Status

**Alpha.** API surface is not stable until `0.1.0`. Feedback via [GitHub issues](https://github.com/pkdadson/sheetgrid/issues) welcome.
