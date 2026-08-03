import {
  type ColumnDef,
  type ColumnGroupDef,
  type ColumnId,
  type FormulaEngineOptions,
  type FormulaEntryMode,
  type FormulaLimits,
  type GridRow,
  type RowId,
  type SelectionState,
  type SortDirection,
  type SortSpec,
  type ValidationMode,
  applyPaste,
  buildVisibleRows,
  cellKey,
  commitCell,
  computeVariableWindow,
  computeWindow,
  createGridStore,
  createSelection,
  extendTo,
  extractRange,
  flattenColumnGroups,
  formatA1Range,
  fromMatrix,
  fromObjects,
  isCellSelected,
  mapKeyToCommand,
  moveActive,
  parseTsv,
  resolveColumnWidths,
  selectAll,
  selectCell,
  selectColumn,
  serializeTsv,
  sortRows,
  toObjects,
  toggleCell,
  type GridStore,
  type HeaderCellSpan,
} from "@sheetgrid/core";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { resolveColumnType } from "./cells/registry.js";
import type { ObjectRow, ReactColumnDef } from "./column-types.js";
import { NumberEditor } from "./editors/NumberEditor.js";
import { TextEditor } from "./editors/TextEditor.js";
import {
  applyFormulaPick,
  cellInPickRange,
  expandPickRange,
  isFormulaDraft,
  type FormulaPickRange,
} from "./formula-point.js";
import { injectTokens } from "./inject-tokens.js";
import { SortHeader } from "./SortHeader.js";

export type { ObjectRow, ReactColumnDef, SelectOption } from "./column-types.js";

export interface GridProps {
  /**
   * Row data. Every row must have a stable string `id` — selection, edit
   * state, and reorder tracking key off it. Use with `columns`.
   */
  rows?: ObjectRow[];
  /** Column definitions. Order determines display order. */
  columns?: ReactColumnDef[];
  /**
   * Called after any row-data change with the current rows (including `id`)
   * and a `meta.reason` describing what happened: `"edit"`, `"paste"`, `"cut"`,
   * `"reorder"`, `"api"`, or a custom string.
   */
  onRowsChange?: (rows: ObjectRow[], meta: { reason: string }) => void;
  /** 2D matrix data. Use instead of `rows`/`columns` for spreadsheet-style input. */
  data?: unknown[][];
  /** Treat the first row of `data` as the header row. */
  headerRow?: boolean;
  /** 2D matrix change callback. Same `meta.reason` values as `onRowsChange`. */
  onDataChange?: (data: unknown[][], meta: { reason: string }) => void;
  /**
   * How invalid edits behave when a column has a `validate` function:
   * - `"reject"` *(default)* — refuses the write, keeps the previous value,
   *   shows error chrome. `onRowsChange` is NOT called for the invalid edit.
   * - `"commit-with-error"` — writes the invalid value anyway and marks the
   *   cell with an error. `onRowsChange` IS called. Use when downstream code
   *   handles errors (e.g. save-and-fix later).
   */
  validationMode?: ValidationMode;
  columnGroups?: ColumnGroupDef[];
  rowGrouping?: { columns: string[] };
  density?: "comfortable" | "compact";
  /** Visual theme; inherits from ancestor `data-theme` when omitted. */
  theme?: "light" | "dark";
  /** Alternate row background for scanability. */
  zebra?: boolean;
  /** Footer status strip with validation / edit hints (default true). */
  statusBar?: boolean;
  className?: string;
  style?: CSSProperties;
  overscan?: number;
  /** Window columns horizontally (default true). */
  virtualizeColumns?: boolean;
  /** Optional test id on the scroll root (defaults to sheetgrid). */
  "data-testid"?: string;
  /** Enable secure spreadsheet formulas (default false). */
  formulas?: boolean;
  /** How leading `=` is treated on commit (default auto-equals when formulas on). */
  formulaEntry?: FormulaEntryMode;
  formulaLimits?: Partial<FormulaLimits>;
  /** Allow INDIRECT (default false). */
  allowIndirect?: boolean;
  /** Allow RAND/NOW/TODAY (default true when formulas on). */
  allowVolatile?: boolean;
  /**
   * Controlled sort state. When provided, the grid renders exactly this
   * order; user clicks fire `onSortChange` but do NOT change the view unless
   * the parent updates the prop. Omit for uncontrolled behavior.
   */
  sortBy?: SortSpec[];
  /**
   * Uncontrolled initial sort. Ignored if `sortBy` is provided. Later changes
   * to this prop are ignored (React `defaultValue` convention).
   */
  defaultSortBy?: SortSpec[];
  /** Fires whenever the effective sort state changes (both modes). */
  onSortChange?: (next: SortSpec[]) => void;
}

/** Subscribe to row data and validation errors (errors alone must re-render). */
function useStore(store: GridStore) {
  const rows = useSyncExternalStore(
    store.subscribe,
    () => store.getRows(),
    () => store.getRows(),
  );
  const errors = useSyncExternalStore(
    store.subscribe,
    () => store.getErrors(),
    () => store.getErrors(),
  );
  return { rows, errors };
}

