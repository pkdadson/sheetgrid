<script setup lang="ts">
import {
  type CellCoord,
  type ColumnDef,
  type ColumnGroupDef,
  type ColumnId,
  type GridRow,
  type HeaderCellSpan,
  type RowId,
  type SelectionState,
  type SortSpec,
  type ValidationMode,
  type VisibleRow,
  applyPaste,
  buildVisibleRows,
  cellKey,
  commitCell,
  computeVariableWindow,
  computeWindow,
  createSelection,
  extendTo,
  extractRange,
  flattenColumnGroups,
  formatA1,
  formatA1Range,
  formulaDisplayValue,
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
  sortRows,
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
import SortHeader from "./SortHeader.vue";
import { resolveColumnType } from "./cells/registry.js";
import type { ObjectRow, VueColumnDef } from "./column-types.js";
import { useGridStore } from "./composables/useGridStore.js";
import {
  type FormulaPickRange,
  applyFormulaPick,
  cellInPickRange,
  expandPickRange,
  isFormulaDraft,
} from "./formula-point.js";
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
  columnGroups?: ColumnGroupDef[];
  sortBy?: SortSpec[];
  defaultSortBy?: SortSpec[];
  formulas?: boolean;
  formulaEntry?: import("@sheetgrid/core").FormulaEntryMode;
  formulaLimits?: Partial<import("@sheetgrid/core").FormulaLimits>;
  allowIndirect?: boolean;
  allowVolatile?: boolean;
  validationMode?: ValidationMode;
  statusBar?: boolean;
  rowGrouping?: { columns: string[] };
  ariaLabel?: string;
}

const props = withDefaults(defineProps<SheetGridProps>(), {
  density: "comfortable",
  zebra: false,
  overscan: 3,
  virtualizeColumns: true,
  validationMode: "reject",
  statusBar: true,
});

const emit = defineEmits<{
  (e: "rowsChange", rows: ObjectRow[], meta: { reason: string }): void;
  (e: "dataChange", data: unknown[][], meta: { reason: string }): void;
  (e: "sortChange", next: SortSpec[]): void;
}>();

