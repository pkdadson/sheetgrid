import type {
  ColumnDef,
  ColumnId,
  FilterClause,
  GridRow,
  RowId,
  SortSpec,
} from "../../types.js";

/**
 * Origin of a mutation. Every Command carries this so events downstream can
 * distinguish agent-driven, user-driven, and system-driven changes.
 */
export type EventSource =
  | {
      kind: "agent";
      toolName?: string;
      correlationId?: string;
    }
  | {
      kind: "user";
      interaction: "edit" | "paste" | "keyboard" | "ui";
    }
  | {
      kind: "system";
      reason: "restore" | "formula-recalc" | "validation-fix" | "init";
    };

/**
 * A snapshot of persistent grid state. Opaque to consumers; the shape may
 * change between minor versions (bumped `v` field).
 */
export interface Snapshot {
  v: 1;
  rows: GridRow[];
  columns: ColumnDef[];
  columnOrder: ColumnId[];
  /** Serialized formula sources: [rowId, columnId, source] triples. */
  formulas: Array<[RowId, ColumnId, string]>;
  sort: SortSpec[];
  filter: FilterClause | null;
}

/** @deprecated Use SortSpec from core types instead. */
export type SnapshotSortEntry = SortSpec;

/** Handle passed to Command.apply(). Kept internal — not exported from index.ts. */
export interface InternalStore {
  getRowsRef(): GridRow[];
  setRows(next: GridRow[]): void;
  getColumnsRef(): ColumnDef[];
  setColumns(next: ColumnDef[]): void;
  getColumnOrderRef(): ColumnId[];
  setColumnOrder(next: ColumnId[]): void;
  /** Emit a listener notification. */
  notify(): void;
  /** Formula subsystem access. */
  formulas: {
    isEnabled(): boolean;
    getRaw(rowId: RowId, columnId: ColumnId): string | null;
    set(rowId: RowId, columnId: ColumnId, source: string): boolean;
    clear(rowId: RowId, columnId: ColumnId): void;
    /** Recalculate all dirty cell refs. */
    recalcAll(): void;
    /** Serialize/restore for snapshots. */
    serialize(): Array<[RowId, ColumnId, string]>;
    restore(entries: Array<[RowId, ColumnId, string]>): void;
  };
  errors: {
    getMap(): Map<string, import("../../types.js").CellError>;
    set(
      rowId: RowId,
      columnId: ColumnId,
      err: import("../../types.js").CellError | null,
    ): void;
  };
  getSortRef(): SortSpec[];
  setSort(next: SortSpec[]): void;
  getFilterRef(): FilterClause | null;
  setFilter(next: FilterClause | null): void;
}

export interface Command {
  readonly kind: string;
  readonly source: EventSource;
  /** If 'skip', dispatch will not push the inverse onto the history stack. */
  readonly history?: "skip";
  apply(internal: InternalStore): CommandResult;
}

export type CommandResult =
  | {
      ok: true;
      inverse: Command;
      /** Events to emit after apply; committed only if history push succeeds. */
      events: GridEvent[];
    }
  | {
      ok: false;
      code: string;
      message: string;
      details?: unknown;
    };

/**
 * GridEvent is defined in the agent package for its full shape, but the
 * core-side subset carried by commands is declared here so commands can
 * synthesize them without importing @sheetgrid/agent.
 */
export type GridEvent =
  | {
      type: "cell.changed";
      rowId: RowId;
      columnId: ColumnId;
      prev: unknown;
      next: unknown;
      source: EventSource;
    }
  | {
      type: "row.moved";
      rowId: RowId;
      from: number;
      to: number;
      source: EventSource;
    }
  | {
      type: "column.moved";
      columnId: ColumnId;
      from: number;
      to: number;
      source: EventSource;
    }
  | {
      type: "columns.replaced";
      prev: ColumnDef[];
      next: ColumnDef[];
      source: EventSource;
    }
  | {
      type: "rows.replaced";
      prev: GridRow[];
      next: GridRow[];
      source: EventSource;
    }
  | {
      type: "column-order.changed";
      prev: ColumnId[];
      next: ColumnId[];
      source: EventSource;
    }
  | {
      type: "formula.changed";
      rowId: RowId;
      columnId: ColumnId;
      prev: string | null;
      next: string | null;
      source: EventSource;
    }
  | {
      type: "error.changed";
      rowId: RowId;
      columnId: ColumnId;
      prev: import("../../types.js").CellError | null;
      next: import("../../types.js").CellError | null;
      source: EventSource;
    }
  | {
      type: "row.added";
      rowId: RowId;
      index: number;
      values: Record<ColumnId, unknown>;
      source: EventSource;
    }
  | {
      type: "row.removed";
      rowId: RowId;
      index: number;
      values: Record<ColumnId, unknown>;
      source: EventSource;
    }
  | {
      type: "row.updated";
      rowId: RowId;
      patch: Record<ColumnId, unknown>;
      prev: Record<ColumnId, unknown>;
      source: EventSource;
    }
  | {
      type: "column.added";
      columnId: ColumnId;
      index: number;
      def: ColumnDef;
      source: EventSource;
    }
  | {
      type: "column.removed";
      columnId: ColumnId;
      index: number;
      def: ColumnDef;
      source: EventSource;
    }
  | {
      type: "column.updated";
      columnId: ColumnId;
      patch: Partial<ColumnDef>;
      prev: ColumnDef;
      source: EventSource;
    }
  | {
      type: "sort.changed";
      prev: SortSpec[];
      next: SortSpec[];
      source: EventSource;
    }
  | {
      type: "filter.changed";
      prev: FilterClause | null;
      next: FilterClause | null;
      source: EventSource;
    };