export function Grid(props: GridProps) {
  const {
    validationMode = "reject",
    density = "comfortable",
    theme,
    zebra = false,
    statusBar = true,
    overscan = 3,
    virtualizeColumns = true,
    className,
    style,
    "data-testid": testId = "sheetgrid",
  } = props;

  useEffect(() => {
    injectTokens();
  }, []);

  const formulaOptions: FormulaEngineOptions | undefined = useMemo(() => {
    if (!props.formulas) return undefined;
    return {
      limits: props.formulaLimits,
      allowIndirect: props.allowIndirect ?? false,
      allowVolatile: props.allowVolatile ?? true,
    };
  }, [
    props.formulas,
    props.formulaLimits,
    props.allowIndirect,
    props.allowVolatile,
  ]);

  const initial = useMemo(() => {
    if (props.data) {
      return fromMatrix(props.data, { headerRow: props.headerRow });
    }
    const columns = (props.columns ?? []) as ColumnDef[];
    const rows = fromObjects(props.rows ?? [], columns);
    return { rows, columns };
  }, []);

  const storeRef = useRef<GridStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createGridStore({
      ...initial,
      formulas: props.formulas === true,
      formulaOptions,
      formulaEntry: props.formulaEntry ?? "auto-equals",
    });
  }
  const store = storeRef.current;
  const { rows: bodyRows, errors } = useStore(store);

  useEffect(() => {
    if (props.data) {
      const next = fromMatrix(props.data, { headerRow: props.headerRow });
      store.replaceColumns(
        props.columns
          ? mergeColumns(next.columns, props.columns)
          : next.columns,
      );
      store.replaceRows(next.rows);
      return;
    }
    if (props.rows && props.columns) {
      store.replaceColumns(props.columns);
      store.replaceRows(fromObjects(props.rows, props.columns));
    }
  }, [props.rows, props.columns, props.data, props.headerRow, store]);

  const [selection, setSelection] = useState<SelectionState>(() =>
    createSelection(),
  );
  const [editing, setEditing] = useState<{
    rowId: RowId;
    columnId: ColumnId;
    draft: unknown;
  } | null>(null);
  const [uncontrolledSort, setUncontrolledSort] = useState<SortSpec[]>(
    () => props.defaultSortBy ?? [],
  );
  const isControlledSort = props.sortBy !== undefined;
  const effectiveSort: SortSpec[] = isControlledSort
    ? props.sortBy!
    : uncontrolledSort;
  /** Highlight range while clicking/dragging cells into a formula. */
  const [formulaPickRange, setFormulaPickRange] =
    useState<FormulaPickRange | null>(null);
  const formulaPickRef = useRef<{
    pickStart: number;
    anchorRow: number;
    anchorCol: number;
    dragging: boolean;
  } | null>(null);
  /**
   * The last cell where reject-mode validation left an error after the editor
   * closed. Escape clears it so users can dismiss the error chrome without
   * having to re-enter and correct the value.
   */
  const rejectedCellRef = useRef<{
    rowId: RowId;
    columnId: ColumnId;
  } | null>(null);
  /** Set while canceling so a blur-induced commit after Escape is ignored. */
  const suppressCommitRef = useRef(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(320);
  const [viewportWidth, setViewportWidth] = useState(800);
  const [expandState, setExpandState] = useState<Record<string, boolean>>({});
  const [widthOverrides, setWidthOverrides] = useState<
    Record<ColumnId, number>
  >({});
  const [dragColId, setDragColId] = useState<ColumnId | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{
    columnId: ColumnId;
    startX: number;
    startW: number;
  } | null>(null);

  const baseColumns = store.getOrderedColumns() as ReactColumnDef[];
  const columns = useMemo(
    () =>
      baseColumns.map((c) =>
        widthOverrides[c.id] !== undefined
          ? { ...c, width: widthOverrides[c.id] }
          : c,
      ),
    [baseColumns, widthOverrides],
  );
  const groupBy = props.rowGrouping?.columns ?? [];
  const sortedBodyRows = useMemo(() => {
    if (effectiveSort.length === 0) return bodyRows;
    // When grouping is active and the sort is on a non-grouped column, we
    // sort WITHIN each group and preserve the source-array group order.
    // Otherwise (no grouping, or sorting the grouped column) apply a global
    // sort — sorting the grouped column is expected to reorder groups.
    const sortingGrouped = effectiveSort.some((s) =>
      groupBy.includes(s.columnId),
    );
    if (groupBy.length === 0 || sortingGrouped) {
      return sortRows(bodyRows, columns, effectiveSort);
    }
    const key = (row: GridRow) =>
      groupBy.map((g) => String(row.values[g])).join("\u0000");
    const order: string[] = [];
    const buckets = new Map<string, GridRow[]>();
    for (const r of bodyRows) {
      const k = key(r);
      if (!buckets.has(k)) {
        order.push(k);
        buckets.set(k, []);
      }
      buckets.get(k)!.push(r);
    }
    const out: GridRow[] = [];
    for (const k of order) {
      const sorted = sortRows(buckets.get(k)!, columns, effectiveSort);
      out.push(...sorted);
    }
    return out;
  }, [bodyRows, columns, effectiveSort, groupBy]);
  const visible = useMemo(
    () => buildVisibleRows(sortedBodyRows, { groupBy }, expandState),
    [sortedBodyRows, groupBy, expandState],
  );

  const rowHeight = density === "compact" ? 28 : 32;
  const headerHeight = density === "compact" ? 30 : 36;

  const rowWindow = computeWindow({
    scrollOffset: scrollTop,
    viewportSize: viewportHeight,
    itemSize: rowHeight,
    itemCount: visible.length,
    overscan,
  });

  const columnOrder = store.getColumnOrder();
  const widths = useMemo(
    () => resolveColumnWidths(columns, viewportWidth, columnOrder),
    [columns, viewportWidth, columnOrder],
  );

  const rowIds = sortedBodyRows.map((r) => r.id);
  const columnIds = columns.map((c) => c.id);
  const colSizes = useMemo(
    () => columnIds.map((id) => widths[id] ?? 120),
    [columnIds, widths],
  );

  const colWindow = useMemo(() => {
    if (!virtualizeColumns || columnIds.length === 0) {
      const total = colSizes.reduce((a, b) => a + b, 0);
      return {
        startIndex: 0,
        endIndex: columnIds.length - 1,
        offsetBefore: 0,
        totalSize: total,
      };
    }
    return computeVariableWindow({
      scrollOffset: scrollLeft,
      viewportSize: viewportWidth,
      sizes: colSizes,
      overscan,
    });
  }, [
    virtualizeColumns,
    columnIds.length,
    colSizes,
    scrollLeft,
    viewportWidth,
    overscan,
  ]);

  const visibleColumns = useMemo(() => {
    if (colWindow.endIndex < colWindow.startIndex) return [];
    return columns.slice(colWindow.startIndex, colWindow.endIndex + 1);
  }, [columns, colWindow.startIndex, colWindow.endIndex]);

  const visibleColumnIds = useMemo(
    () => visibleColumns.map((c) => c.id),
    [visibleColumns],
  );

  const visibleColsWidth = useMemo(
    () =>
      visibleColumnIds.reduce((sum, id) => sum + (widths[id] ?? 120), 0),
    [visibleColumnIds, widths],
  );
  const leftPad = colWindow.offsetBefore;
  const rightPad = Math.max(
    0,
    colWindow.totalSize - leftPad - visibleColsWidth,
  );
  const rowIndexOf = useMemo(
    () => new Map(rowIds.map((id, i) => [id, i])),
    [rowIds],
  );
  const colIndexOf = useMemo(
    () => new Map(columnIds.map((id, i) => [id, i])),
    [columnIds],
  );

  const emitChange = useCallback(
    (reason: string) => {
      if (props.onDataChange) {
        props.onDataChange(store.toMatrix({ headerRow: !!props.headerRow }), {
          reason,
        });
      }
      if (props.onRowsChange) {
        props.onRowsChange(toObjects(store.getRows(), store.getColumns()), {
          reason,
        });
      }
    },
    [props, store],
  );

  const primaryRange = selection.ranges[0] ?? null;

  const copySelection = useCallback(async () => {
    if (!primaryRange) return;
    const { start, end } = primaryRange;
    const single =
      start.rowId === end.rowId && start.columnId === end.columnId;
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
      // ignore when clipboard API unavailable
    }
  }, [primaryRange, store]);

  const cutSelection = useCallback(async () => {
    if (!primaryRange) return;
    await copySelection();
    const matrix = extractRange(
      store,
      primaryRange.start,
      primaryRange.end,
    );
    const empty = matrix.map((row) => row.map(() => ""));
    // Always clear cells on cut (Excel-like). Invalid empties still write and
    // surface validation errors instead of silently leaving the old value.
    await applyPaste(store, primaryRange.start, empty, "commit-with-error");
    emitChange("cut");
  }, [copySelection, emitChange, primaryRange, store]);

  const pasteSelection = useCallback(
    async (text?: string) => {
      const active = selection.active ?? primaryRange?.start;
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
      await applyPaste(store, active, matrix, validationMode);
      emitChange("paste");
    },
    [emitChange, primaryRange, selection.active, store, validationMode],
  );

  const startEdit = (rowId: RowId, columnId: ColumnId, seed?: unknown) => {
    const formula =
      seed === undefined && store.isFormulasEnabled()
        ? store.getFormula(rowId, columnId)
        : null;
    const value =
      seed !== undefined
        ? seed
        : (formula?.source ?? store.getCell(rowId, columnId) ?? "");
    rejectedCellRef.current = null;
    setEditing({ rowId, columnId, draft: value });
  };

  const clearFormulaPick = useCallback(() => {
    formulaPickRef.current = null;
    setFormulaPickRange(null);
  }, []);

  const commitEdit = async (override?: unknown) => {
    if (!editing) return;
    // Escape unmounts the editor; the subsequent blur must not commit the draft.
    if (suppressCommitRef.current) return;
    const value = override !== undefined ? override : editing.draft;
    const result = await commitCell(store, {
      rowId: editing.rowId,
      columnId: editing.columnId,
      value,
      mode: validationMode,
      reason: "edit",
    });
    if (result.ok || validationMode === "commit-with-error") {
      rejectedCellRef.current = null;
      clearFormulaPick();
      setEditing(null);
      emitChange("edit");
      scrollerRef.current?.focus({ preventScroll: true });
      return;
    }
    // reject: leave store value unchanged; close editor so the previous
    // value is visible with error chrome (not an empty draft that looks committed).
    // Remember the cell so a subsequent Escape can dismiss the error chrome.
    rejectedCellRef.current = {
      rowId: editing.rowId,
      columnId: editing.columnId,
    };
    clearFormulaPick();
    setEditing(null);
    scrollerRef.current?.focus({ preventScroll: true });
  };

  const commitValue = async (
    rowId: RowId,
    columnId: ColumnId,
    value: unknown,
  ) => {
    const result = await commitCell(store, {
      rowId,
      columnId,
      value,
      mode: validationMode,
      reason: "edit",
    });
    if (result.ok || validationMode === "commit-with-error") {
      emitChange("edit");
    }
  };

  const cancelEdit = () => {
    suppressCommitRef.current = true;
    // Reject-mode failures leave an error on an unchanged value — clear on Escape.
    // Two cases: editor still open (clear the editing cell), or editor was
    // already closed by a rejected commit (clear the remembered cell).
    if (validationMode === "reject") {
      if (editing) {
        store.clearError(editing.rowId, editing.columnId);
      } else if (rejectedCellRef.current) {
        const { rowId, columnId } = rejectedCellRef.current;
        store.clearError(rowId, columnId);
      }
    }
    rejectedCellRef.current = null;
    clearFormulaPick();
    setEditing(null);
    scrollerRef.current?.focus({ preventScroll: true });
    // Allow future edits to commit (blur from this cancel may still be pending).
    queueMicrotask(() => {
      suppressCommitRef.current = false;
    });
  };

  const applySort = useCallback(
    (next: SortSpec[]) => {
      if (!isControlledSort) setUncontrolledSort(next);
      props.onSortChange?.(next);
    },
    [isControlledSort, props.onSortChange],
  );

  const handleHeaderSort = useCallback(
    (columnId: ColumnId, shift: boolean) => {
      const current = effectiveSort;
      if (!shift) {
        const existing = current.find((s) => s.columnId === columnId);
        if (!existing) {
          applySort([{ columnId, direction: "asc" }]);
        } else if (existing.direction === "asc") {
          applySort([{ columnId, direction: "desc" }]);
        } else {
          applySort([]);
        }
        return;
      }
      const idx = current.findIndex((s) => s.columnId === columnId);
      if (idx < 0) {
        applySort([...current, { columnId, direction: "asc" }]);
        return;
      }
      const existing = current[idx]!;
      if (existing.direction === "asc") {
        const next = current.slice();
        next[idx] = { columnId, direction: "desc" };
        applySort(next);
      } else {
        const next = current.slice();
        next.splice(idx, 1);
        applySort(next);
      }
    },
    [applySort, effectiveSort],
  );

  const formulaPointMode =
    store.isFormulasEnabled() &&
    editing != null &&
    isFormulaDraft(editing.draft);

  /** Insert/replace A1 token from grid coordinates into the formula draft. */
  const applyPickAt = useCallback(
    (rowIndex: number, colIndex: number, opts?: { extend?: boolean }) => {
      setEditing((prev) => {
        if (!prev || !isFormulaDraft(prev.draft)) return prev;
        const draft = String(prev.draft);
        const pick = formulaPickRef.current;
        const continuing =
          Boolean(pick?.dragging) || Boolean(opts?.extend && pick);

        let range: FormulaPickRange;
        let pickStart: number | null;
        let anchorRow: number;
        let anchorCol: number;

        if (continuing && pick) {
          anchorRow = pick.anchorRow;
          anchorCol = pick.anchorCol;
          range = expandPickRange(anchorRow, anchorCol, rowIndex, colIndex);
          pickStart = pick.pickStart;
        } else {
          anchorRow = rowIndex;
          anchorCol = colIndex;
          range = {
            r1: rowIndex,
            c1: colIndex,
            r2: rowIndex,
            c2: colIndex,
          };
          pickStart = null;
        }

        const token = formatA1Range(range.r1, range.c1, range.r2, range.c2);
        const next = applyFormulaPick(draft, token, pickStart);
        formulaPickRef.current = {
          pickStart: next.pickStart,
          anchorRow,
          anchorCol,
          dragging: true,
        };
        setFormulaPickRange(range);
        return { ...prev, draft: next.draft };
      });
    },
    [],
  );

  const isColumnEditable = (col: ReactColumnDef, row: GridRow) => {
    if (col.editable === undefined) return true;
    if (typeof col.editable === "function") return col.editable(row);
    return col.editable;
  };

  const onKeyDown = async (e: ReactKeyboardEvent) => {
    if (editing && e.key !== "Escape" && e.key !== "Enter" && e.key !== "Tab") {
      return;
    }
    const phase = editing ? "edit" : "navigate";
    const cmd = mapKeyToCommand(
      {
        key: e.key,
        code: e.code,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
      },
      phase,
    );

    if (cmd.type === "none") return;

    if (cmd.type === "move") {
      e.preventDefault();
      setSelection((s) =>
        moveActive(s, cmd.dir, rowIds, columnIds, { extend: cmd.extend }),
      );
      return;
    }
    if (cmd.type === "edit" && selection.active) {
      e.preventDefault();
      {
        const col = columns.find((c) => c.id === selection.active!.columnId);
        if (col?.type === "boolean") return;
        const row = bodyRows.find((r) => r.id === selection.active!.rowId);
        if (col && row && !isColumnEditable(col, row)) return;
      }
      startEdit(selection.active.rowId, selection.active.columnId);
      return;
    }
    if (cmd.type === "editReplace" && selection.active) {
      e.preventDefault();
      {
        const col = columns.find((c) => c.id === selection.active!.columnId);
        if (col?.type === "boolean") return;
        const row = bodyRows.find((r) => r.id === selection.active!.rowId);
        if (col && row && !isColumnEditable(col, row)) return;
      }
      startEdit(selection.active.rowId, selection.active.columnId, cmd.key);
      return;
    }
    if (cmd.type === "commit") {
      e.preventDefault();
      clearFormulaPick();
      await commitEdit();
      return;
    }
    if (cmd.type === "cancel") {
      e.preventDefault();
      cancelEdit();
      return;
    }
    if (cmd.type === "selectAll") {
      e.preventDefault();
      setSelection(selectAll(rowIds, columnIds));
      return;
    }
    if (cmd.type === "copy") {
      e.preventDefault();
      await copySelection();
      return;
    }
    if (cmd.type === "cut") {
      e.preventDefault();
      await cutSelection();
      return;
    }
    if (cmd.type === "paste") {
      e.preventDefault();
      await pasteSelection();
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (editing) return;
    e.preventDefault();
    void pasteSelection(e.clipboardData.getData("text/plain"));
  };

  const onCellMouseDown = (
    e: ReactMouseEvent,
    rowId: RowId,
    columnId: ColumnId,
  ) => {
    // Excel-like formula point mode: click cells to insert A1 refs without leaving edit.
    if (
      editing &&
      store.isFormulasEnabled() &&
      isFormulaDraft(editing.draft)
    ) {
      // Keep focus in the formula editor (prevents blur→commit).
      e.preventDefault();
      e.stopPropagation();
      if (rowId === editing.rowId && columnId === editing.columnId) {
        return;
      }
      const ri = rowIndexOf.get(rowId);
      const ci = colIndexOf.get(columnId);
      if (ri === undefined || ci === undefined) return;
      // New drag pick (shift extends previous anchor if any)
      if (!e.shiftKey) {
        formulaPickRef.current = null;
      }
      applyPickAt(ri, ci, { extend: e.shiftKey });
      return;
    }

    const coord = { rowId, columnId };
    if (e.shiftKey) {
      setSelection((s) => extendTo(s, coord));
    } else if (e.metaKey || e.ctrlKey) {
      setSelection((s) => toggleCell(s, coord));
    } else {
      setSelection(selectCell(createSelection(), coord));
    }
  };

  const onCellMouseEnter = (rowId: RowId, columnId: ColumnId) => {
    if (!formulaPickRef.current?.dragging) return;
    if (!editing || !isFormulaDraft(editing.draft)) return;
    const ri = rowIndexOf.get(rowId);
    const ci = colIndexOf.get(columnId);
    if (ri === undefined || ci === undefined) return;
    applyPickAt(ri, ci);
  };

  useEffect(() => {
    const onUp = () => {
      if (formulaPickRef.current) {
        formulaPickRef.current = {
          ...formulaPickRef.current,
          dragging: false,
        };
      }
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  // Clear pick highlight when leaving formula edit
  useEffect(() => {
    if (!editing || !isFormulaDraft(editing.draft)) {
      clearFormulaPick();
    }
  }, [editing, clearFormulaPick]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    setScrollLeft(el.scrollLeft);
  };

  const warnedNoHeightRef = useRef(false);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight;
      const w = el.clientWidth;
      // Grid is virtualized — a zero-height parent silently produces an empty
      // grid. Warn once per instance in dev builds so newcomers don't lose
      // time on invisible-grid puzzles. Skip in test envs (jsdom reports 0 for
      // every element and would spam every test).
      const env = (
        globalThis as { process?: { env?: { NODE_ENV?: string } } }
      ).process?.env?.NODE_ENV;
      if (
        !warnedNoHeightRef.current &&
        h === 0 &&
        env !== "production" &&
        env !== "test"
      ) {
        warnedNoHeightRef.current = true;
        // biome-ignore lint/suspicious/noConsole: intentional dev-only hint
        console.warn(
          "[sheetgrid] Grid has 0px measured height. Give the Grid or its " +
            'parent an explicit height, e.g. <div style={{ height: 400 }}>. ' +
            "Without a height the virtualized viewport renders empty.",
        );
      }
      setViewportHeight(h || 320);
      setViewportWidth(w || 800);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const next = Math.max(40, r.startW + (e.clientX - r.startX));
      setWidthOverrides((w) => ({ ...w, [r.columnId]: next }));
    };
    const onUp = () => {
      resizeRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onResizeMouseDown = (
    e: ReactMouseEvent,
    columnId: ColumnId,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = {
      columnId,
      startX: e.clientX,
      startW: widths[columnId] ?? 120,
    };
  };

  const onHeaderDragStart = (e: ReactDragEvent, columnId: ColumnId) => {
    setDragColId(columnId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", columnId);
  };

  const onHeaderDragOver = (e: ReactDragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onHeaderDrop = (e: ReactDragEvent, targetId: ColumnId) => {
    e.preventDefault();
    const sourceId = dragColId ?? e.dataTransfer.getData("text/plain");
    setDragColId(null);
    if (!sourceId || sourceId === targetId) return;
    const order = store.getColumnOrder();
    const toIndex = order.indexOf(targetId);
    if (toIndex < 0) return;
    store.moveColumn(sourceId as ColumnId, toIndex);
    emitChange("reorder");
  };

  const sliceStart = rowWindow.startIndex;
  const sliceEnd = rowWindow.endIndex;
  const windowRows =
    sliceEnd < sliceStart ? [] : visible.slice(sliceStart, sliceEnd + 1);

  const leafHeaders = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of columns) map[c.id] = c.header;
    return map;
  }, [columns]);

  const headerLevels = useMemo(
    () =>
      flattenColumnGroups(props.columnGroups ?? [], columnIds, {
        leafHeaders,
      }),
    [props.columnGroups, columnIds, leafHeaders],
  );
  const headerBandHeight = headerLevels.length * headerHeight;

  // Latest layout values for imperative scroll helpers (avoids effect dep churn).
  const layoutRef = useRef({
    visible,
    columnIds,
    widths,
    headerBandHeight,
    rowHeight,
  });
  layoutRef.current = {
    visible,
    columnIds,
    widths,
    headerBandHeight,
    rowHeight,
  };

  /** Keep active cell in the virtualized viewport (keyboard / selection). */
  useEffect(() => {
    const el = scrollerRef.current;
    const active = selection.active;
    if (!el || !active) return;

    const {
      visible: vis,
      columnIds: cols,
      widths: w,
      headerBandHeight: band,
      rowHeight: rh,
    } = layoutRef.current;

    let rowIdx = -1;
    for (let i = 0; i < vis.length; i++) {
      const vr = vis[i]!;
      if (vr.type === "body" && vr.row.id === active.rowId) {
        rowIdx = i;
        break;
      }
    }
    if (rowIdx < 0) return;

    const rowTop = band + rowIdx * rh;
    const rowBottom = rowTop + rh;
    const viewBottom = el.scrollTop + el.clientHeight;
    // Sticky header covers the top of the viewport
    const contentTop = el.scrollTop + band;

    let nextTop = el.scrollTop;
    if (rowTop < contentTop) {
      nextTop = Math.max(0, rowTop - band);
    } else if (rowBottom > viewBottom) {
      nextTop = Math.max(0, rowBottom - el.clientHeight);
    }

    const colIdx = cols.indexOf(active.columnId);
    if (colIdx < 0) return;
    let colLeft = 0;
    for (let i = 0; i < colIdx; i++) {
      colLeft += w[cols[i]!] ?? 120;
    }
    const colRight = colLeft + (w[active.columnId] ?? 120);
    let nextLeft = el.scrollLeft;
    if (colLeft < el.scrollLeft) {
      nextLeft = colLeft;
    } else if (colRight > el.scrollLeft + el.clientWidth) {
      nextLeft = Math.max(0, colRight - el.clientWidth);
    }

    if (nextTop === el.scrollTop && nextLeft === el.scrollLeft) return;
    try {
      el.scrollTop = nextTop;
      el.scrollLeft = nextLeft;
    } catch {
      // jsdom may define scrollTop/Left as read-only
      return;
    }
    setScrollTop(el.scrollTop);
    setScrollLeft(el.scrollLeft);
  }, [selection.active?.rowId, selection.active?.columnId]);

  /** When dataset shrinks, clamp scroll so the window doesn’t hang past content. */
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    if (el.scrollTop <= maxTop && el.scrollLeft <= maxLeft) return;
    const nextTop = Math.min(el.scrollTop, maxTop);
    const nextLeft = Math.min(el.scrollLeft, maxLeft);
    try {
      el.scrollTop = nextTop;
      el.scrollLeft = nextLeft;
    } catch {
      return;
    }
    setScrollTop(nextTop);
    setScrollLeft(nextLeft);
  }, [rowWindow.totalSize, colWindow.totalSize]);

  const clippedHeaderLevels = useMemo(
    () =>
      headerLevels.map((level, levelIndex) =>
        clipHeaderLevel(
          level,
          levelIndex === headerLevels.length - 1,
          visibleColumnIds,
        ),
      ),
    [headerLevels, visibleColumnIds],
  );

  const spanWidth = (columnIdsInSpan: ColumnId[]) =>
    columnIdsInSpan.reduce((sum, id) => sum + (widths[id] ?? 120), 0);

  const tableWidth = colWindow.totalSize;

  const activeCoord = selection.active;
  const activeError = activeCoord
    ? errors.get(cellKey(activeCoord.rowId, activeCoord.columnId))
    : undefined;
  const editingError =
    editing != null
      ? errors.get(cellKey(editing.rowId, editing.columnId))
      : undefined;
  const statusError = editingError ?? activeError;
  const statusMessage = statusError
    ? statusError.message
    : editing
      ? "Editing — Enter to commit, Escape to cancel"
      : selection.ranges.length > 0 && selection.active
        ? "Cell selected — double-click or Enter to edit"
        : "Ready";

  const frameStyle = {
    ...style,
    // Used by scroll-margin so sticky header does not cover group toggles / cells
    ["--eg-header-band-height" as string]: `${headerBandHeight}px`,
  };

  return (
    <div
      className={["eg-frame", className].filter(Boolean).join(" ")}
      data-density={density}
      data-theme={theme}
      data-zebra={zebra ? "true" : undefined}
      style={frameStyle}
    >
    <div
      ref={scrollerRef}
      className="eg-root"
      data-density={density}
      data-theme={theme}
      data-testid={testId}
      role="grid"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onScroll={onScroll}
      onPaste={onPaste}
    >
      <div
        style={{
          height: rowWindow.totalSize + headerBandHeight,
          width: tableWidth,
          minWidth: tableWidth,
          position: "relative",
        }}
      >
        <table
          className="eg-table"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 3,
            width: tableWidth,
            tableLayout: "fixed",
          }}
        >
          {renderColGroup(leftPad, visibleColumns, widths, rightPad)}
          <thead>
            {clippedHeaderLevels.map((level, levelIndex) => {
              const isLeafLevel = levelIndex === clippedHeaderLevels.length - 1;
              return (
                <tr key={levelIndex} role="row">
                  {leftPad > 0 && (
                    <th
                      aria-hidden
                      className="eg-spacer"
                      style={{
                        width: leftPad,
                        minWidth: leftPad,
                        maxWidth: leftPad,
                        padding: 0,
                        border: "none",
                        height: headerHeight,
                      }}
                    />
                  )}
                  {level.map((cell) => {
                    const w = spanWidth(cell.columnIds);
                    if (!isLeafLevel) {
                      const span = Math.max(1, cell.colSpan, cell.columnIds.length);
                      return (
                        <th
                          key={cell.id}
                          className="eg-th eg-th-group"
                          role="columnheader"
                          colSpan={span}
                          style={{
                            width: w,
                            height: headerHeight,
                          }}
                        >
                          {cell.header}
                        </th>
                      );
                    }
                    const colId = cell.columnIds[0] ?? cell.id;
                    const col = columns.find((c) => c.id === colId);
                    const label = col?.header ?? cell.header;
                    const leafW = widths[colId] ?? 120;
                    const isRequired = Boolean(col?.validate);
                    const sortable = col?.sortable !== false;
                    const sortIndex = effectiveSort.findIndex(
                      (s) => s.columnId === colId,
                    );
                    const sortEntry =
                      sortIndex >= 0 ? effectiveSort[sortIndex]! : null;
                    const ariaSort: "ascending" | "descending" | "none" =
                      sortEntry?.direction === "asc"
                        ? "ascending"
                        : sortEntry?.direction === "desc"
                          ? "descending"
                          : "none";
                    const priority =
                      effectiveSort.length >= 2 && sortIndex >= 0
                        ? sortIndex + 1
                        : undefined;
                    return (
                      <th
                        key={cell.id}
                        className={[
                          "eg-th",
                          "eg-th-leaf",
                          isRequired ? "eg-th-required" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        role="columnheader"
                        aria-sort={sortable ? ariaSort : undefined}
                        draggable
                        title={isRequired ? `${label} (required)` : label}
                        style={{
                          width: leafW,
                          minWidth: leafW,
                          maxWidth: leafW,
                          height: headerHeight,
                        }}
                        onClick={() =>
                          setSelection(
                            selectColumn(
                              createSelection(),
                              colId,
                              rowIds,
                              columnIds,
                            ),
                          )
                        }
                        onDragStart={(e) => onHeaderDragStart(e, colId)}
                        onDragOver={onHeaderDragOver}
                        onDrop={(e) => onHeaderDrop(e, colId)}
                      >
                        {sortable ? (
                          <SortHeader
                            label={label}
                            direction={sortEntry?.direction ?? null}
                            priority={priority}
                            onSort={() => handleHeaderSort(colId, false)}
                            onShiftSort={() => handleHeaderSort(colId, true)}
                          />
                        ) : (
                          label
                        )}
                        <span
                          className="eg-col-resizer"
                          onMouseDown={(e) => onResizeMouseDown(e, colId)}
                          aria-hidden="true"
                          title={`Resize ${label}`}
                        />
                      </th>
                    );
                  })}
                  {rightPad > 0 && (
                    <th
                      aria-hidden
                      className="eg-spacer"
                      style={{
                        width: rightPad,
                        minWidth: rightPad,
                        maxWidth: rightPad,
                        padding: 0,
                        border: "none",
                        height: headerHeight,
                        top: levelIndex * headerHeight,
                      }}
                    />
                  )}
                </tr>
              );
            })}
          </thead>
        </table>
        <div
          className="eg-virt-spacer"
          style={{ height: rowWindow.offsetBefore }}
          aria-hidden
        />
        <table
          className="eg-table"
          style={{ width: tableWidth, tableLayout: "fixed" }}
        >
          {renderColGroup(leftPad, visibleColumns, widths, rightPad)}
          <tbody>
            {windowRows.map((vr) => {
              if (vr.type === "group") {
                return (
                  <tr key={vr.key} className="eg-group-row" role="row">
                    {leftPad > 0 && (
                      <td
                        aria-hidden
                        className="eg-spacer"
                        style={{
                          width: leftPad,
                          minWidth: leftPad,
                          maxWidth: leftPad,
                          padding: 0,
                          border: "none",
                        }}
                      />
                    )}
                    <td
                      className="eg-td"
                      colSpan={Math.max(1, visibleColumns.length)}
                      style={{ width: visibleColsWidth }}
                    >
                      <button
                        type="button"
                        className="eg-group-toggle"
                        aria-expanded={vr.expanded}
                        aria-label={
                          vr.expanded
                            ? `Collapse group ${String(vr.value)}`
                            : `Expand group ${String(vr.value)}`
                        }
                        onClick={() =>
                          setExpandState((s) => {
                            const open = s[vr.key] !== false;
                            return { ...s, [vr.key]: !open };
                          })
                        }
                      >
                        <GroupChevron expanded={vr.expanded} />
                      </button>
                      {String(vr.value)} ({vr.count})
                    </td>
                    {rightPad > 0 && (
                      <td
                        aria-hidden
                        className="eg-spacer"
                        style={{
                          width: rightPad,
                          minWidth: rightPad,
                          maxWidth: rightPad,
                          padding: 0,
                          border: "none",
                        }}
                      />
                    )}
                  </tr>
                );
              }
              const row = vr.row;
              return (
                <tr
                  key={row.id}
                  className="eg-data-row"
                  role="row"
                  style={{ height: rowHeight }}
                >
                  {leftPad > 0 && (
                    <td
                      aria-hidden
                      className="eg-spacer"
                      style={{
                        width: leftPad,
                        minWidth: leftPad,
                        maxWidth: leftPad,
                        padding: 0,
                        border: "none",
                        height: rowHeight,
                      }}
                    />
                  )}
                  {visibleColumns.map((col) => {
                    const selected = isCellSelected(
                      selection,
                      { rowId: row.id, columnId: col.id },
                      rowIndexOf,
                      colIndexOf,
                    );
                    const active =
                      selection.active?.rowId === row.id &&
                      selection.active?.columnId === col.id;
                    const err = errors.get(cellKey(row.id, col.id));
                    const isEditing =
                      editing?.rowId === row.id &&
                      editing?.columnId === col.id;
                    const value = row.values[col.id];
                    const typeDef = resolveColumnType(col.type);
                    const CellComp = col.cell ?? typeDef.cell;
                    const rawEditor = col.editor ?? typeDef.editor;
                    // Number inputs reject non-numeric characters, so force text
                    // when formulas are on. Select/boolean/custom editors stay put.
                    const EditorComp =
                      isEditing &&
                      store.isFormulasEnabled() &&
                      (col.type === "number" || rawEditor === NumberEditor)
                        ? TextEditor
                        : rawEditor;
                    const editable = isColumnEditable(col, row);
                    const cellW = widths[col.id] ?? 120;
                    const titleText =
                      value === null || value === undefined
                        ? undefined
                        : String(value);
                    const isNumber =
                      col.type === "number" ||
                      typeof value === "number";
                    const rowIdx = rowIndexOf.get(row.id) ?? -1;
                    const colIdx = colIndexOf.get(col.id) ?? -1;
                    const formulaRef =
                      formulaPointMode &&
                      cellInPickRange(rowIdx, colIdx, formulaPickRange);

                    return (
                      <td
                        key={col.id}
                        className={[
                          "eg-td",
                          isNumber ? "eg-td-number" : "",
                          formulaRef ? "eg-formula-ref" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        role="gridcell"
                        aria-selected={selected || undefined}
                        aria-invalid={err ? true : undefined}
                        title={err?.message ?? titleText}
                        data-active={active || undefined}
                        data-formula-ref={formulaRef || undefined}
                        style={{
                          width: cellW,
                          minWidth: cellW,
                          maxWidth: cellW,
                          height: rowHeight,
                        }}
                        onMouseDown={(e) =>
                          onCellMouseDown(e, row.id, col.id)
                        }
                        onMouseEnter={() => onCellMouseEnter(row.id, col.id)}
                        onDoubleClick={() => {
                          if (!editable || col.type === "boolean") return;
                          startEdit(row.id, col.id);
                        }}
                      >
                        {isEditing
                          ? (() => {
                              const Editor = EditorComp ?? TextEditor;
                              return (
                                <Editor
                                  value={editing.draft}
                                  column={col}
                                  error={err?.message}
                                  onChange={(v) => {
                                    // Typing ends the current click-pick so the next click appends a new ref
                                    formulaPickRef.current = null;
                                    setFormulaPickRange(null);
                                    setEditing({ ...editing, draft: v });
                                  }}
                                  onCommit={(v) => {
                                    void commitEdit(v);
                                  }}
                                  onCancel={cancelEdit}
                                />
                              );
                            })()
                          : (
                          <>
                            {err ? (
                              <span
                                className="eg-cell-error-mark"
                                aria-hidden="true"
                              >
                                !
                              </span>
                            ) : null}
                            {CellComp({
                              value,
                              row,
                              column: col,
                              rowId: row.id,
                              isSelected: selected,
                              isEditing: false,
                              error: err?.message,
                              onCommitValue: (v) => {
                                void commitValue(row.id, col.id, v);
                              },
                            })}
                          </>
                        )}
                      </td>
                    );
                  })}
                  {rightPad > 0 && (
                    <td
                      aria-hidden
                      className="eg-spacer"
                      style={{
                        width: rightPad,
                        minWidth: rightPad,
                        maxWidth: rightPad,
                        padding: 0,
                        border: "none",
                        height: rowHeight,
                      }}
                    />
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
      {statusBar ? (
        <div
          className="eg-status"
          data-testid={`${testId}-status`}
          data-has-error={statusError ? "true" : undefined}
          role="status"
          aria-live="polite"
        >
          {statusError ? (
            <span className="eg-status-icon" aria-hidden="true">
              !
            </span>
          ) : null}
          <span>{statusMessage}</span>
        </div>
      ) : null}
    </div>
  );
}

function GroupChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className="eg-chevron"
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
    >
      {expanded ? (
        <polyline points="2,4 6,8 10,4" />
      ) : (
        <polyline points="4,2 8,6 4,10" />
      )}
    </svg>
  );
}

/** Stable column widths for fixed table layout (independent of first body row). */
function renderColGroup(
  leftPad: number,
  visibleColumns: ReactColumnDef[],
  widths: Record<ColumnId, number>,
  rightPad: number,
) {
  return (
    <colgroup>
      {leftPad > 0 ? <col style={{ width: leftPad }} /> : null}
      {visibleColumns.map((col) => (
        <col key={col.id} style={{ width: widths[col.id] ?? 120 }} />
      ))}
      {rightPad > 0 ? <col style={{ width: rightPad }} /> : null}
    </colgroup>
  );
}

/** Clip a header level to the currently windowed leaf columns. */
function clipHeaderLevel(
  level: HeaderCellSpan[],
  isLeafLevel: boolean,
  visibleLeafIds: ColumnId[],
): HeaderCellSpan[] {
  if (isLeafLevel) {
    return visibleLeafIds.map((id) => {
      const found = level.find(
        (c) => c.id === id || c.columnIds[0] === id,
      );
      return (
        found ?? {
          id,
          header: id,
          colSpan: 1,
          columnIds: [id],
        }
      );
    });
  }
  const out: HeaderCellSpan[] = [];
  for (const cell of level) {
    const ids = visibleLeafIds.filter((id) => cell.columnIds.includes(id));
    if (ids.length === 0) continue;
    out.push({
      ...cell,
      columnIds: ids,
      colSpan: ids.length,
    });
  }
  return out;
}

function mergeColumns(
  inferred: ColumnDef[],
  overrides: ReactColumnDef[],
): ReactColumnDef[] {
  const byId = new Map(overrides.map((c) => [c.id, c]));
  return inferred.map((c, i) => {
    const o = byId.get(c.id) ?? overrides[i];
    return o ? { ...c, ...o, id: c.id } : c;
  });
}
