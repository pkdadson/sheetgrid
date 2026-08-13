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

## `<AgentChat>` and `useAgent` — drop-in chat UI

For a full chat experience, use the higher-level `useAgent` hook (React + Vue) or `<AgentChat>` component. Both are built on `createAgentLoop`, are framework-native, and ship zero LLM SDK dependencies.

### React — `<AgentChat>`

```tsx
import { Grid, useGridController, AgentChat } from "@sheetgrid/react";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_KEY });

function App() {
  const controller = useGridController();
  return (
    <>
      <Grid controller={controller} rows={rows} columns={columns} />
      <AgentChat
        controller={controller}
        send={async ({ messages, tools, systemPrompt, signal }) => {
          const res = await client.messages.create(
            {
              model: "claude-opus-4-7",
              max_tokens: 1024,
              system: systemPrompt,
              tools: tools.map((t) => ({
                name: t.name,
                description: t.description,
                input_schema: t.input_schema,
              })),
              messages: messages.map((m) =>
                m.role === "user"
                  ? { role: "user", content: m.content }
                  : m.role === "assistant"
                    ? { role: "assistant", content: m.content }
                    : { role: "user", content: m.content.map((c) => ({ type: "tool_result", tool_use_id: c.tool_use_id, content: JSON.stringify(c.output) })) }
              ),
            },
            { signal },
          );
          return res;
        }}
      />
    </>
  );
}
```

That's the full integration. Anthropic's response shape matches `SendOutput` directly.

### Vue — `<AgentChat>`

```vue
<script setup lang="ts">
import { SheetGrid, useGridController, AgentChat } from "@sheetgrid/vue";
const controller = useGridController();
async function send(input) { /* same as React */ }
</script>

<template>
  <AgentChat :controller="controller" :send="send" />
</template>
```

### Headless — `useAgent`

If `<AgentChat>` doesn't fit your UI, use the hook directly:

```tsx
const { messages, thinking, send, error } = useAgent(controller, { send: myLLMCall });
// render however you want
```

### Adapters for other SDKs

- **OpenAI**: rename `tool.input_schema` → `parameters`; map response `tool_calls` → `content` blocks (~10 lines).
- **Vercel AI SDK**: pass `tools` to `generateText`; walk the returned `toolCalls` (~15 lines).

The loop engine only cares that `send` returns `{ content: [{ type: 'text' | 'tool_use' }], stop_reason }`. Adapt on your side.

### Interception hooks

```tsx
<AgentChat
  controller={controller}
  send={myLLMCall}
  onBeforeTool={(call) => call.name !== "grid_delete_row" || confirm("Really delete?")}
  onAfterTool={(call, result) => console.log(call.name, result)}
  onError={(err) => showToast(err.message)}
/>
```

Return `false` from `onBeforeTool` to deny — the loop feeds the deny back to the model as a tool_result so it can adapt.

### Customization

`<AgentChat>` accepts `className`, `style`, `renderMessage`, `renderInput`, `renderToolTrace`, `renderError`, `renderThinking` (Vue uses named slots with the same names). Beyond that, drop the component and use `useAgent` directly.

## Status

**Alpha.** API surface is not stable until `0.1.0`. Feedback via [GitHub issues](https://github.com/pkdadson/sheetgrid/issues) welcome.
