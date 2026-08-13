# Recipe 12 — Agent chat (bring your own LLM)

Ship a chat UI where an AI agent reads and writes the grid on the user's behalf. Uses `<AgentChat>` from `@sheetgrid/react` (or `@sheetgrid/vue`) plus your LLM SDK.

`<AgentChat>` handles the full tool loop — LLM response → parse `tool_use` → execute against the grid via the shipped 26 tools → append `tool_result` → send back → repeat until the LLM stops. You supply one function: `send`, which takes `{ messages, tools, systemPrompt, signal }` and returns `{ content, stop_reason }`.

Zero LLM SDK dependencies in the shipped packages. Pick any provider — recipes below cover Anthropic, OpenAI, Vercel AI SDK, and a custom backend proxy.

---

## Minimum viable — one file

**React:**

```tsx
import { Grid, useGridController, AgentChat } from "@sheetgrid/react";
import { mySend } from "./mySend";

function App() {
  const controller = useGridController();
  return (
    <>
      <Grid controller={controller} rows={rows} columns={columns} />
      <AgentChat controller={controller} send={mySend} />
    </>
  );
}
```

**Vue:**

```vue
<script setup lang="ts">
import { SheetGrid, useGridController, AgentChat } from "@sheetgrid/vue";
import { mySend } from "./mySend";
const controller = useGridController();
</script>

<template>
  <SheetGrid :controller="controller" :rows="rows" :columns="columns" />
  <AgentChat :controller="controller" :send="mySend" />
</template>
```

The rest of this recipe is different implementations of `mySend`.

---

## Adapter — Anthropic Claude

```bash
pnpm add @anthropic-ai/sdk
```

```ts
import Anthropic from "@anthropic-ai/sdk";
import type { SendInput, SendOutput } from "@sheetgrid/agent";

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,   // Dev only — see "Production" section.
});

export async function mySend(input: SendInput): Promise<SendOutput> {
  const messages = input.messages.map((m) => {
    if (m.role === "user") return { role: "user" as const, content: m.content };
    if (m.role === "assistant") {
      return {
        role: "assistant" as const,
        content: m.content.map((b) =>
          b.type === "text"
            ? { type: "text" as const, text: b.text }
            : { type: "tool_use" as const, id: b.id, name: b.name, input: b.input },
        ),
      };
    }
    // tool_result → Anthropic represents these inside a user message
    return {
      role: "user" as const,
      content: m.content.map((r) => ({
        type: "tool_result" as const,
        tool_use_id: r.tool_use_id,
        content: JSON.stringify(r.output),
      })),
    };
  });

  const res = await client.messages.create(
    {
      model: "claude-opus-4-7",
      max_tokens: 1024,
      system: input.systemPrompt,
      tools: input.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema as any,
      })),
      messages,
    },
    { signal: input.signal },
  );

  return {
    content: res.content.map((b) =>
      b.type === "text"
        ? { type: "text" as const, text: b.text }
        : { type: "tool_use" as const, id: b.id, name: b.name, input: b.input },
    ),
    stop_reason: res.stop_reason ?? "end_turn",
  };
}
```

Anthropic's response shape matches `SendOutput` almost 1:1 — this is the shortest adapter.

---

## Adapter — OpenAI

```bash
pnpm add openai
```

```ts
import OpenAI from "openai";
import type { SendInput, SendOutput } from "@sheetgrid/agent";

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function mySend(input: SendInput): Promise<SendOutput> {
  const messages: any[] = [{ role: "system", content: input.systemPrompt }];
  for (const m of input.messages) {
    if (m.role === "user") {
      messages.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      const text = m.content.filter((b) => b.type === "text").map((b: any) => b.text).join("");
      const toolCalls = m.content
        .filter((b) => b.type === "tool_use")
        .map((b: any) => ({
          id: b.id,
          type: "function" as const,
          function: { name: b.name, arguments: JSON.stringify(b.input) },
        }));
      messages.push({
        role: "assistant",
        content: text || null,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      });
    } else {
      for (const r of m.content) {
        messages.push({
          role: "tool",
          tool_call_id: r.tool_use_id,
          content: JSON.stringify(r.output),
        });
      }
    }
  }

  const res = await client.chat.completions.create(
    {
      model: "gpt-4o",
      messages,
      tools: input.tools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema as any,
        },
      })),
    },
    { signal: input.signal },
  );

  const choice = res.choices[0]!;
  const content: SendOutput["content"] = [];
  if (choice.message.content) content.push({ type: "text", text: choice.message.content });
  for (const tc of choice.message.tool_calls ?? []) {
    if (tc.type !== "function") continue;
    content.push({
      type: "tool_use",
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments || "{}"),
    });
  }
  return {
    content,
    stop_reason: choice.finish_reason === "tool_calls" ? "tool_use" : "end_turn",
  };
}
```

Differences from Anthropic: `input_schema` → `parameters`; tool_calls are separate from content; tool results are their own message role keyed by `tool_call_id`.

---

## Adapter — Vercel AI SDK

```bash
pnpm add ai @ai-sdk/openai
```

