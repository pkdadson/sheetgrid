<script setup lang="ts">
import { computed, ref } from "vue";
import { SheetGrid, useGridController, AgentChat } from "@sheetgrid/vue";
import ProviderConfig from "./ProviderConfig.vue";
import { useProviderSend } from "./composables/useProviderSend.js";

const controller = useGridController();
const { config, setConfig, send } = useProviderSend();

const rows = ref([
  { id: "r1", name: "Ada", age: 36, active: true, note: "" },
  { id: "r2", name: "Grace", age: 40, active: false, note: "" },
  { id: "r3", name: "Katherine", age: 100, active: true, note: "" },
]);

const columns = ref([
  { id: "name", header: "Name", type: "text" as const },
  { id: "age", header: "Age", type: "number" as const },
  { id: "active", header: "Active", type: "boolean" as const },
  {
    id: "note",
    header: "Note",
    type: "text" as const,
    description: "Free-text customer note",
  },
]);

const placeholder = computed(() =>
  config.value.provider === "mock"
    ? 'Mock LLM — try: "fill notes", "undo", "sort by age desc", "who is in the grid"'
    : `Chat with ${config.value.model || config.value.provider}...`,
);
</script>

<template>
  <div style="display: flex; flex-direction: column; height: 600px; gap: 12px">
    <ProviderConfig :config="config" @change="setConfig" />
    <div style="height: 240px; border: 1px solid var(--sg-border, #e5e7eb)">
      <SheetGrid :controller="controller" :rows="rows" :columns="columns" />
    </div>
    <div
      style="flex: 1; min-height: 0; border: 1px solid var(--sg-border, #e5e7eb); border-radius: 6px"
    >
      <AgentChat :key="config.provider" :controller="controller" :send="send" :placeholder="placeholder" />
    </div>
  </div>
</template>
