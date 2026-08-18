<script setup lang="ts">
import { SheetGrid } from "@sheetgrid/vue";
import { ref } from "vue";

defineProps<{
  density: "comfortable" | "compact";
  theme: "light" | "dark";
}>();

const data = ref<unknown[][]>([
  ["Product", "Q1", "Q2", "Q3", "Q4", "Total", "Note"],
  ["Widgets", 120, 140, 135, 160, 0, ""],
  ["Gadgets", 80, 95, 100, 110, 0, ""],
  ["Doodads", 40, 42, 38, 55, 0, ""],
  ["Thingies", 200, 210, 205, 230, 0, ""],
]);

function onDataChange(next: unknown[][]) {
  data.value = next;
}
</script>

<template>
  <div class="panel" data-testid="panel-matrix">
    <h2>2D matrix data</h2>
    <p>
      First-class <code>data</code> + <code>headerRow</code> API. Paste TSV from a spreadsheet into a selected cell. Edits flow through <code>onDataChange</code>. Secure formulas are enabled — type <code>=</code> for A1 expressions (e.g. <code>=SUM(B1:E1)</code>). While editing a formula, click or drag cells to insert references.
    </p>
    <div class="panel-meta">
      <span class="badge">headerRow</span>
      <span class="badge">TSV paste</span>
      <span class="badge">formulas</span>
      <ul class="kbd-legend" aria-label="Keyboard shortcuts">
        <li><kbd>⌘/Ctrl</kbd>+<kbd>V</kbd> paste TSV</li>
        <li><kbd>Enter</kbd> edit cell</li>
        <li><kbd>=</kbd> start formula · click/drag cells to insert refs</li>
      </ul>
    </div>
  </div>
  <div class="grid-host" data-testid="grid-host-matrix">
    <SheetGrid
      data-testid="grid-matrix"
      :data="data"
      header-row
      formulas
      :density="density"
      :theme="theme"
      zebra
      @data-change="onDataChange"
    />
  </div>
</template>
