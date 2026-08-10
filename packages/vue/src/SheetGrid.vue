<script setup lang="ts">
import {
  type CellCoord,
  type ColumnDef,
  type ColumnId,
  type GridRow,
  type RowId,
  type SelectionState,
  applyPaste,
  commitCell,
  computeVariableWindow,
  computeWindow,
  createSelection,
  extendTo,
  extractRange,
  fromMatrix,
  fromObjects,
  isCellSelected,
  mapKeyToCommand,
  moveActive,
  parseTsv,
  resolveColumnWidths,
  selectAll,
  selectCell,
  serializeTsv,
  toggleCell,
} from "@sheetgrid/core";
import {
  computed,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
} from "vue";
import { resolveColumnType } from "./cells/registry.js";
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
  overscan?: number;
  virtualizeColumns?: boolean;
}

const props = withDefaults(defineProps<SheetGridProps>(), {
  density: "comfortable",
  zebra: false,
  overscan: 3,
  virtualizeColumns: true,
});

const emit = defineEmits<{
  (e: "rowsChange", rows: ObjectRow[], meta: { reason: string }): void;
  (e: "dataChange", data: unknown[][], meta: { reason: string }): void;
}>();

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

// Cast columns to VueColumnDef for access to type/cell/editor/editable fields
const vueColumns = computed(() => columns.value as VueColumnDef[]);

watch(
  () => [props.rows, props.columns, props.data, props.headerRow] as const,
  () => {
    const next = normalize(props);
    store.replaceColumns(next.columns);
    store.replaceRows(next.rows);
  },
  { deep: true },
);

function emitChange(reason: string) {
  if (props.data) {
    emit("dataChange", store.toMatrix({ headerRow: props.headerRow }), {
      reason,
    });
  } else {
    const objects: ObjectRow[] = rows.value.map((r) => ({
      id: r.id,
      ...(r.values as Record<string, unknown>),
    }));
    emit("rowsChange", objects, { reason });
  }
}

// --- Layout & virtualization -------------------------------------------------

const rowHeight = computed(() => (props.density === "compact" ? 28 : 32));
const headerHeight = computed(() => (props.density === "compact" ? 30 : 36));

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

const columnIds = computed<ColumnId[]>(() => columns.value.map((c) => c.id));
const rowIds = computed<RowId[]>(() => rows.value.map((r) => r.id));

const rowIndexOf = computed(() => {
  const m = new Map<RowId, number>();
  rowIds.value.forEach((id, i) => m.set(id, i));
  return m;
});

const colIndexOf = computed(() => {
  const m = new Map<ColumnId, number>();
  columnIds.value.forEach((id, i) => m.set(id, i));
  return m;
});

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

const rowWindow = computed(() =>
  computeWindow({
    scrollOffset: scrollTop.value,
    viewportSize: viewportHeight.value > 0 ? viewportHeight.value : 1,
    itemSize: rowHeight.value,
    itemCount: rows.value.length,
    overscan: props.overscan,
  }),
);

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
  return vueColumns.value.slice(startIndex, endIndex + 1);
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

// --- Selection ---------------------------------------------------------------

const selection = shallowRef<SelectionState>(createSelection());

const primaryRange = computed(() => {
  const s = selection.value;
  if (s.ranges.length === 0) return null;
  return s.ranges[s.ranges.length - 1] ?? null;
});

function cellSelected(rowId: RowId, columnId: ColumnId): boolean {
  return isCellSelected(
    selection.value,
    { rowId, columnId },
    rowIndexOf.value,
    colIndexOf.value,
  );
}

function cellActive(rowId: RowId, columnId: ColumnId): boolean {
  return (
    selection.value.active?.rowId === rowId &&
    selection.value.active?.columnId === columnId
  );
}

function onCellMouseDown(event: MouseEvent, rowId: RowId, columnId: ColumnId) {
  const coord: CellCoord = { rowId, columnId };
  if (event.shiftKey) {
    selection.value = extendTo(selection.value, coord);
  } else if (event.ctrlKey || event.metaKey) {
    selection.value = toggleCell(selection.value, coord);
  } else {
    selection.value = selectCell(createSelection(), coord);
  }
  scrollerRef.value?.focus({ preventScroll: true });
}

// --- Clipboard ---------------------------------------------------------------

async function copySelection(): Promise<void> {
  const range = primaryRange.value;
  if (!range) return;
  const matrix = extractRange(store, range.start, range.end);
  const tsv = serializeTsv(matrix);
  try {
    await navigator.clipboard.writeText(tsv);
  } catch {
    /* ignore when clipboard API unavailable */
  }
}

async function cutSelection(): Promise<void> {
  const range = primaryRange.value;
  if (!range) return;
  await copySelection();
  const matrix = extractRange(store, range.start, range.end);
  const empty = matrix.map((row) => row.map(() => ""));
  await applyPaste(store, range.start, empty, "commit-with-error");
  emitChange("cut");
}

async function pasteSelection(text?: string): Promise<void> {
  const active = selection.value.active ?? primaryRange.value?.start;
  if (!active) return;
  let raw = text;
  if (raw === undefined) {
    try {
      raw = await navigator.clipboard.readText();
    } catch {
      return;
    }
  }
  const matrix = parseTsv(raw);
  await applyPaste(store, active, matrix, "reject");
  emitChange("paste");
}

