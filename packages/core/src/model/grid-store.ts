import { cellKey } from "../data/cell-key.js";
import { toMatrix } from "../data/to-matrix.js";
import type { FormulaEngineOptions, FormulaValue } from "../formula/index.js";
import type {
  CellError,
  ColumnDef,
  ColumnId,
  CommitReason,
  GridRow,
  RowId,
} from "../types.js";
import { ClearFormulaCommand } from "./commands/clear-formula.js";
import { MoveColumnCommand } from "./commands/move-column.js";
import { MoveRowCommand } from "./commands/move-row.js";
import { ReplaceColumnsCommand } from "./commands/replace-columns.js";
import { ReplaceRowsCommand } from "./commands/replace-rows.js";
import { SetCellCommand } from "./commands/set-cell.js";
import { SetColumnOrderCommand } from "./commands/set-column-order.js";
import { SetErrorCommand } from "./commands/set-error.js";
import { SetFormulaCommand } from "./commands/set-formula.js";
import { SwapColumnsCommand } from "./commands/swap-columns.js";
import { SwapRowsCommand } from "./commands/swap-rows.js";
import type { EventSource, Snapshot } from "./commands/types.js";
import { History } from "./history.js";
import { createInternalStore } from "./internal-store.js";
import { takeSnapshot } from "./snapshot.js";
import { RestoreCommand } from "./commands/restore.js";
import { AddRowCommand, generateRowId } from "./commands/add-row.js";
import { UpdateRowCommand } from "./commands/update-row.js";
import { DeleteRowCommand } from "./commands/delete-row.js";
import { AddColumnCommand } from "./commands/add-column.js";
import { UpdateColumnCommand } from "./commands/update-column.js";
import { DeleteColumnCommand } from "./commands/delete-column.js";
import { SetSortCommand } from "./commands/set-sort.js";
import { SetFilterCommand } from "./commands/set-filter.js";

export type FormulaEntryMode = "auto-equals" | "explicit-only";

export interface CreateGridStoreInput {
  rows: GridRow[];
  columns: ColumnDef[];
  columnOrder?: ColumnId[];
  formulas?: boolean;
  formulaOptions?: FormulaEngineOptions;
  formulaEntry?: FormulaEntryMode;
  historyLimit?: number;
}

// TODO(M1.13+): "api" reason currently collapses to system:init because EventSource
// has no explicit "api" variant. Consider adding it if agent-side consumers need to
// distinguish programmatic mutations from initial-load mutations.
function sourceFor(reason: CommitReason): EventSource {
  if (reason === "edit") return { kind: "user", interaction: "edit" };
  if (reason === "paste") return { kind: "user", interaction: "paste" };
  if (reason === "cut") return { kind: "user", interaction: "edit" };
  if (reason === "reorder") return { kind: "user", interaction: "ui" };
  return { kind: "system", reason: "init" };
}

export interface GridStore {
  getRows(): GridRow[];
  getColumns(): ColumnDef[];
  getOrderedColumns(): ColumnDef[];
  getCell(rowId: RowId, columnId: ColumnId): unknown;
  setCell(rowId: RowId, columnId: ColumnId, value: unknown, reason: CommitReason): void;
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
  isFormulasEnabled(): boolean;
  getFormulaEntry(): FormulaEntryMode;
  setFormula(rowId: RowId, columnId: ColumnId, source: string): boolean;
  clearFormula(rowId: RowId, columnId: ColumnId): void;
  getFormula(rowId: RowId, columnId: ColumnId): { source: string; result: FormulaValue } | null;

  // New in M2.
  addRow(
    values: Record<ColumnId, unknown>,
    opts?: { at?: number | "end"; id?: RowId },
  ): { ok: boolean; rowId?: RowId; error?: string };
  updateRow(rowId: RowId, patch: Record<ColumnId, unknown>): { ok: boolean; error?: string };
  deleteRow(rowId: RowId): { ok: boolean; error?: string };
  addColumn(
    def: ColumnDef,
    opts?: { at?: number | "end" },
  ): { ok: boolean; error?: string };
  updateColumn(
    columnId: ColumnId,
    patch: Partial<ColumnDef>,
  ): { ok: boolean; error?: string };
  deleteColumn(columnId: ColumnId): { ok: boolean; error?: string };
  setSort(specs: import("../types.js").SortSpec[]): { ok: boolean; error?: string };
  clearSort(): void;
  getSort(): import("../types.js").SortSpec[];
  setFilter(
    filter: import("../types.js").FilterClause,
  ): { ok: boolean; error?: string };
  clearFilter(): void;
  getFilter(): import("../types.js").FilterClause | null;

  /** New in M1 — exposed for the agent controller. */
  __history: History;
  __takeSnapshot(): Snapshot;
  __restore(snap: Snapshot): void;
}

