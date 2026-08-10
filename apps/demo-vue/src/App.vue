<script setup lang="ts">
import { computed, ref } from "vue";
import { useVirtualWindow } from "@sheetgrid/vue";

const rowCount = ref(10_000);
const colCount = ref(20);

const data = computed<string[][]>(() => {
  const rows: string[][] = new Array(rowCount.value);
  for (let r = 0; r < rowCount.value; r++) {
    const row: string[] = new Array(colCount.value);
    for (let c = 0; c < colCount.value; c++) {
      row[c] = `R${r}·C${c}`;
    }
    rows[r] = row;
  }
  return rows;
});

const scrollerRef = ref<HTMLDivElement | null>(null);

const v = useVirtualWindow({
  count: () => data.value.length,
  getItemKey: (i) => String(i),
  estimateSize: () => 32,
  scrollElement: scrollerRef,
});
</script>

<template>
  <div class="page">
    <header>
      <h1>SheetGrid — Vue <code>useVirtualWindow</code></h1>
      <p>
        {{ rowCount.toLocaleString() }} rows × {{ colCount }} cols. Mounted:
        <strong>{{ v.virtualItems.length }}</strong> ·
        total: <strong>{{ Math.round(v.totalSize) }}px</strong>
      </p>
    </header>

    <div ref="scrollerRef" class="scroller">
      <table>
        <tbody>
          <tr
            v-if="v.padStart > 0"
            aria-hidden="true"
            :style="{ height: v.padStart + 'px' }"
          >
            <td :colspan="colCount" class="spacer" />
          </tr>

          <tr
            v-for="item in v.virtualItems"
            :key="item.key"
            :data-index="item.index"
            :ref="(el) => v.measureElement(el as Element | null)"
          >
            <td v-for="(cell, c) in data[item.index]!" :key="c">{{ cell }}</td>
          </tr>

          <tr
            v-if="v.padEnd > 0"
            aria-hidden="true"
            :style="{ height: v.padEnd + 'px' }"
          >
            <td :colspan="colCount" class="spacer" />
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #0f172a;
  padding: 16px;
}
header h1 {
  margin: 0 0 4px;
  font-size: 18px;
}
header p {
  margin: 0 0 12px;
  color: #475569;
  font-size: 13px;
}
.scroller {
  height: 480px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
}
table {
  border-collapse: collapse;
  width: max-content;
}
td {
  padding: 6px 10px;
  border-bottom: 1px solid #f1f5f9;
  border-right: 1px solid #f1f5f9;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  white-space: nowrap;
}
td.spacer {
  padding: 0;
  border: 0;
  line-height: 0;
}
</style>
