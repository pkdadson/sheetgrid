<script setup lang="ts">
import { computed, ref } from "vue";
import { SheetGrid, useVirtualWindow } from "@sheetgrid/vue";

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

// SheetGrid — same matrix, with headers derived from column indices
const sheetColumns = computed(() =>
  Array.from({ length: colCount.value }, (_, i) => ({
    id: `c${i}`,
    header: `C${i}`,
    width: 96 as const,
  })),
);

const sheetRows = computed(() => {
  const raw = data.value;
  return raw.map((row, r) => {
    const obj: Record<string, unknown> & { id: string } = { id: String(r) };
    for (let c = 0; c < colCount.value; c++) obj[`c${c}`] = row[c];
    return obj;
  });
});
</script>

<template>
  <div class="page">
    <header>
      <h1>SheetGrid — Vue</h1>
      <p>
        {{ rowCount.toLocaleString() }} rows × {{ colCount }} cols.
      </p>
    </header>

    <section>
      <h2><code>useVirtualWindow</code> (bring-your-own table)</h2>
      <p class="hint">
        Mounted: <strong>{{ v.virtualItems.length }}</strong> ·
        total: <strong>{{ Math.round(v.totalSize) }}px</strong>
      </p>
      <div ref="scrollerRef" class="scroller">
        <table>
          <tbody>
            <tr v-if="v.padStart > 0" aria-hidden="true" :style="{ height: v.padStart + 'px' }">
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
            <tr v-if="v.padEnd > 0" aria-hidden="true" :style="{ height: v.padEnd + 'px' }">
              <td :colspan="colCount" class="spacer" />
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2><code>&lt;SheetGrid&gt;</code> (full component)</h2>
      <p class="hint">Click a cell to select it. Arrow keys move. Ctrl/Cmd+C copies as TSV.</p>
      <div class="grid-wrap">
        <SheetGrid
          :rows="sheetRows"
          :columns="sheetColumns"
          :overscan="3"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #0f172a;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
header h1 {
  margin: 0 0 4px;
  font-size: 18px;
}
header p, .hint {
  margin: 0 0 8px;
  color: #475569;
  font-size: 13px;
}
section h2 {
  font-size: 14px;
  margin: 0 0 6px;
  color: #0f172a;
}
section h2 code {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}
.scroller {
  height: 320px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
}
.scroller table {
  border-collapse: collapse;
  width: max-content;
}
.scroller td {
  padding: 6px 10px;
  border-bottom: 1px solid #f1f5f9;
  border-right: 1px solid #f1f5f9;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  white-space: nowrap;
}
.scroller td.spacer {
  padding: 0;
  border: 0;
  line-height: 0;
}
.grid-wrap {
  height: 380px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  background: #ffffff;
}
</style>
