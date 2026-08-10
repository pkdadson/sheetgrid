<script setup lang="ts">
import {
  type ColumnDef,
  type GridRow,
  fromMatrix,
  fromObjects,
} from "@sheetgrid/core";
import { onMounted, watch } from "vue";
import type { ObjectRow, VueColumnDef } from "./column-types.js";
import { useGridStore } from "./composables/useGridStore.js";
import { injectTokens } from "./inject-tokens.js";

export interface SheetGridProps {
  /** Object rows. Every row must have a stable string `id`. */
  rows?: ObjectRow[];
  /** Column definitions. */
  columns?: VueColumnDef[];
  /** 2D matrix data. Use instead of `rows`/`columns` for spreadsheet input. */
  data?: unknown[][];
  /** Treat the first row of `data` as the header row. */
  headerRow?: boolean;
  density?: "comfortable" | "compact";
  theme?: "light" | "dark";
  zebra?: boolean;
  className?: string;
}

const props = withDefaults(defineProps<SheetGridProps>(), {
  density: "comfortable",
  zebra: false,
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

// Sync store when props change. Object mode uses `columns` identity as the
// column source of truth; matrix mode derives both from `data` + `headerRow`.
watch(
  () => [props.rows, props.columns, props.data, props.headerRow] as const,
  () => {
    const next = normalize(props);
    store.replaceColumns(next.columns);
    store.replaceRows(next.rows);
  },
  { deep: true },
);

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
    <div class="eg-root" role="grid" tabindex="0">
      <table class="eg-table">
        <thead>
          <tr role="row">
            <th
              v-for="col in columns"
              :key="col.id"
              class="eg-th eg-th-leaf"
              role="columnheader"
            >
              {{ col.header ?? col.id }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
            role="row"
            class="eg-data-row"
          >
            <td
              v-for="col in columns"
              :key="col.id"
              class="eg-td"
              role="cell"
            >
              {{ formatCellValue(row.values[col.id]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
