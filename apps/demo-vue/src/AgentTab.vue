<script setup lang="ts">
import { ref } from "vue";
import { SheetGrid, useGridController, AgentChat } from "@sheetgrid/vue";
import type { SendInput, SendOutput } from "@sheetgrid/agent";

const controller = useGridController();
const rows = ref([
  { id: "r1", name: "Ada", age: 36, active: true, note: "" },
  { id: "r2", name: "Grace", age: 40, active: false, note: "" },
  { id: "r3", name: "Katherine", age: 100, active: true, note: "" },
]);
const columns = ref([
  { id: "name", header: "Name", type: "text" as const },
  { id: "age", header: "Age", type: "number" as const },
  { id: "active", header: "Active", type: "boolean" as const },
  { id: "note", header: "Note", type: "text" as const, description: "Free-text customer note" },
]);

async function mockSend(input: SendInput): Promise<SendOutput> {
  const last = input.messages[input.messages.length - 1];
  if (last && last.role === "tool") {
    for (const r of last.content) {
      const output: any = r.output;
      if (output.ok && Array.isArray(output.value?.rows)) {
        const names = output.value.rows.map((row: any) => row.values?.name).filter(Boolean);
        return {
          content: [{ type: "text", text: `You have ${names.length} rows: ${names.join(", ")}.` }],
          stop_reason: "end_turn",
        };
      }
    }
    return { content: [{ type: "text", text: "done." }], stop_reason: "end_turn" };
  }

  const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
  const text = (lastUser && lastUser.role === "user" ? lastUser.content : "").toLowerCase();

  if (text.includes("fill")) {
    return {
      content: [
        { type: "tool_use", id: "t1", name: "grid_set_cell", input: { rowId: "r1", columnId: "note", value: "First contact 2026-08-11" } },
        { type: "tool_use", id: "t2", name: "grid_set_cell", input: { rowId: "r2", columnId: "note", value: "Follow-up scheduled" } },
        { type: "tool_use", id: "t3", name: "grid_set_cell", input: { rowId: "r3", columnId: "note", value: "Retired" } },
      ],
      stop_reason: "tool_use",
    };
  }
  if (text.includes("undo")) {
    return { content: [{ type: "tool_use", id: "u", name: "grid_undo", input: {} }], stop_reason: "tool_use" };
  }
  if (text.includes("sort by age")) {
    return {
      content: [
        {
          type: "tool_use", id: "s", name: "grid_set_sort",
          input: { specs: [{ columnId: "age", direction: text.includes("desc") ? "desc" : "asc" }] },
        },
      ],
      stop_reason: "tool_use",
    };
  }
  if (text.includes("clear sort")) {
    return { content: [{ type: "tool_use", id: "cs", name: "grid_clear_sort", input: {} }], stop_reason: "tool_use" };
  }
  if (text.includes("who")) {
    return { content: [{ type: "tool_use", id: "g", name: "grid_get_data", input: {} }], stop_reason: "tool_use" };
  }

  return {
    content: [{ type: "text", text: `I know: "fill notes", "undo", "sort by age" (add "desc"), "clear sort", "who is in the grid".` }],
    stop_reason: "end_turn",
  };
}
</script>

<template>
  <div style="display: flex; flex-direction: column; height: 600px; gap: 12px">
    <div style="height: 300px; border: 1px solid var(--sg-border, #e5e7eb)">
      <SheetGrid :controller="controller" :rows="rows" :columns="columns" />
    </div>
    <div style="flex: 1; min-height: 0; border: 1px solid var(--sg-border, #e5e7eb); border-radius: 6px">
      <AgentChat
        :controller="controller"
        :send="mockSend"
        placeholder='try: &quot;fill notes&quot; — &quot;sort by age desc&quot; — &quot;undo&quot; — &quot;who is in the grid&quot;'
      />
    </div>
  </div>
</template>