onMounted(() => {
  injectTokens();
  window.addEventListener("mousemove", onGlobalMouseMove);
  window.addEventListener("mouseup", onGlobalMouseUp);
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
const { store, rows, columns, errors } = useGridStore({
  rows: initial.rows,
  columns: initial.columns,
  formulas: props.formulas,
  formulaEntry: props.formulaEntry,
  formulaOptions: props.formulas
    ? {
        limits: props.formulaLimits,
        allowIndirect: props.allowIndirect,
        allowVolatile: props.allowVolatile,
      }
    : undefined,
});

// Cast columns to VueColumnDef for access to type/cell/editor/editable fields
const vueColumns = computed(() => columns.value as VueColumnDef[]);

// --- Validation state --------------------------------------------------------

const rejectedCell = shallowRef<CellCoord | null>(null);

function cellError(rowId: RowId, columnId: ColumnId): string | undefined {
  const key = cellKey(rowId, columnId);
  return errors.value.get(key)?.message;
}

const firstError = computed<string | undefined>(() => {
  for (const err of errors.value.values()) {
    return err.message;
  }
  return undefined;
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
  window.removeEventListener("mousemove", onGlobalMouseMove);
  window.removeEventListener("mouseup", onGlobalMouseUp);
});

const columnIds = computed<ColumnId[]>(() => columns.value.map((c) => c.id));
// rowIds uses only data rows (not group header rows) for keyboard nav / selection
const rowIds = computed<RowId[]>(() => dataRowIds.value);

const rowIndexOf = computed(() => {
  const m = new Map<RowId, number>();
  rowIds.value.forEach((id, i) => m.set(id, i));
  return m;
});

const visibleColumnIds = computed<Set<ColumnId>>(
  () => new Set(visibleColumns.value.map((c) => c.id)),
);

const headerLevels = computed<HeaderCellSpan[][]>(() => {
  const leafHeaders = Object.fromEntries(
    columns.value.map((c) => [c.id, String(c.header ?? c.id)]),
  );
  if (!props.columnGroups || props.columnGroups.length === 0) {
    return [
      columns.value.map<HeaderCellSpan>((c) => ({
        id: c.id,
        header: String(c.header ?? c.id),
        columnIds: [c.id],
        colSpan: 1,
      })),
    ];
  }
  return flattenColumnGroups(
    props.columnGroups,
    columns.value.map((c) => c.id),
    { leafHeaders },
  );
});

const colIndexOf = computed(() => {
  const m = new Map<ColumnId, number>();
  columnIds.value.forEach((id, i) => m.set(id, i));
  return m;
});

// --- Column resize -----------------------------------------------------------

const widthOverrides = shallowRef<Record<string, number>>({});
const resizeState = { columnId: null as string | null, startX: 0, startW: 0 };

function onResizeMouseDown(event: MouseEvent, columnId: string) {
  event.preventDefault();
  event.stopPropagation();
  resizeState.columnId = columnId;
  resizeState.startX = event.clientX;
  const base = resolveColumnWidths(
    columns.value,
    viewportWidth.value,
    columnIds.value,
  );
  resizeState.startW = { ...base, ...widthOverrides.value }[columnId] ?? 120;
}

function onGlobalMouseMove(event: MouseEvent) {
  if (!resizeState.columnId) return;
  const next = Math.max(
    40,
    resizeState.startW + (event.clientX - resizeState.startX),
  );
  widthOverrides.value = {
    ...widthOverrides.value,
    [resizeState.columnId]: next,
  };
}

function onGlobalMouseUp() {
  resizeState.columnId = null;
}

// --- Column reorder ----------------------------------------------------------

const dragColId = shallowRef<string | null>(null);

function onHeaderDragStart(event: DragEvent, columnId: string) {
  dragColId.value = columnId;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", columnId);
  }
}

function onHeaderDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
}

function onHeaderDrop(event: DragEvent, targetId: string) {
  event.preventDefault();
  const sourceId =
    dragColId.value ?? event.dataTransfer?.getData("text/plain") ?? "";
  dragColId.value = null;
  if (!sourceId || sourceId === targetId) return;
  const order = store.getColumnOrder();
  const toIndex = order.indexOf(targetId);
  if (toIndex < 0) return;
  store.moveColumn(sourceId, toIndex);
  emitChange("reorder");
}