```ts
import { generateText, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { SendInput, SendOutput } from "@sheetgrid/agent";

const openai = createOpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY });

export async function mySend(input: SendInput): Promise<SendOutput> {
  const tools: Record<string, unknown> = {};
  for (const t of input.tools) {
    tools[t.name] = tool({
      description: t.description,
      parameters: t.input_schema as any,   // pass JSON Schema through
      execute: async () => { throw new Error("unreachable"); },
    });
  }

  const messages: any[] = [{ role: "system", content: input.systemPrompt }];
  for (const m of input.messages) {
    if (m.role === "user") messages.push({ role: "user", content: m.content });
    else if (m.role === "assistant") messages.push({ role: "assistant", content: m.content });
    else {
      for (const r of m.content) {
        messages.push({
          role: "tool",
          content: [{
            type: "tool-result",
            toolCallId: r.tool_use_id,
            toolName: "",
            result: r.output,
          }],
        });
      }
    }
  }

  const res = await generateText({
    model: openai("gpt-4o"),
    messages: messages as any,
    tools: tools as any,
    abortSignal: input.signal,
  });

  const content: SendOutput["content"] = [];
  if (res.text) content.push({ type: "text", text: res.text });
  for (const tc of res.toolCalls ?? []) {
    content.push({ type: "tool_use", id: tc.toolCallId, name: tc.toolName, input: tc.args });
  }
  return {
    content,
    stop_reason: (res.toolCalls?.length ?? 0) > 0 ? "tool_use" : "end_turn",
  };
}
```

Vercel AI SDK provides its own model providers (`@ai-sdk/openai`, `@ai-sdk/anthropic`, etc). The `tool()` helper wraps schema + optional executor — we pass a placeholder `execute` because `<AgentChat>`'s own loop handles execution.

---

## Adapter — custom backend proxy (recommended for production)

The three adapters above ship the API key in the browser. **In production, always proxy through your backend.** The controller's tool descriptors are all JSON-serializable, so the browser sends `{ messages, tools }` to your server, which forwards to the LLM and returns the response.

**Frontend adapter:**

```ts
import type { SendInput, SendOutput } from "@sheetgrid/agent";

export async function mySend(input: SendInput): Promise<SendOutput> {
  const res = await fetch("/api/agent-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: input.messages,
      tools: input.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      })),
      systemPrompt: input.systemPrompt,
    }),
    signal: input.signal,
  });
  if (!res.ok) throw new Error(`agent-chat: ${res.status}`);
  return res.json();
}
```

**Backend handler (Node/Deno/Bun/Cloudflare Workers — pick your poison):**

```ts
// Example — Next.js Route Handler
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { messages, tools, systemPrompt } = await req.json();

  // Convert grid tool_result → Anthropic tool_result (same as browser adapter).
  const anthropicMessages = messages.map(/* ... same as browser adapter ... */);

  const res = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages: anthropicMessages,
  });

  return Response.json({
    content: res.content,
    stop_reason: res.stop_reason,
  });
}
```

This keeps your key server-side, lets you audit/throttle/rate-limit, and works with any LLM behind the scenes.

---

## Interception hooks

`<AgentChat>` exposes three interception points for guarding tool calls:

```tsx
<AgentChat
  controller={controller}
  send={mySend}
  onBeforeTool={(call) => {
    // Return false or throw to deny — the LLM sees the deny and can adapt.
    if (call.name === "grid_delete_row" && !userConfirmed(call)) return "user denied delete";
    return true;
  }}
  onAfterTool={(call, result) => {
    analytics.track("agent.tool", { name: call.name, ok: result.ok });
  }}
  onError={(err) => {
    if (err.code === "loop_limit") alert("Agent got stuck. Try rephrasing.");
  }}
/>
```

`onBeforeTool` can be `async` — useful for confirming with the user via a modal before destructive operations.

---

## Customizing the UI

Three levels:

**Level 1 — `className` / `style`:**

```tsx
<AgentChat controller={c} send={mySend} className="my-chat-styles" />
```

Override any of the built-in classes: `.sg-agent-chat`, `.sg-agent-chat__msg--user`, `.sg-agent-chat__msg--assistant`, `.sg-agent-chat__tool`, `.sg-agent-chat__error`, `.sg-agent-chat__thinking`, `.sg-agent-chat__input`.

**Level 2 — render props (React) or named slots (Vue):**

```tsx
<AgentChat
  controller={c}
  send={mySend}
  renderMessage={(msg) => <MyFancyBubble {...msg} />}
  renderInput={({ send, thinking }) => <MyCustomInput onSubmit={send} loading={thinking} />}
  renderError={(err) => <Toast>{err.message}</Toast>}
/>
```

```vue
<AgentChat :controller="c" :send="mySend">
  <template #message="{ message }"><MyFancyBubble :="message" /></template>
  <template #input="{ send, thinking }"><MyCustomInput @submit="send" :loading="thinking" /></template>
</AgentChat>
```

**Level 3 — headless with `useAgent`:**

```tsx
import { useGridController } from "@sheetgrid/react";
import { useAgent } from "@sheetgrid/react";

const controller = useGridController();
const { messages, thinking, error, send, cancel, reset } = useAgent(controller, {
  send: mySend,
});

// Render however you want — you get raw state + methods.
```

---

## Restricting which tools the agent can call

```tsx
<AgentChat
  controller={c}
  send={mySend}
  toolFilter={{ exclude: ["grid_delete_row", "grid_delete_column"] }}
/>
```

Or an allowlist:

```tsx
<AgentChat
  controller={c}
  send={mySend}
  toolFilter={{ include: ["grid_get_schema", "grid_get_data", "grid_set_cell"] }}
/>
```

Read-only chat: pair `useGridController({ readOnly: true })` with a lightweight tool filter — the agent can browse the grid but cannot mutate anything.

---

## Try it live

Both demo apps ship a BYOK panel above `<AgentChat>` — pick a provider, paste a key, and chat with a real LLM without editing source. The mock provider is the default (no key needed).

```bash
pnpm dev:demo         # React on :5177
pnpm dev:demo-vue     # Vue on :5178
```

---

## See also

- [`@sheetgrid/agent`](../../packages/agent/README.md) — full API for `useGridController`, `describeGridTools`, `useAgent`, `<AgentChat>`.
- [Agent controller design](../superpowers/plans/2026-08-11-agentic-grid-index.md) — full internal design (in-repo, not on npm).
