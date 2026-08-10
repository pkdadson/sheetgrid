<script setup lang="ts">
import { computed, ref } from "vue";
import { SheetGrid, type ObjectRow } from "@sheetgrid/vue";

const props = defineProps<{
  density: "comfortable" | "compact";
  theme: "light" | "dark";
}>();

const rowCount = ref(10_000);
const colCount = ref(50);

const columns = computed(() =>
  Array.from({ length: colCount.value }, (_, i) => ({
    id: `c${i}`,
    header: `Col ${i + 1}`,
    width: 100 as const,
  })),
);

const rows = computed<ObjectRow[]>(() =>
  Array.from({ length: rowCount.value }, (_, r) => {
    const row: ObjectRow = { id: `r${r}` };
    for (let c = 0; c < colCount.value; c++) {
      row[`c${c}`] = `R${r}C${c}`;
    }
    return row;
  }),
);
</script>

<template>
  <div class="panel" data-testid="panel-perf">
    <h2>Performance playground</h2>
    <p>
      Row <strong>and</strong> column virtualization — only the visible window mounts. Scroll both axes: {{ rowCount.toLocaleString() }} rows × {{ colCount }} columns.
    </p>
    <p style="margin-top: 8px; display: flex; gap: 16px; flex-wrap: wrap;">
      <label>
        Rows:
        <select
          data-testid="perf-rows"
          :value="rowCount"
          @change="(e) => (rowCount = Number((e.target as HTMLSelectElement).value))"
        >
          <option :value="1000">1,000</option>
          <option :value="10000">10,000</option>
          <option :value="50000">50,000</option>
        </select>
      </label>
      <label>
        Columns:
        <select
          data-testid="perf-cols"
          :value="colCount"
          @change="(e) => (colCount = Number((e.target as HTMLSelectElement).value))"
        >
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </label>
    </p>
    <div class="panel-meta">
      <span class="badge">row + col virtualization</span>
      <span class="badge">{{ props.density }}</span>
    </div>
  </div>
  <div class="grid-host" data-testid="grid-host-perf">
    <SheetGrid
      data-testid="grid-perf"
      :rows="rows"
      :columns="columns"
      :density="props.density"
      :theme="props.theme"
      :status-bar="false"
    />
  </div>
</template>