export function createGridStore(input: CreateGridStoreInput): GridStore {
  const internal = createInternalStore({
    rows: input.rows,
    columns: input.columns,
    columnOrder: input.columnOrder,
    formulas: input.formulas,
    formulaOptions: input.formulaOptions,
  });
  const history = new History(internal, { limit: input.historyLimit ?? 100 });
  let lastReason: CommitReason | null = null;

  const formulaEntry: FormulaEntryMode = input.formulaEntry ?? "auto-equals";

  const dispatchAndTrack = (cmd: Parameters<History["dispatch"]>[0], reason: CommitReason) => {
    const res = history.dispatch(cmd);
    if (res.ok) lastReason = reason;
    return res;
  };

  return {
    getRows: () => internal.getRowsRef(),
    getColumns: () => internal.getColumnsRef(),
    getOrderedColumns: () => {
      const byId = new Map(internal.getColumnsRef().map((c) => [c.id, c]));
      return internal
        .getColumnOrderRef()
        .map((id) => byId.get(id))
        .filter((c): c is ColumnDef => c !== undefined);
    },
    getCell: (rowId, columnId) =>
      internal.getRowsRef().find((r) => r.id === rowId)?.values[columnId],
    setCell(rowId, columnId, value, reason) {
      dispatchAndTrack(new SetCellCommand(rowId, columnId, value, sourceFor(reason)), reason);
    },
    replaceRows(next) {
      dispatchAndTrack(new ReplaceRowsCommand(next, sourceFor("api")), "api");
    },
    replaceColumns(next) {
      dispatchAndTrack(new ReplaceColumnsCommand(next, sourceFor("api")), "api");
    },
    setColumnOrder(order) {
      dispatchAndTrack(new SetColumnOrderCommand(order, sourceFor("reorder")), "reorder");
    },
    getColumnOrder: () => internal.getColumnOrderRef(),
    moveColumn(columnId, toIndex) {
      dispatchAndTrack(new MoveColumnCommand(columnId, toIndex, sourceFor("reorder")), "reorder");
    },
    swapColumns(a, b) {
      dispatchAndTrack(new SwapColumnsCommand(a, b, sourceFor("reorder")), "reorder");
    },
    moveRow(rowId, toIndex) {
      dispatchAndTrack(new MoveRowCommand(rowId, toIndex, sourceFor("reorder")), "reorder");
    },
    swapRows(a, b) {
      dispatchAndTrack(new SwapRowsCommand(a, b, sourceFor("reorder")), "reorder");
    },
    getErrors: () => internal.errors.getMap(),
    setError(rowId, columnId, error) {
      dispatchAndTrack(new SetErrorCommand(rowId, columnId, error, sourceFor("api")), "api");
    },
    clearError(rowId, columnId) {
      this.setError(rowId, columnId, null);
    },
    toMatrix(opts) {
      return toMatrix(internal.getRowsRef(), this.getOrderedColumns(), opts);
    },
    subscribe(listener) {
      return internal.subscribe(listener);
    },
    getLastReason() {
      return lastReason;
    },
    isFormulasEnabled: () => internal.formulas.isEnabled(),
    getFormulaEntry: () => formulaEntry,
    setFormula(rowId, columnId, source) {
      if (!internal.formulas.isEnabled()) return false;
      const src = source.trim();
      if (!src || src === "=") {
        this.clearFormula(rowId, columnId);
        return true;
      }
      const res = dispatchAndTrack(
        new SetFormulaCommand(rowId, columnId, src, sourceFor("edit")),
        "edit",
      );
      return res.ok;
    },
    clearFormula(rowId, columnId) {
      dispatchAndTrack(
        new ClearFormulaCommand(rowId, columnId, sourceFor("edit")),
        "edit",
      );
    },
    getFormula(rowId, columnId) {
      const src = internal.formulas.getRaw(rowId, columnId);
      if (src === null) return null;
      const state = internal.getFormulasMap().get(cellKey(rowId, columnId));
      return state ? { source: state.source, result: state.result } : null;
    },
    addRow(values, opts) {
      const id = opts?.id ?? generateRowId();
      const res = dispatchAndTrack(
        new AddRowCommand(values, { ...opts, id }, sourceFor("api")),
        "api",
      );
      return res.ok ? { ok: true, rowId: id } : { ok: false, error: res.message };
    },
    updateRow(rowId, patch) {
      const res = dispatchAndTrack(
        new UpdateRowCommand(rowId, patch, sourceFor("api")),
        "api",
      );
      return res.ok ? { ok: true } : { ok: false, error: res.message };
    },
    deleteRow(rowId) {
      const res = dispatchAndTrack(
        new DeleteRowCommand(rowId, sourceFor("api")),
        "api",
      );
      return res.ok ? { ok: true } : { ok: false, error: res.message };
    },
    addColumn(def, opts) {
      const res = dispatchAndTrack(
        new AddColumnCommand(def, opts ?? {}, sourceFor("api")),
        "api",
      );
      return res.ok ? { ok: true } : { ok: false, error: res.message };
    },
    updateColumn(columnId, patch) {
      const res = dispatchAndTrack(
        new UpdateColumnCommand(columnId, patch, sourceFor("api")),
        "api",
      );
      return res.ok ? { ok: true } : { ok: false, error: res.message };
    },
    deleteColumn(columnId) {
      const res = dispatchAndTrack(
        new DeleteColumnCommand(columnId, sourceFor("api")),
        "api",
      );
      return res.ok ? { ok: true } : { ok: false, error: res.message };
    },
    setSort(specs) {
      const res = dispatchAndTrack(new SetSortCommand(specs, sourceFor("api")), "api");
      return res.ok ? { ok: true } : { ok: false, error: res.message };
    },
    clearSort() {
      dispatchAndTrack(new SetSortCommand([], sourceFor("api")), "api");
    },
    getSort() {
      return [...internal.getSortRef()];
    },
    setFilter(filter) {
      const res = dispatchAndTrack(
        new SetFilterCommand(filter, sourceFor("api")),
        "api",
      );
      return res.ok ? { ok: true } : { ok: false, error: res.message };
    },
    clearFilter() {
      dispatchAndTrack(new SetFilterCommand(null, sourceFor("api")), "api");
    },
    getFilter() {
      return internal.getFilterRef();
    },
    __history: history,
    __takeSnapshot() {
      return takeSnapshot(internal);
    },
    __restore(snap) {
      dispatchAndTrack(new RestoreCommand(snap, sourceFor("api")), "api");
    },
  };
}
