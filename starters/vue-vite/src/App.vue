<script setup lang="ts">
import { type ObjectRow, SheetGrid } from "@sheetgrid/vue";
import { ref } from "vue";

const columns = [
  { id: "name", header: "Name", width: 160 as const },
  {
    id: "role",
    header: "Role",
    width: 140 as const,
    type: "select" as const,
    selectOptions: [
      { label: "Engineer", value: "Engineer" },
      { label: "Admiral", value: "Admiral" },
      { label: "Researcher", value: "Researcher" },
      { label: "Mathematician", value: "Mathematician" },
    ],
  },
  {
    id: "score",
    header: "Score",
    width: 100 as const,
    type: "number" as const,
  },
  {
    id: "active",
    header: "Active",
    width: 90 as const,
    type: "boolean" as const,
  },
];

const rows = ref<ObjectRow[]>([
  { id: "1", name: "Ada Lovelace", role: "Engineer", score: 98, active: true },
  { id: "2", name: "Grace Hopper", role: "Admiral", score: 99, active: true },
  {
    id: "3",
    name: "Alan Turing",
    role: "Researcher",
    score: 97,
    active: false,
  },
  {
    id: "4",
    name: "Katherine Johnson",
    role: "Mathematician",
    score: 100,
    active: true,
  },
  {
    id: "5",
    name: "Claude Shannon",
    role: "Engineer",
    score: 96,
    active: true,
  },
]);

function onRowsChange(next: ObjectRow[]) {
  rows.value = next;
}
</script>

<template>
  <div class="page">
    <header>
      <h1>SheetGrid — Vue starter</h1>
      <p class="hint">
        Click a cell to select. Enter to edit. Arrow keys to move. Ctrl/Cmd+C copies as TSV.
        Click a header to sort (Shift+click for multi-sort).
      </p>
    </header>
    <div class="grid-host">
      <SheetGrid
        :rows="rows"
        :columns="columns"
        :virtualize-columns="false"
        zebra
        @rows-change="onRowsChange"
      />
    </div>
  </div>
</template>
