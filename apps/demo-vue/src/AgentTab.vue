<script setup lang="ts">
import { ref } from "vue";
import { SheetGrid, useGridController } from "@sheetgrid/vue";
import { describeGridTools } from "@sheetgrid/agent";

const controller = useGridController();
const log = ref<string[]>([]);
const command = ref("");
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

controller.on("*", (event) => {
  log.value = [...log.value.slice(-19), `${new Date().toLocaleTimeString()}  ${event.type}`];
});

function runCommand(raw: string) {
  const cmd = raw.trim().toLowerCase();
  if (cmd === "fill") {
    controller.setCells([
      { rowId: "r1", columnId: "note", value: "First contact 2026-08-11" },
      { rowId: "r2", columnId: "note", value: "Follow-up scheduled" },
      { rowId: "r3", columnId: "note", value: "Retired" },
    ]);
  } else if (cmd === "undo") {
    controller.undo();
  } else if (cmd === "snapshot") {
    (window as any).__snap = controller.snapshot();
    log.value = [...log.value, "snapshot saved → window.__snap"];
  } else if (cmd === "restore") {
    const snap = (window as any).__snap;
    if (!snap) {
      log.value = [...log.value, "no snapshot"];
      return;
    }
    controller.restore(snap);
  } else if (cmd === "tools") {
    const tools = describeGridTools(controller);
    log.value = [...log.value, `${tools.length} tools: ${tools.map((t) => t.name).join(", ")}`];
  } else {
    log.value = [...log.value, `unknown: ${raw} (try: fill, undo, snapshot, restore, tools)`];
  }
  command.value = "";
}
</script>

<template>
  <div style="display: flex; flex-direction: column; height: 600px; gap: 12px">
    <div style="height: 300px; border: 1px solid #ccc">
      <SheetGrid :controller="controller" :rows="rows" :columns="columns" />
    </div>
    <div style="display: flex; gap: 8px">
      <input
        data-testid="agent-input"
        v-model="command"
        @keydown.enter="runCommand(command)"
        placeholder='try: "fill" — "undo" — "snapshot" — "restore" — "tools"'
        style="flex: 1; padding: 6px"
      />
      <button data-testid="agent-run" @click="runCommand(command)">Run</button>
    </div>
    <pre
      data-testid="agent-log"
      style="flex: 1; margin: 0; padding: 8px; background: #f7f7f7; overflow: auto; font-size: 12px"
    >{{ log.join("\n") }}</pre>
  </div>
</template>