const widths = computed<Record<string, number>>(() => {
  const base = resolveColumnWidths(
    columns.value,
    viewportWidth.value,
    columnIds.value,
  );
  return { ...base, ...widthOverrides.value };
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
    itemCount: visibleFlatRows.value.length,
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

const visibleRows = computed<VisibleRow[]>(() => {
  const flat = visibleFlatRows.value;
  if (flat.length === 0) return [];
  // When viewport is unmeasured (SSR or zero-height mount), show everything
  if (viewportHeight.value === 0) return flat;
  const { startIndex, endIndex } = rowWindow.value;
  if (endIndex < startIndex) return [];
  return flat.slice(startIndex, endIndex + 1);
});

const topPad = computed(() => rowWindow.value.offsetBefore);
const rowsTotalSize = computed(() => rowWindow.value.totalSize);

// --- Sort --------------------------------------------------------------------

const internalSort = shallowRef<SortSpec[]>(props.defaultSortBy ?? []);
const effectiveSort = computed<SortSpec[]>(() =>
  props.sortBy !== undefined ? props.sortBy : internalSort.value,
);

function applySort(next: SortSpec[]): void {
  emit("sortChange", next);
  if (props.sortBy === undefined) internalSort.value = next;
}

function cycleSort(columnId: string, extend: boolean): void {
  const current = effectiveSort.value;
  const idx = current.findIndex((s) => s.columnId === columnId);
  const entry = idx >= 0 ? current[idx] : null;
  const next: SortSpec[] = extend ? [...current] : [];
  if (!extend && idx >= 0) {
    if (entry?.direction === "asc") {
      next.push({ columnId, direction: "desc" });
    } else if (entry?.direction === "desc") {
      // remove — leave next as []
    } else {
      next.push({ columnId, direction: "asc" });
    }
  } else if (!extend) {
    next.push({ columnId, direction: "asc" });
  } else if (idx >= 0) {
    const filtered = next.filter((s) => s.columnId !== columnId);
    if (entry?.direction === "asc") {
      filtered.push({ columnId, direction: "desc" });
    }
    // desc → removed (already filtered out)
    next.length = 0;
    next.push(...filtered);
  } else {
    next.push({ columnId, direction: "asc" });
  }
  applySort(next);
}

function sortDir(columnId: string): "asc" | "desc" | null {
  const e = effectiveSort.value.find((s) => s.columnId === columnId);
  return e ? e.direction : null;
}

function sortPriority(columnId: string): number | undefined {
  const idx = effectiveSort.value.findIndex((s) => s.columnId === columnId);
  return effectiveSort.value.length >= 2 && idx >= 0 ? idx + 1 : undefined;
}

function ariaSort(
  columnId: string,
  sortable: boolean,
): "ascending" | "descending" | "none" | undefined {
  if (!sortable) return undefined;
  const d = sortDir(columnId);
  return d === "asc" ? "ascending" : d === "desc" ? "descending" : "none";
}

// --- Row grouping ------------------------------------------------------------

const expandState = shallowRef<Record<string, boolean>>({});
const groupBy = computed(() => props.rowGrouping?.columns ?? []);

function toggleGroup(key: string) {
  const cur = expandState.value[key] !== false;
  expandState.value = { ...expandState.value, [key]: !cur };
}

const sortedBodyRows = computed<GridRow[]>(() => {
  const spec = effectiveSort.value;
  const gb = groupBy.value;
  if (spec.length === 0) return rows.value;
  const sortingGrouped = spec.some((s) => gb.includes(s.columnId));
  if (gb.length === 0 || sortingGrouped) {
    return sortRows(rows.value, columns.value, spec);
  }
  // Sort within groups, preserve source group order
  const key = (row: GridRow) =>
    gb.map((g) => String(row.values[g])).join("\u0000");
  const order: string[] = [];
  const buckets = new Map<string, GridRow[]>();
  for (const r of rows.value) {
    const k = key(r);
    if (!buckets.has(k)) {
      order.push(k);
      buckets.set(k, []);
    }
    // biome-ignore lint/style/noNonNullAssertion: bucket set above
    buckets.get(k)!.push(r);
  }
  const out: GridRow[] = [];
  for (const k of order) {
    // biome-ignore lint/style/noNonNullAssertion: k comes from order
    const sorted = sortRows(buckets.get(k)!, columns.value, spec);
    out.push(...sorted);
  }
  return out;
});

// Keep sortedRows as an alias for backward compat with rowIds
const sortedRows = sortedBodyRows;

const visibleFlatRows = computed<VisibleRow[]>(() =>
  buildVisibleRows(
    sortedBodyRows.value,
    { groupBy: groupBy.value },
    expandState.value,
  ),
);

const dataRowIds = computed<RowId[]>(() =>
  visibleFlatRows.value
    .filter(
      (v): v is Extract<VisibleRow, { type: "body" }> => v.type === "body",
    )
    .map((v) => v.rowId),
);

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
  // Formula pick mode: click cells while editing a formula draft to insert A1 refs.
  if (
    editing.value &&
    store.isFormulasEnabled() &&
    isFormulaDraft(editing.value.draft)
  ) {
    event.preventDefault();
    event.stopPropagation();
    // Don't pick the cell that's being edited.
    if (rowId === editing.value.rowId && columnId === editing.value.columnId) {
      return;
    }
    const rIdx = rowIndexOf.value.get(rowId);
    const cIdx = colIndexOf.value.get(columnId);
    if (rIdx === undefined || cIdx === undefined) return;

    if (event.shiftKey && formulaPickAnchor.value) {
      // Extend last pick into a range from the anchor
      const range = expandPickRange(
        formulaPickAnchor.value.row,
        formulaPickAnchor.value.col,
        rIdx,
        cIdx,
      );
      formulaPickRange.value = range;
      const token = formatA1Range(range.r1, range.c1, range.r2, range.c2);
      const result = applyFormulaPick(
        String(editing.value.draft),
        token,
        formulaPickStart.value,
      );
      editing.value = { ...editing.value, draft: result.draft };
      formulaPickStart.value = result.pickStart;
    } else {
      // New pick — anchor here
      formulaPickAnchor.value = { row: rIdx, col: cIdx };
      formulaPickRange.value = { r1: rIdx, c1: cIdx, r2: rIdx, c2: cIdx };
      const token = formatA1(rIdx, cIdx);
      const result = applyFormulaPick(String(editing.value.draft), token, null);
      editing.value = { ...editing.value, draft: result.draft };
      formulaPickStart.value = result.pickStart;
    }
    return;
  }

  // Existing selection branches:
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
  const { start, end } = range;
  const single = start.rowId === end.rowId && start.columnId === end.columnId;
  if (single && store.isFormulasEnabled()) {
    const f = store.getFormula(start.rowId, start.columnId);
    if (f) {
      try {
        await navigator.clipboard.writeText(f.source);
      } catch {
        /* ignore */
      }
      return;
    }
  }
  const matrix = extractRange(store, start, end);
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
  await applyPaste(store, active, matrix, props.validationMode);
  emitChange("paste");
}

// --- Editing -----------------------------------------------------------------

interface EditingState {
  rowId: RowId;
  columnId: ColumnId;
  draft: unknown;
}

const editing = shallowRef<EditingState | null>(null);

const formulaPickRange = shallowRef<FormulaPickRange | null>(null);
const formulaPickStart = shallowRef<number | null>(null);
const formulaPickAnchor = shallowRef<{ row: number; col: number } | null>(null);

function clearFormulaPick() {
  formulaPickRange.value = null;
  formulaPickStart.value = null;
  formulaPickAnchor.value = null;
}

function cellInFormulaPick(rowId: RowId, columnId: ColumnId): boolean {
  const range = formulaPickRange.value;
  if (!range) return false;
  const r = rowIndexOf.value.get(rowId);
  const c = colIndexOf.value.get(columnId);
  if (r === undefined || c === undefined) return false;
  return cellInPickRange(r, c, range);
}

function isColumnEditable(col: VueColumnDef, row: GridRow): boolean {
  if (col.editable === undefined) return true;
  if (typeof col.editable === "function") return col.editable(row);
  return col.editable;
}

function startEdit(rowId: RowId, columnId: ColumnId, seed?: unknown): void {
  if (seed !== undefined) {
    editing.value = { rowId, columnId, draft: seed };
    return;
  }
  if (store.isFormulasEnabled()) {
    const f = store.getFormula(rowId, columnId);
    if (f) {
      editing.value = { rowId, columnId, draft: f.source };
      return;
    }
  }
  const value = store.getCell(rowId, columnId) ?? "";
  editing.value = { rowId, columnId, draft: value };
}

function onEditorChange(v: unknown): void {
  if (editing.value) {
    editing.value = { ...editing.value, draft: v };
  }
}

async function commitEdit(override?: unknown): Promise<void> {
  if (!editing.value) return;
  const value = override !== undefined ? override : editing.value.draft;
  const { rowId, columnId } = editing.value;

  // Formula routing: if the store has formulas enabled AND value is a string
  // starting with "=" (auto-equals mode), treat as formula source.
  if (
    store.isFormulasEnabled() &&
    typeof value === "string" &&
    value.startsWith("=")
  ) {
    const ok = store.setFormula(rowId, columnId, value);
    clearFormulaPick();
    editing.value = null;
    if (ok) emitChange("edit");
    scrollerRef.value?.focus({ preventScroll: true });
    return;
  }

  // Non-formula path
  const result = await commitCell(store, {
    rowId,
    columnId,
    value,
    mode: props.validationMode,
    reason: "edit",
  });
  if (result.ok) {
    clearFormulaPick();
    editing.value = null;
    rejectedCell.value = null;
    emitChange("edit");
    scrollerRef.value?.focus({ preventScroll: true });
  } else {
    // validation failed: close editor, record rejected cell for Escape-clear
    clearFormulaPick();
    editing.value = null;
    if (props.validationMode === "reject") {
      rejectedCell.value = { rowId, columnId };
    }
    scrollerRef.value?.focus({ preventScroll: true });
  }
}

function cancelEdit(): void {
  if (editing.value) {
    clearFormulaPick();
    editing.value = null;
    scrollerRef.value?.focus({ preventScroll: true });
    return;
  }
  // No active editor: Escape in reject-mode clears the error on the previously
  // rejected cell if it matches the currently active cell.
  if (
    props.validationMode === "reject" &&
    rejectedCell.value !== null &&
    selection.value.active?.rowId === rejectedCell.value.rowId &&
    selection.value.active?.columnId === rejectedCell.value.columnId
  ) {
    store.clearError(rejectedCell.value.rowId, rejectedCell.value.columnId);
    rejectedCell.value = null;
  }
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
    mode: props.validationMode,
    reason: "edit",
  });
  if (result.ok) emitChange("edit");
}

