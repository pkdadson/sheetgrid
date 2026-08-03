import { cellKey } from "../data/cell-key.js";
import { toMatrix } from "../data/to-matrix.js";
import {
  formulaDisplayValue,
  type FormulaCellState,
  type FormulaEngineOptions,
  type FormulaValue,
  cellRefKey,
  recalcFormulas,
} from "../formula/index.js";
import { moveItem, swapItems } from "../layout/reorder.js";
import type {
  CellError,
  ColumnDef,
  ColumnId,
  CommitReason,
  GridRow,
  RowId,
} from "../types.js";

export type FormulaEntryMode = "auto-equals" | "explicit-only";

export interface CreateGridStoreInput {
  rows: GridRow[];
  columns: ColumnDef[];
  columnOrder?: ColumnId[];
  formulas?: boolean;
  formulaOptions?: FormulaEngineOptions;
  formulaEntry?: FormulaEntryMode;
}

export interface GridStore {
  getRows(): GridRow[];
  getColumns(): ColumnDef[];
  getOrderedColumns(): ColumnDef[];
  getCell(rowId: RowId, columnId: ColumnId): unknown;
  setCell(
    rowId: RowId,
    columnId: ColumnId,
    value: unknown,
    reason: CommitReason,
  ): void;
  replaceRows(rows: GridRow[]): void;
  replaceColumns(columns: ColumnDef[]): void;
  setColumnOrder(order: ColumnId[]): void;
  getColumnOrder(): ColumnId[];
  moveColumn(columnId: ColumnId, toIndex: number): void;
  swapColumns(a: ColumnId, b: ColumnId): void;
  moveRow(rowId: RowId, toIndex: number): void;
  swapRows(a: RowId, b: RowId): void;
  getErrors(): Map<string, CellError>;
  setError(rowId: RowId, columnId: ColumnId, error: CellError | null): void;
  clearError(rowId: RowId, columnId: ColumnId): void;
  toMatrix(opts?: { headerRow?: boolean }): unknown[][];
  subscribe(listener: () => void): () => void;
  getLastReason(): CommitReason | null;
  /** Formula API */
  isFormulasEnabled(): boolean;
  getFormulaEntry(): FormulaEntryMode;
  setFormula(rowId: RowId, columnId: ColumnId, source: string): boolean;
  clearFormula(rowId: RowId, columnId: ColumnId): void;
  getFormula(
    rowId: RowId,
    columnId: ColumnId,
  ): { source: string; result: FormulaValue } | null;
}

function defaultOrder(columns: ColumnDef[]): ColumnId[] {
  return columns.map((c) => c.id);
}

function toFormulaValue(v: unknown): FormulaValue {
  if (v === undefined) return null;
  if (
    v === null ||
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean" ||
    v instanceof Date
  ) {
    return v;
  }
  return String(v);
}