// --- Editing -----------------------------------------------------------------

interface EditingState {
  rowId: RowId;
  columnId: ColumnId;
  draft: unknown;
}

const editing = shallowRef<EditingState | null>(null);

function isColumnEditable(col: VueColumnDef, row: GridRow): boolean {
  if (col.editable === undefined) return true;
  if (typeof col.editable === "function") return col.editable(row);
  return col.editable;
}

function startEdit(rowId: RowId, columnId: ColumnId, seed?: unknown): void {
  const value =
    seed !== undefined ? seed : (store.getCell(rowId, columnId) ?? "");
  editing.value = { rowId, columnId, draft: value };
}

async function commitEdit(override?: unknown): Promise<void> {
  if (!editing.value) return;
  const value = override !== undefined ? override : editing.value.draft;
  const result = await commitCell(store, {
    rowId: editing.value.rowId,
    columnId: editing.value.columnId,
    value,
    mode: "reject",
    reason: "edit",
  });
  if (result.ok) {
    editing.value = null;
    emitChange("edit");
    scrollerRef.value?.focus({ preventScroll: true });
  } else {
    // reject: leave value unchanged, close editor
    editing.value = null;
    scrollerRef.value?.focus({ preventScroll: true });
  }
}

function cancelEdit(): void {
  editing.value = null;
  scrollerRef.value?.focus({ preventScroll: true });
}

async function commitValue(
  rowId: RowId,
  columnId: ColumnId,
  value: unknown,
): Promise<void> {
  const result = await commitCell(store, {
    rowId,
    columnId,
    value,
    mode: "reject",
    reason: "edit",
  });
  if (result.ok) emitChange("edit");
}

// --- Keyboard ----------------------------------------------------------------

async function onKeyDown(event: KeyboardEvent): Promise<void> {
  const phase = editing.value ? "edit" : "navigate";
  const cmd = mapKeyToCommand(
    {
      key: event.key,
      code: event.code,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
    },
    phase,
  );
  if (cmd.type === "none") return;

  if (cmd.type === "move") {
    if (editing.value) return; // let editor handle arrows
    event.preventDefault();
    selection.value = moveActive(
      selection.value,
      cmd.dir,
      rowIds.value,
      columnIds.value,
      { extend: cmd.extend },
    );
    return;
  }
  if (cmd.type === "edit" && selection.value.active) {
    event.preventDefault();
    const active = selection.value.active;
    const col = vueColumns.value.find((c) => c.id === active.columnId);
    if (col?.type === "boolean") return;
    const row = rows.value.find((r) => r.id === active.rowId);
    if (col && row && !isColumnEditable(col, row)) return;
    startEdit(active.rowId, active.columnId);
    return;
  }
  if (cmd.type === "editReplace" && selection.value.active) {
    event.preventDefault();
    const active = selection.value.active;
    const col = vueColumns.value.find((c) => c.id === active.columnId);
    if (col?.type === "boolean") return;
    const row = rows.value.find((r) => r.id === active.rowId);
    if (col && row && !isColumnEditable(col, row)) return;
    // biome-ignore lint/suspicious/noExplicitAny: cmd type narrowing
    startEdit(active.rowId, active.columnId, (cmd as any).key);
    return;
  }
  if (cmd.type === "commit") {
    event.preventDefault();
    await commitEdit();
    return;
  }
  if (cmd.type === "cancel") {
    event.preventDefault();
    cancelEdit();
    return;
  }
  if (cmd.type === "selectAll") {
    event.preventDefault();
    selection.value = selectAll(rowIds.value, columnIds.value);
    return;
  }
  if (cmd.type === "copy") {
    event.preventDefault();
    await copySelection();
    return;
  }
  if (cmd.type === "cut") {
    event.preventDefault();
    await cutSelection();
    return;
  }
  if (cmd.type === "paste") {
    event.preventDefault();
    await pasteSelection();
  }
}

function onPaste(event: ClipboardEvent): void {
  event.preventDefault();
  void pasteSelection(event.clipboardData?.getData("text/plain"));
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
    <div
      ref="scrollerRef"
      class="eg-root"
      role="grid"
      tabindex="0"
      @keydown="onKeyDown"
      @paste="onPaste"
    >
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
                :aria-selected="cellSelected(row.id, col.id)"
                :data-active="cellActive(row.id, col.id) ? 'true' : undefined"
                @mousedown="(e) => onCellMouseDown(e, row.id, col.id)"
              >
                <template v-if="editing && editing.rowId === row.id && editing.columnId === col.id">
                  <component
                    :is="col.editor ?? resolveColumnType(col.type).editor ?? col.cell ?? resolveColumnType(col.type).cell"
                    :value="editing.draft"
                    :column="col"
                    :error="undefined"
                    :on-change="(v: unknown) => { if (editing) editing = { ...editing, draft: v }; }"
                    :on-commit="(v?: unknown) => commitEdit(v)"
                    :on-cancel="cancelEdit"
                  />
                </template>
                <template v-else>
                  <component
                    :is="col.cell ?? resolveColumnType(col.type).cell"
                    :value="row.values[col.id]"
                    :row="row"
                    :column="col"
                    :row-id="row.id"
                    :is-selected="cellSelected(row.id, col.id)"
                    :is-editing="false"
                    :on-commit-value="(v: unknown) => commitValue(row.id, col.id, v)"
                  />
                </template>
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