// --- Formula display ---------------------------------------------------------

function displayValue(row: GridRow, col: VueColumnDef): unknown {
  if (store.isFormulasEnabled()) {
    const f = store.getFormula(row.id, col.id);
    if (f) return formulaDisplayValue(f.result);
  }
  return row.values[col.id];
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
      :aria-rowcount="dataRowIds.length"
      :aria-colcount="columnIds.length"
      :aria-label="ariaLabel"
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
            <tr
              v-for="(level, levelIndex) in headerLevels"
              :key="levelIndex"
              role="row"
            >
              <!-- left spacer: only on leaf level -->
              <th
                v-if="leftPad > 0 && levelIndex === headerLevels.length - 1"
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
              <template v-if="levelIndex < headerLevels.length - 1">
                <!-- non-leaf group header cells -->
                <th
                  v-for="cell in level"
                  :key="cell.id"
                  class="eg-th eg-th-group"
                  role="columnheader"
                  :colspan="Math.max(1, cell.colSpan, cell.columnIds.length)"
                >
                  {{ cell.header }}
                </th>
              </template>
              <template v-else>
                <!-- leaf header cells: only render those visible -->
                <template v-for="cell in level" :key="cell.id">
                  <template v-if="visibleColumnIds.has(cell.columnIds[0])">
                    <th
                      class="eg-th eg-th-leaf"
                      role="columnheader"
                      :aria-sort="ariaSort(cell.columnIds[0], (vueColumns.find(c => c.id === cell.columnIds[0])?.sortable ?? true) !== false)"
                      :style="{
                        width: (widths[cell.columnIds[0]] ?? 120) + 'px',
                        minWidth: (widths[cell.columnIds[0]] ?? 120) + 'px',
                        maxWidth: (widths[cell.columnIds[0]] ?? 120) + 'px',
                        height: headerHeight + 'px',
                      }"
                      draggable="true"
                      @dragstart="(e) => onHeaderDragStart(e, cell.columnIds[0])"
                      @dragover="onHeaderDragOver"
                      @drop="(e) => onHeaderDrop(e, cell.columnIds[0])"
                    >
                      <SortHeader
                        v-if="(vueColumns.find(c => c.id === cell.columnIds[0])?.sortable ?? true) !== false"
                        :label="cell.header"
                        :direction="sortDir(cell.columnIds[0])"
                        :priority="sortPriority(cell.columnIds[0])"
                        @sort="cycleSort(cell.columnIds[0], false)"
                        @shift-sort="cycleSort(cell.columnIds[0], true)"
                      />
                      <template v-else>{{ cell.header }}</template>
                      <div
                        class="eg-col-resizer"
                        aria-hidden="true"
                        @mousedown="(e) => onResizeMouseDown(e, cell.columnIds[0])"
                      />
                    </th>
                  </template>
                </template>
              </template>
              <!-- right spacer: only on leaf level -->
              <th
                v-if="rightPad > 0 && levelIndex === headerLevels.length - 1"
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
            <template v-for="vr in visibleRows" :key="vr.type === 'group' ? vr.key : vr.row.id">
              <!-- Group header row -->
              <tr
                v-if="vr.type === 'group'"
                role="row"
                class="eg-group-row"
                :style="{ height: rowHeight + 'px' }"
              >
                <td
                  v-if="leftPad > 0"
                  aria-hidden="true"
                  class="eg-spacer"
                  :style="{ width: leftPad + 'px' }"
                />
                <td class="eg-td" :colspan="Math.max(1, visibleColumns.length)">
                  <button
                    type="button"
                    class="eg-group-toggle"
                    :aria-expanded="vr.expanded"
                    :aria-label="vr.expanded ? `Collapse group ${String(vr.value)}` : `Expand group ${String(vr.value)}`"
                    @click="toggleGroup(vr.key)"
                  >
                    <svg class="eg-chevron" viewBox="0 0 12 12">
                      <path :d="vr.expanded ? 'M2 4l4 4 4-4' : 'M4 2l4 4-4 4'" />
                    </svg>
                  </button>
                  {{ String(vr.value) }} ({{ vr.count }})
                </td>
                <td
                  v-if="rightPad > 0"
                  aria-hidden="true"
                  class="eg-spacer"
                  :style="{ width: rightPad + 'px' }"
                />
              </tr>
              <!-- Data row -->
              <tr
                v-else
                :data-index="vr.row.id"
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
                  :class="{ 'eg-td': true, 'eg-formula-ref': cellInFormulaPick(vr.row.id, col.id) }"
                  role="cell"
                  :aria-selected="cellSelected(vr.row.id, col.id)"
                  :aria-invalid="cellError(vr.row.id, col.id) ? true : undefined"
                  :title="cellError(vr.row.id, col.id) || undefined"
                  :data-active="cellActive(vr.row.id, col.id) ? 'true' : undefined"
                  @mousedown="(e) => onCellMouseDown(e, vr.row.id, col.id)"
                >
                  <template v-if="editing && editing.rowId === vr.row.id && editing.columnId === col.id">
                    <component
                      :is="col.editor ?? resolveColumnType(col.type).editor ?? col.cell ?? resolveColumnType(col.type).cell"
                      :value="editing.draft"
                      :column="col"
                      :error="undefined"
                      :on-change="onEditorChange"
                      :on-commit="(v?: unknown) => commitEdit(v)"
                      :on-cancel="cancelEdit"
                    />
                  </template>
                  <template v-else>
                    <component
                      :is="col.cell ?? resolveColumnType(col.type).cell"
                      :value="displayValue(vr.row, col)"
                      :row="vr.row"
                      :column="col"
                      :row-id="vr.row.id"
                      :error="cellError(vr.row.id, col.id)"
                      :is-selected="cellSelected(vr.row.id, col.id)"
                      :is-editing="false"
                      :on-commit-value="(v: unknown) => commitValue(vr.row.id, col.id, v)"
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
            </template>
          </tbody>
        </table>
      </div>
    </div>
    <div
      v-if="statusBar"
      class="eg-status"
      :data-has-error="firstError ? 'true' : undefined"
    >
      <template v-if="firstError">
        <span class="eg-status-icon" aria-hidden="true">!</span>
        <span>{{ firstError }}</span>
      </template>
    </div>
  </div>
</template>