export function createGridStore(input: CreateGridStoreInput): GridStore {
  let rows = input.rows.map((r) => ({
    id: r.id,
    values: { ...r.values },
  }));
  let columns = input.columns.map((c) => ({ ...c }));
  let columnOrder = input.columnOrder
    ? [...input.columnOrder]
    : defaultOrder(columns);
  let errors = new Map<string, CellError>();
  let lastReason: CommitReason | null = null;
  const listeners = new Set<() => void>();

  const formulasEnabled = input.formulas === true;
  const formulaEntry: FormulaEntryMode = input.formulaEntry ?? "auto-equals";
  const formulaOptions = input.formulaOptions;
  /** key: cellKey(rowId, colId) */
  const formulasByCellKey = new Map<string, FormulaCellState>();

  const emit = () => {
    for (const l of listeners) {
      l();
    }
  };

  const findRowIndex = (rowId: RowId) => rows.findIndex((r) => r.id === rowId);

  const getOrderedColumns = (): ColumnDef[] => {
    const byId = new Map(columns.map((c) => [c.id, c]));
    return columnOrder
      .map((id) => byId.get(id))
      .filter((c): c is ColumnDef => c !== undefined);
  };

  const indicesOf = (
    rowId: RowId,
    columnId: ColumnId,
  ): { row: number; col: number } | null => {
    const row = findRowIndex(rowId);
    if (row < 0) return null;
    const ordered = getOrderedColumns();
    const col = ordered.findIndex((c) => c.id === columnId);
    if (col < 0) return null;
    return { row, col };
  };

  const writeComputed = (
    rowIndex: number,
    colIndex: number,
    value: FormulaValue,
  ) => {
    const row = rows[rowIndex];
    const col = getOrderedColumns()[colIndex];
    if (!row || !col) return;
    const display = formulaDisplayValue(value);
    const nextValues = { ...row.values, [col.id]: display };
    rows = rows.map((r, i) =>
      i === rowIndex ? { id: r.id, values: nextValues } : r,
    );
  };

  const runRecalc = (dirtyRcKeys: string[]) => {
    if (!formulasEnabled) return;

    // Map cellKey formula store -> "row:col" engine keys
    const engineMap = new Map<string, FormulaCellState>();
    const rcToCellKey = new Map<string, string>();

    for (const [ck, state] of formulasByCellKey) {
      // reverse lookup indices from current grid
      // parse cell key to rowId/colId
      const pipe = ck.indexOf("|");
      if (pipe < 0) continue;
      const rowId = decodeURIComponent(ck.slice(0, pipe));
      const columnId = decodeURIComponent(ck.slice(pipe + 1));
      const idx = indicesOf(rowId, columnId);
      if (!idx) continue;
      const rc = cellRefKey(idx.row, idx.col);
      engineMap.set(rc, state);
      rcToCellKey.set(rc, ck);
    }

    const dirty = dirtyRcKeys;

    recalcFormulas({
      formulas: engineMap,
      rowCount: rows.length,
      colCount: getOrderedColumns().length,
      dirty,
      options: formulaOptions,
      getLiteral(r, c) {
        const row = rows[r];
        const col = getOrderedColumns()[c];
        if (!row || !col) return null;
        // if this cell has a formula, use last result to avoid reading display mid-flight
        const rc = cellRefKey(r, c);
        if (engineMap.has(rc)) {
          return engineMap.get(rc)!.result;
        }
        return toFormulaValue(row.values[col.id]);
      },
      setResult(r, c, value) {
        writeComputed(r, c, value);
        const rc = cellRefKey(r, c);
        const state = engineMap.get(rc);
        if (state) {
          state.result = value;
          const ck = rcToCellKey.get(rc);
          if (ck) formulasByCellKey.set(ck, state);
        }
      },
    });
  };

  const dirtyFromCell = (rowId: RowId, columnId: ColumnId): string[] => {
    const idx = indicesOf(rowId, columnId);
    if (!idx) return [];
    return [cellRefKey(idx.row, idx.col)];
  };

  const setCellInternal = (
    rowId: RowId,
    columnId: ColumnId,
    value: unknown,
    reason: CommitReason,
    opts?: { clearFormula?: boolean; skipRecalc?: boolean },
  ) => {
    const idx = findRowIndex(rowId);
    if (idx < 0) return;
    if (opts?.clearFormula !== false && formulasEnabled) {
      formulasByCellKey.delete(cellKey(rowId, columnId));
    }
    const prev = rows[idx]!;
    const nextValues = { ...prev.values, [columnId]: value };
    rows = rows.map((r, i) =>
      i === idx ? { id: r.id, values: nextValues } : r,
    );
    lastReason = reason;
    if (formulasEnabled && !opts?.skipRecalc) {
      runRecalc(dirtyFromCell(rowId, columnId));
    }
    emit();
  };

  return {
    getRows() {
      return rows;
    },
    getColumns() {
      return columns;
    },
    getOrderedColumns,
    getCell(rowId, columnId) {
      const row = rows.find((r) => r.id === rowId);
      if (!row) return undefined;
      return row.values[columnId];
    },
    setCell(rowId, columnId, value, reason) {
      setCellInternal(rowId, columnId, value, reason, { clearFormula: true });
    },
    replaceRows(next) {
      rows = next.map((r) => ({ id: r.id, values: { ...r.values } }));
      // drop formulas for missing rows
      if (formulasEnabled) {
        const rowIds = new Set(rows.map((r) => r.id));
        for (const ck of [...formulasByCellKey.keys()]) {
          const rowId = decodeURIComponent(ck.slice(0, ck.indexOf("|")));
          if (!rowIds.has(rowId)) formulasByCellKey.delete(ck);
        }
        const all: string[] = [];
        for (const [ck] of formulasByCellKey) {
          const pipe = ck.indexOf("|");
          const rowId = decodeURIComponent(ck.slice(0, pipe));
          const columnId = decodeURIComponent(ck.slice(pipe + 1));
          const idx = indicesOf(rowId, columnId);
          if (idx) all.push(cellRefKey(idx.row, idx.col));
        }
        for (const state of formulasByCellKey.values()) {
          state.ast = undefined;
        }
        runRecalc(all);
      }
      lastReason = "api";
      emit();
    },
    replaceColumns(next) {
      columns = next.map((c) => ({ ...c }));
      const ids = new Set(columns.map((c) => c.id));
      columnOrder = columnOrder.filter((id) => ids.has(id));
      for (const c of columns) {
        if (!columnOrder.includes(c.id)) {
          columnOrder.push(c.id);
        }
      }
      if (formulasEnabled) {
        for (const ck of [...formulasByCellKey.keys()]) {
          const columnId = decodeURIComponent(ck.slice(ck.indexOf("|") + 1));
          if (!ids.has(columnId)) formulasByCellKey.delete(ck);
        }
        const all: string[] = [];
        for (const [ck] of formulasByCellKey) {
          const pipe = ck.indexOf("|");
          const rowId = decodeURIComponent(ck.slice(0, pipe));
          const columnId = decodeURIComponent(ck.slice(pipe + 1));
          const idx = indicesOf(rowId, columnId);
          if (idx) all.push(cellRefKey(idx.row, idx.col));
        }
        runRecalc(all);
      }
      lastReason = "api";
      emit();
    },
    setColumnOrder(order) {
      columnOrder = [...order];
      lastReason = "reorder";
      if (formulasEnabled) {
        const all: string[] = [];
        for (const [ck] of formulasByCellKey) {
          const pipe = ck.indexOf("|");
          const rowId = decodeURIComponent(ck.slice(0, pipe));
          const columnId = decodeURIComponent(ck.slice(pipe + 1));
          const idx = indicesOf(rowId, columnId);
          if (idx) all.push(cellRefKey(idx.row, idx.col));
        }
        // Invalidate ASTs that reference columns by index — deps are index-based
        for (const state of formulasByCellKey.values()) {
          state.ast = undefined;
        }
        runRecalc(all);
      }
      emit();
    },
    getColumnOrder() {
      return columnOrder;
    },
    moveColumn(columnId, toIndex) {
      columnOrder = moveItem(columnOrder, columnId, toIndex);
      lastReason = "reorder";
      if (formulasEnabled) {
        for (const state of formulasByCellKey.values()) {
          state.ast = undefined;
        }
        const all: string[] = [];
        for (const [ck] of formulasByCellKey) {
          const pipe = ck.indexOf("|");
          const rowId = decodeURIComponent(ck.slice(0, pipe));
          const colId = decodeURIComponent(ck.slice(pipe + 1));
          const idx = indicesOf(rowId, colId);
          if (idx) all.push(cellRefKey(idx.row, idx.col));
        }
        runRecalc(all);
      }
      emit();
    },
    swapColumns(a, b) {
      columnOrder = swapItems(columnOrder, a, b);
      lastReason = "reorder";
      if (formulasEnabled) {
        for (const state of formulasByCellKey.values()) {
          state.ast = undefined;
        }
        const all: string[] = [];
        for (const [ck] of formulasByCellKey) {
          const pipe = ck.indexOf("|");
          const rowId = decodeURIComponent(ck.slice(0, pipe));
          const colId = decodeURIComponent(ck.slice(pipe + 1));
          const idx = indicesOf(rowId, colId);
          if (idx) all.push(cellRefKey(idx.row, idx.col));
        }
        runRecalc(all);
      }
      emit();
    },
    moveRow(rowId, toIndex) {
      const ids = rows.map((r) => r.id);
      const nextIds = moveItem(ids, rowId, toIndex);
      const byId = new Map(rows.map((r) => [r.id, r]));
      rows = nextIds
        .map((id) => byId.get(id))
        .filter((r): r is GridRow => r !== undefined);
      lastReason = "reorder";
      if (formulasEnabled) {
        for (const state of formulasByCellKey.values()) {
          state.ast = undefined;
        }
        const all: string[] = [];
        for (const [ck] of formulasByCellKey) {
          const pipe = ck.indexOf("|");
          const rid = decodeURIComponent(ck.slice(0, pipe));
          const colId = decodeURIComponent(ck.slice(pipe + 1));
          const idx = indicesOf(rid, colId);
          if (idx) all.push(cellRefKey(idx.row, idx.col));
        }
        runRecalc(all);
      }
      emit();
    },
    swapRows(a, b) {
      const ids = rows.map((r) => r.id);
      const nextIds = swapItems(ids, a, b);
      const byId = new Map(rows.map((r) => [r.id, r]));
      rows = nextIds
        .map((id) => byId.get(id))
        .filter((r): r is GridRow => r !== undefined);
      lastReason = "reorder";
      if (formulasEnabled) {
        for (const state of formulasByCellKey.values()) {
          state.ast = undefined;
        }
        const all: string[] = [];
        for (const [ck] of formulasByCellKey) {
          const pipe = ck.indexOf("|");
          const rid = decodeURIComponent(ck.slice(0, pipe));
          const colId = decodeURIComponent(ck.slice(pipe + 1));
          const idx = indicesOf(rid, colId);
          if (idx) all.push(cellRefKey(idx.row, idx.col));
        }
        runRecalc(all);
      }
      emit();
    },
    getErrors() {
      return errors;
    },
    setError(rowId, columnId, error) {
      const key = cellKey(rowId, columnId);
      if (error === null) {
        errors.delete(key);
      } else {
        errors.set(key, error);
      }
      errors = new Map(errors);
      emit();
    },
    clearError(rowId, columnId) {
      this.setError(rowId, columnId, null);
    },
    toMatrix(opts) {
      return toMatrix(rows, this.getOrderedColumns(), opts);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getLastReason() {
      return lastReason;
    },
    isFormulasEnabled() {
      return formulasEnabled;
    },
    getFormulaEntry() {
      return formulaEntry;
    },
    setFormula(rowId, columnId, source) {
      if (!formulasEnabled) return false;
      const idx = indicesOf(rowId, columnId);
      if (!idx) return false;

      let src = source.trim();
      if (!src || src === "=") {
        this.clearFormula(rowId, columnId);
        return true;
      }
      if (!src.startsWith("=")) src = `=${src}`;

      const ck = cellKey(rowId, columnId);
      formulasByCellKey.set(ck, {
        source: src,
        deps: [],
        volatile: false,
        result: null,
        ast: undefined,
      });
      lastReason = "edit";
      runRecalc([cellRefKey(idx.row, idx.col)]);
      emit();
      return true;
    },
    clearFormula(rowId, columnId) {
      if (!formulasEnabled) return;
      const ck = cellKey(rowId, columnId);
      if (!formulasByCellKey.has(ck)) return;
      formulasByCellKey.delete(ck);
      setCellInternal(rowId, columnId, null, "edit", {
        clearFormula: false,
      });
    },
    getFormula(rowId, columnId) {
      const state = formulasByCellKey.get(cellKey(rowId, columnId));
      if (!state) return null;
      return { source: state.source, result: state.result };
    },
  };
}
