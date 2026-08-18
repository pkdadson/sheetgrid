<script setup lang="ts">
import { required } from "@sheetgrid/core";
import { type ObjectRow, SheetGrid } from "@sheetgrid/vue";
import { ref } from "vue";

defineProps<{
  density: "comfortable" | "compact";
  theme: "light" | "dark";
}>();

const columns = [
  { id: "name", header: "Name", width: 160 as const, validate: required },
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
  { id: "region", header: "Region", width: 100 as const },
  { id: "score", header: "Score", width: 90 as const, type: "number" as const },
  {
    id: "bonus",
    header: "Bonus",
    width: 100 as const,
    type: "number" as const,
  },
  {
    id: "active",
    header: "Active",
    width: 80 as const,
    type: "boolean" as const,
  },
];

const columnGroups = [
  { id: "person", header: "Person", children: ["name", "role"] },
  {
    id: "work",
    header: "Work",
    children: ["region", "score", "bonus", "active"],
  },
];

const rows = ref<ObjectRow[]>([
  {
    id: "1",
    name: "Ada Lovelace",
    role: "Engineer",
    region: "EU",
    score: 98,
    bonus: 0,
    active: true,
  },
  {
    id: "2",
    name: "Grace Hopper",
    role: "Admiral",
    region: "US",
    score: 99,
    bonus: 0,
    active: true,
  },
  {
    id: "3",
    name: "Alan Turing",
    role: "Researcher",
    region: "EU",
    score: 97,
    bonus: 0,
    active: false,
  },
  {
    id: "4",
    name: "Katherine Johnson",
    role: "Mathematician",
    region: "US",
    score: 100,
    bonus: 0,
    active: true,
  },
  {
    id: "5",
    name: "Claude Shannon",
    role: "Engineer",
    region: "US",
    score: 96,
    bonus: 0,
    active: true,
  },
]);

function onRowsChange(next: ObjectRow[]) {
  rows.value = next;
}
</script>

<template>
  <div class="panel" data-testid="panel-objects">
    <h2>Object rows</h2>
    <p>
      Built-in types: text, select (Role), number (Score / Bonus), boolean (Active). Header groups + row groups by region.
      <strong>Formulas</strong> work on object rows too — A1 over column order (e.g. Bonus <code>=D1*0.1</code> from Score, or click cells while editing).
    </p>
    <div class="panel-meta">
      <span class="badge">zebra</span>
      <span class="badge">formulas</span>
      <span class="badge">click headers to sort · shift for multi</span>
      <ul class="kbd-legend" aria-label="Keyboard shortcuts">
        <li><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> move</li>
        <li><kbd>Enter</kbd> edit / commit</li>
        <li><kbd>Esc</kbd> cancel</li>
        <li><kbd>=</kbd> formula · click cells for refs</li>
        <li><kbd>⌘/Ctrl</kbd>+<kbd>C</kbd>/<kbd>V</kbd>/<kbd>X</kbd> clipboard</li>
      </ul>
    </div>
  </div>
  <div class="grid-host" data-testid="grid-host-objects">
    <SheetGrid
      data-testid="grid-objects"
      :rows="rows"
      :columns="columns"
      :column-groups="columnGroups"
      :row-grouping="{ columns: ['region'] }"
      formulas
      :virtualize-columns="false"
      :density="density"
      :theme="theme"
      zebra
      @rows-change="onRowsChange"
    />
  </div>
</template>
