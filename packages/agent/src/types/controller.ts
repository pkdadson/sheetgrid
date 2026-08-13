import type {
  ColumnDef,
  ColumnId,
  FilterClause,
  GridRow,
  RowId,
  SelectionState,
  SortSpec,
} from "@sheetgrid/core";
import type { AgentOp } from "./agent-op.js";
import type { GridEvent } from "./grid-event.js";
import type { OpResult } from "./op-result.js";
import type { Snapshot } from "./snapshot.js";
import type { WhereClause } from "./where-clause.js";

export type Unsubscribe = () => void;

export interface GridSchema {
  columns: Array<{
    id: ColumnId;
    header: string;
    type?: string;
    agentWritable: boolean;
    description?: string;
  }>;
  rowIdField: string;
  rowCount: number;
  mode: "objects" | "matrix";
  sort: SortSpec[];
  filter: FilterClause | null;
}

export interface GridController {
  // ── Introspection ──
  getSchema(): GridSchema;
  getData(opts?: {
    rowIds?: RowId[];
    columnIds?: ColumnId[];
    range?: { fromRow: number; toRow: number };
    includeFormulaSources?: boolean;
  }): { rows: Array<{ id: RowId; values: Record<ColumnId, unknown>; formulas?: Record<ColumnId, string> }>; total: number };
  getCell(
    rowId: RowId,
    columnId: ColumnId,
  ): OpResult<{ value: unknown; formula?: string; error?: { message: string; code?: string } }>;
  queryRows(where: WhereClause): OpResult<{ rowIds: RowId[] }>;
  getSelection(): SelectionState;
  describe(): string;

  // ── Cell writes ──
  setCell(rowId: RowId, columnId: ColumnId, value: unknown): OpResult;
  setCells(patches: Array<{ rowId: RowId; columnId: ColumnId; value: unknown }>): OpResult<{
    applied: number;
    rejected: Array<{ rowId: RowId; columnId: ColumnId; code: string; message: string }>;
  }>;

  // ── Row CRUD ──
  addRow(
    values: Record<ColumnId, unknown>,
    opts?: { at?: number | "end"; id?: RowId },
  ): OpResult<{ rowId: RowId }>;
  updateRow(rowId: RowId, patch: Record<ColumnId, unknown>): OpResult;
  deleteRow(rowId: RowId): OpResult;
  moveRow(rowId: RowId, toIndex: number): OpResult;

  // ── Column CRUD ──
  addColumn(def: ColumnDef, opts?: { at?: number | "end" }): OpResult;
  deleteColumn(columnId: ColumnId): OpResult;
  moveColumn(columnId: ColumnId, toIndex: number): OpResult;
  updateColumn(columnId: ColumnId, patch: Partial<ColumnDef>): OpResult;

  // ── View state ──
  setSort(specs: SortSpec[]): OpResult;
  clearSort(): OpResult;
  setFilter(filter: FilterClause | null): OpResult;
  select(
    target:
      | { rowId: RowId; columnId: ColumnId }
      | { range: { start: { rowId: RowId; columnId: ColumnId }; end: { rowId: RowId; columnId: ColumnId } } },
  ): OpResult;

  // ── Formulas ──
  setFormula(rowId: RowId, columnId: ColumnId, source: string): OpResult;
  clearFormula(rowId: RowId, columnId: ColumnId): OpResult;

  // ── Transactions ──
  batch<T>(fn: (tx: GridController) => T | Promise<T>): Promise<OpResult<T>>;

  // ── History ──
  undo(): OpResult<{ op: AgentOp }>;
  redo(): OpResult<{ op: AgentOp }>;
  canUndo(): boolean;
  canRedo(): boolean;
  snapshot(): Snapshot;
  restore(snap: Snapshot): OpResult;

  // ── Events ──
  on<E extends GridEvent["type"]>(
    type: E | "*",
    handler: (event: Extract<GridEvent, { type: E }> | GridEvent) => void,
  ): Unsubscribe;

  // ── Lifecycle (framework-binding-facing) ──
  /** Attach to a mounted core store. Called by the React/Vue bindings. */
  __attach(store: unknown): void;
  /** Detach from the currently attached store. */
  __detach(): void;
  /** True iff attached to a store. */
  isAttached(): boolean;
  /** Enqueue an op to run when the controller next attaches. Bounded queue (100). */
  __enqueue(op: AgentOp): void;

  // ── Subscription for framework reactivity ──
  subscribe(listener: () => void): Unsubscribe;
}
