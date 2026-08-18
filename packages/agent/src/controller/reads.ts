import {
  type ColumnId,
  type FilterClause,
  type GridStore,
  type RowId,
  evaluateFilter,
} from "@sheetgrid/core";
import { type OpResult, fail, ok } from "../types/op-result.js";
import { deriveVisibleRowIds } from "./derive-visible-rows.js";

export interface GetDataOptions {
  rowIds?: RowId[];
  columnIds?: ColumnId[];
  range?: { fromRow: number; toRow: number };
  includeFormulaSources?: boolean;
}

export interface DataResult {
  rows: Array<{
    id: RowId;
    values: Record<ColumnId, unknown>;
    formulas?: Record<ColumnId, string>;
  }>;
  total: number;
}

export function doGetData(
  store: GridStore,
  _mode: "objects" | "matrix",
  opts: GetDataOptions,
): DataResult {
  const allRows = store.getRows();
  const cols = store.getOrderedColumns();
  const sort = store.getSort();
  const filter = store.getFilter();

  // Determine which rows are candidates.
  let candidateIds: RowId[];
  if (opts.rowIds) {
    // Explicit row-id fetch bypasses sort/filter — the agent asked for these specifically.
    const known = new Set(allRows.map((r) => r.id));
    candidateIds = opts.rowIds.filter((id) => known.has(id));
  } else {
    candidateIds = deriveVisibleRowIds(allRows, cols, sort, filter);
  }

  const total = candidateIds.length;

  if (opts.range) {
    const from = Math.max(0, opts.range.fromRow);
    const to = Math.min(total, opts.range.toRow);
    candidateIds = candidateIds.slice(from, to);
  }

  const byId = new Map(allRows.map((r) => [r.id, r]));
  const columnFilter = opts.columnIds ? new Set(opts.columnIds) : null;

  const rows = candidateIds.map((id) => {
    const row = byId.get(id)!;
    let values: Record<ColumnId, unknown>;
    if (columnFilter) {
      values = {};
      for (const [k, v] of Object.entries(row.values)) {
        if (columnFilter.has(k)) values[k] = v;
      }
    } else {
      values = { ...row.values };
    }
    if (opts.includeFormulaSources && store.isFormulasEnabled()) {
      const formulas: Record<ColumnId, string> = {};
      for (const c of cols) {
        if (columnFilter && !columnFilter.has(c.id)) continue;
        const f = store.getFormula(id, c.id);
        if (f) formulas[c.id] = f.source;
      }
      return { id, values, formulas };
    }
    return { id, values };
  });

  return { rows, total };
}

export function doGetCell(
  store: GridStore,
  rowId: RowId,
  columnId: ColumnId,
): OpResult<{
  value: unknown;
  formula?: string;
  error?: { message: string; code?: string };
}> {
  const row = store.getRows().find((r) => r.id === rowId);
  if (!row) return fail("not_found", `row "${rowId}"`);
  const cols = store.getColumns();
  if (!cols.some((c) => c.id === columnId)) {
    return fail("not_found", `column "${columnId}"`);
  }
  const value = row.values[columnId];
  const formulaState = store.isFormulasEnabled()
    ? store.getFormula(rowId, columnId)
    : null;
  const err = store
    .getErrors()
    .get(`${encodeURIComponent(rowId)}|${encodeURIComponent(columnId)}`);
  const result: {
    value: unknown;
    formula?: string;
    error?: { message: string; code?: string };
  } = {
    value,
  };
  if (formulaState) result.formula = formulaState.source;
  if (err) result.error = { message: err.message, code: err.code };
  return ok(result);
}

export function doQueryRows(
  store: GridStore,
  where: FilterClause,
): OpResult<{ rowIds: RowId[] }> {
  // Validate columns referenced in `where` exist.
  const known = new Set(store.getColumns().map((c) => c.id));
  const referenced = new Set<ColumnId>();
  (function walk(c: FilterClause) {
    if ("and" in c) return c.and.forEach(walk);
    if ("or" in c) return c.or.forEach(walk);
    if ("not" in c) return walk(c.not);
    referenced.add(c.column);
  })(where);
  for (const col of referenced) {
    if (!known.has(col)) {
      return fail(
        "invalid_argument",
        `where clause references unknown column "${col}"`,
      );
    }
  }

  const rowIds = store
    .getRows()
    .filter((r) => evaluateFilter(where, r))
    .map((r) => r.id);
  return ok({ rowIds });
}

export function doDescribe(
  store: GridStore,
  mode: "objects" | "matrix",
): string {
  const rows = store.getRows();
  const cols = store.getOrderedColumns();
  const sort = store.getSort();
  const filter = store.getFilter();

  const colDesc = cols
    .map(
      (c) =>
        `${c.id} (${c.type ?? "text"}${c.header !== c.id ? `, "${c.header}"` : ""})`,
    )
    .join(", ");
  const sortDesc =
    sort.length === 0
      ? "no sort"
      : `sort: ${sort.map((s) => `${s.columnId} ${s.direction}`).join(", ")}`;
  const filterDesc = filter === null ? "no filter" : "filter: (active)";

  return `SheetGrid: ${rows.length} rows, columns: ${colDesc}. Mode: ${mode}. ${sortDesc}. ${filterDesc}.`;
}
