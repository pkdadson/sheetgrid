<script setup lang="ts">
import {
  type ColumnDef,
  type GridRow,
  computeVariableWindow,
  computeWindow,
  fromMatrix,
  fromObjects,
  resolveColumnWidths,
} from "@sheetgrid/core";
import {
  computed,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
} from "vue";
import type { ObjectRow, VueColumnDef } from "./column-types.js";
import { useGridStore } from "./composables/useGridStore.js";
import { injectTokens } from "./inject-tokens.js";

export interface SheetGridProps {
  rows?: ObjectRow[];
  columns?: VueColumnDef[];
  data?: unknown[][];
  headerRow?: boolean;
  density?: "comfortable" | "compact";
  theme?: "light" | "dark";
  zebra?: boolean;
  className?: string;
  /** Extra items outside the viewport in both directions. Default 3. */
  overscan?: number;
  /** Window columns horizontally (default true). */
  virtualizeColumns?: boolean;
}

const props = withDefaults(defineProps<SheetGridProps>(), {
  density: "comfortable",
  zebra: false,
  overscan: 3,
  virtualizeColumns: true,
});

onMounted(() => {
  injectTokens();
});

function normalize(
  p: Pick<SheetGridProps, "rows" | "columns" | "data" | "headerRow">,
): { rows: GridRow[]; columns: ColumnDef[] } {
  if (p.data) {
    return fromMatrix(p.data, { headerRow: p.headerRow });
  }
  const columns = (p.columns ?? []) as ColumnDef[];
  return {
    columns,
    rows: fromObjects(p.rows ?? [], columns),
  };
}

const initial = normalize(props);
const { store, rows, columns } = useGridStore({
  rows: initial.rows,
  columns: initial.columns,
});

watch(
  () => [props.rows, props.columns, props.data, props.headerRow] as const,
  () => {
    const next = normalize(props);
    store.replaceColumns(next.columns);
    store.replaceRows(next.rows);
  },
  { deep: true },
);

// --- Layout & virtualization -------------------------------------------------

const rowHeight = computed(() => (props.density === "compact" ? 28 : 32));
const headerHeight = computed(() => (props.density === "compact" ? 30 : 36));

// Scroller viewport + scroll offsets. Refreshed via scroll listener + ResizeObserver.
const scrollerRef = ref<HTMLDivElement | null>(null);
const scrollTop = shallowRef(0);
const scrollLeft = shallowRef(0);
const viewportWidth = shallowRef(0);
const viewportHeight = shallowRef(0);

function readMetrics(el: HTMLElement) {
  scrollTop.value = el.scrollTop;
  scrollLeft.value = el.scrollLeft;
  viewportWidth.value = el.clientWidth;
  viewportHeight.value = el.clientHeight;
}

let ro: ResizeObserver | null = null;
let boundEl: HTMLElement | null = null;
const onScroll = () => {
  if (boundEl) readMetrics(boundEl);
};

watch(scrollerRef, (next) => {
  if (boundEl && boundEl !== next) {
    boundEl.removeEventListener("scroll", onScroll);
    try {
      ro?.unobserve(boundEl);
    } catch {
      /* ignore */
    }
  }
  boundEl = next;
  if (typeof ResizeObserver !== "undefined" && ro === null) {
    ro = new ResizeObserver(() => {
      if (boundEl) readMetrics(boundEl);
    });
  }
  if (boundEl) {
    boundEl.addEventListener("scroll", onScroll, { passive: true });
    ro?.observe(boundEl);
    readMetrics(boundEl);
  }
});

onScopeDispose(() => {
  if (boundEl) boundEl.removeEventListener("scroll", onScroll);
  ro?.disconnect();
  ro = null;
});

const columnIds = computed(() => columns.value.map((c) => c.id));

const widths = computed<Record<string, number>>(() => {
  return resolveColumnWidths(
    columns.value,
    viewportWidth.value,
    columnIds.value,
  );
});

const colSizes = computed<number[]>(() =>
  columnIds.value.map((id) => widths.value[id] ?? 120),
);

const tableWidth = computed(() => colSizes.value.reduce((a, b) => a + b, 0));

const rowWindow = computed(() => {
  return computeWindow({
    scrollOffset: scrollTop.value,
    viewportSize: viewportHeight.value > 0 ? viewportHeight.value : 1,
    itemSize: rowHeight.value,
    itemCount: rows.value.length,
    overscan: props.overscan,
  });
});

const colWindow = computed(() => {
  const n = columnIds.value.length;
  if (!props.virtualizeColumns || n === 0) {
    return {
      startIndex: 0,
      endIndex: n - 1,
      offsetBefore: 0,
      totalSize: tableWidth.value,
    };
  }
  return computeVariableWindow({
    scrollOffset: scrollLeft.value,
    viewportSize: viewportWidth.value > 0 ? viewportWidth.value : 1,
    sizes: colSizes.value,
    overscan: props.overscan,
  });
});

