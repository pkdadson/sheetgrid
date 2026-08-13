import { cellKey } from "../data/cell-key.js";
import {
  type FormulaCellState,
  type FormulaEngineOptions,
  type FormulaValue,
  cellRefKey,
  formulaDisplayValue,
  recalcFormulas,
} from "../formula/index.js";
import type {
  CellError,
  ColumnDef,
  ColumnId,
  GridRow,
  RowId,
} from "../types.js";
import type { InternalStore } from "./commands/types.js";

export interface CreateInternalStoreInput {
  rows: GridRow[];
  columns: ColumnDef[];
  columnOrder?: ColumnId[];
  formulas?: boolean;
  formulaOptions?: FormulaEngineOptions;
}

export interface FullInternalStore extends InternalStore {
  subscribe(listener: () => void): () => void;
  getFormulasMap(): Map<string, FormulaCellState>;
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

export function createInternalStore(
  input: CreateInternalStoreInput,
): FullInternalStore {
  let rows: GridRow[] = input.rows.map((r) => ({
    id: r.id,
    values: { ...r.values },
  }));
  let columns: ColumnDef[] = input.columns.map((c) => ({ ...c }));
  let columnOrder: ColumnId[] = input.columnOrder
    ? [...input.columnOrder]
    : columns.map((c) => c.id);
  let errors = new Map<string, CellError>();
  let sort: import("../types.js").SortSpec[] = [];
  let filter: import("../types.js").FilterClause | null = null;
  const listeners = new Set<() => void>();

  const formulasEnabled = input.formulas === true;
  const formulaOptions = input.formulaOptions;
  const formulasByCellKey = new Map<string, FormulaCellState>();

  const notify = () => {
    for (const l of listeners) l();
  };

  const getOrderedColumns = (): ColumnDef[] => {
    const byId = new Map(columns.map((c) => [c.id, c]));
    return columnOrder
      .map((id) => byId.get(id))
      .filter((c): c is ColumnDef => c !== undefined);
  };

  const findRowIndex = (rowId: RowId) => rows.findIndex((r) => r.id === rowId);

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

  const recalcAll = () => {
    if (!formulasEnabled) return;

    const engineMap = new Map<string, FormulaCellState>();
    const rcToCellKey = new Map<string, string>();

    for (const [ck, state] of formulasByCellKey) {
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

    const dirty: string[] = [];
    for (const rc of engineMap.keys()) dirty.push(rc);

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

  const internal: FullInternalStore = {
    getRowsRef: () => rows,
    setRows: (next) => {
      rows = next;
    },
    getColumnsRef: () => columns,
    setColumns: (next) => {
      columns = next;
    },
    getColumnOrderRef: () => columnOrder,
    setColumnOrder: (next) => {
      columnOrder = next;
    },
    notify,
    formulas: {
      isEnabled: () => formulasEnabled,
      getRaw: (rowId, columnId) => {
        const state = formulasByCellKey.get(cellKey(rowId, columnId));
        return state ? state.source : null;
      },
      set: (rowId, columnId, source) => {
        if (!formulasEnabled) return false;
        const idx = indicesOf(rowId, columnId);
        if (!idx) return false;
        let src = source.trim();
        if (!src.startsWith("=")) src = `=${src}`;
        formulasByCellKey.set(cellKey(rowId, columnId), {
          source: src,
          deps: [],
          volatile: false,
          result: null,
          ast: undefined,
        });
        return true;
      },
      clear: (rowId, columnId) => {
        formulasByCellKey.delete(cellKey(rowId, columnId));
      },
      recalcAll,
      serialize: () => {
        const out: Array<[RowId, ColumnId, string]> = [];
        for (const [ck, state] of formulasByCellKey) {
          const pipe = ck.indexOf("|");
          if (pipe < 0) continue;
          const rowId = decodeURIComponent(ck.slice(0, pipe));
          const columnId = decodeURIComponent(ck.slice(pipe + 1));
          out.push([rowId, columnId, state.source]);
        }
        return out;
      },
      restore: (entries) => {
        formulasByCellKey.clear();
        for (const [rowId, columnId, source] of entries) {
          formulasByCellKey.set(cellKey(rowId, columnId), {
            source,
            deps: [],
            volatile: false,
            result: null,
            ast: undefined,
          });
        }
        recalcAll();
      },
    },
    errors: {
      getMap: () => errors,
      set: (rowId, columnId, err) => {
        const key = cellKey(rowId, columnId);
        if (err === null) errors.delete(key);
        else errors.set(key, err);
        errors = new Map(errors);
      },
    },
    getSortRef: () => sort,
    setSort: (next) => {
      sort = [...next];
    },
    getFilterRef: () => filter,
    setFilter: (next) => {
      filter = next;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getFormulasMap: () => formulasByCellKey,
  };
  return internal;
}