const visibleColumns = computed(() => {
  const { startIndex, endIndex } = colWindow.value;
  if (endIndex < startIndex) return [];
  return columns.value.slice(startIndex, endIndex + 1);
});

const visibleColsWidth = computed(() =>
  visibleColumns.value.reduce((sum, c) => sum + (widths.value[c.id] ?? 120), 0),
);

const leftPad = computed(() => colWindow.value.offsetBefore);
const rightPad = computed(() =>
  Math.max(
    0,
    colWindow.value.totalSize - leftPad.value - visibleColsWidth.value,
  ),
);

const visibleRows = computed(() => {
  const { startIndex, endIndex } = rowWindow.value;
  if (endIndex < startIndex || rows.value.length === 0) return [];
  return rows.value.slice(startIndex, endIndex + 1);
});

const topPad = computed(() => rowWindow.value.offsetBefore);
const rowsTotalSize = computed(() => rowWindow.value.totalSize);

function formatCellValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return String(v);
  return "";
}
</script>

<template>
  <div
    class="eg-frame"
    :class="className"
    :data-density="density"
    :data-theme="theme"
    :data-zebra="zebra ? 'true' : 'false'"
  >
    <div ref="scrollerRef" class="eg-root" role="grid" tabindex="0">
      <div
        :style="{
          height: rowsTotalSize + headerHeight + 'px',
          width: tableWidth + 'px',
          minWidth: tableWidth + 'px',
          position: 'relative',
        }"
      >
        <table
          class="eg-table"
          :style="{
            position: 'sticky',
            top: 0,
            zIndex: 3,
            width: tableWidth + 'px',
            tableLayout: 'fixed',
          }"
        >
          <colgroup>
            <col v-if="leftPad > 0" :style="{ width: leftPad + 'px' }" />
            <col
              v-for="col in visibleColumns"
              :key="col.id"
              :style="{ width: (widths[col.id] ?? 120) + 'px' }"
            />
            <col v-if="rightPad > 0" :style="{ width: rightPad + 'px' }" />
          </colgroup>
          <thead>
            <tr role="row">
              <th
                v-if="leftPad > 0"
                aria-hidden="true"
                class="eg-spacer"
                :style="{
                  width: leftPad + 'px',
                  minWidth: leftPad + 'px',
                  maxWidth: leftPad + 'px',
                  padding: 0,
                  border: 'none',
                  height: headerHeight + 'px',
                }"
              />
              <th
                v-for="col in visibleColumns"
                :key="col.id"
                class="eg-th eg-th-leaf"
                role="columnheader"
                :style="{
                  width: (widths[col.id] ?? 120) + 'px',
                  minWidth: (widths[col.id] ?? 120) + 'px',
                  maxWidth: (widths[col.id] ?? 120) + 'px',
                  height: headerHeight + 'px',
                }"
              >
                {{ col.header ?? col.id }}
              </th>
              <th
                v-if="rightPad > 0"
                aria-hidden="true"
                class="eg-spacer"
                :style="{
                  width: rightPad + 'px',
                  minWidth: rightPad + 'px',
                  maxWidth: rightPad + 'px',
                  padding: 0,
                  border: 'none',
                  height: headerHeight + 'px',
                }"
              />
            </tr>
          </thead>
        </table>
        <div
          class="eg-virt-spacer"
          :style="{ height: topPad + 'px' }"
          aria-hidden="true"
        />
        <table
          class="eg-table"
          :style="{ width: tableWidth + 'px', tableLayout: 'fixed' }"
        >
          <colgroup>
            <col v-if="leftPad > 0" :style="{ width: leftPad + 'px' }" />
            <col
              v-for="col in visibleColumns"
              :key="col.id"
              :style="{ width: (widths[col.id] ?? 120) + 'px' }"
            />
            <col v-if="rightPad > 0" :style="{ width: rightPad + 'px' }" />
          </colgroup>
          <tbody>
            <tr
              v-for="row in visibleRows"
              :key="row.id"
              role="row"
              class="eg-data-row"
              :style="{ height: rowHeight + 'px' }"
            >
              <td
                v-if="leftPad > 0"
                aria-hidden="true"
                class="eg-spacer"
                :style="{
                  width: leftPad + 'px',
                  minWidth: leftPad + 'px',
                  maxWidth: leftPad + 'px',
                  padding: 0,
                  border: 'none',
                  height: rowHeight + 'px',
                }"
              />
              <td
                v-for="col in visibleColumns"
                :key="col.id"
                class="eg-td"
                role="cell"
              >
                {{ formatCellValue(row.values[col.id]) }}
              </td>
              <td
                v-if="rightPad > 0"
                aria-hidden="true"
                class="eg-spacer"
                :style="{
                  width: rightPad + 'px',
                  minWidth: rightPad + 'px',
                  maxWidth: rightPad + 'px',
                  padding: 0,
                  border: 'none',
                  height: rowHeight + 'px',
                }"
              />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
