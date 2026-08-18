import type {
  ColumnDef,
  ColumnId,
  FilterClause,
  RowId,
  SortSpec,
} from "@sheetgrid/core";
import type { Snapshot } from "./snapshot.js";
import type { WhereClause } from "./where-clause.js";

/**
 * All operations an agent (or the controller) can express as a single value.
 * Used for logging, replay, event payloads, and tool descriptor generation.
 */
export type AgentOp =
  // ── Reads ──
  | { type: "grid.get_schema" }
  | {
      type: "grid.get_data";
      rowIds?: RowId[];
      columnIds?: ColumnId[];
      range?: { fromRow: number; toRow: number };
      includeFormulaSources?: boolean;
    }
  | { type: "grid.get_cell"; rowId: RowId; columnId: ColumnId }
  | { type: "grid.query_rows"; where: WhereClause }
  | { type: "grid.get_selection" }

  // ── Cell writes ──
  | {
      type: "grid.set_cell";
      rowId: RowId;
      columnId: ColumnId;
      value: unknown;
    }
  | {
      type: "grid.set_cells";
      patches: Array<{ rowId: RowId; columnId: ColumnId; value: unknown }>;
    }

  // ── Rows ──
  | {
      type: "grid.add_row";
      values: Record<ColumnId, unknown>;
      opts?: { at?: number | "end"; id?: RowId };
    }
  | { type: "grid.update_row"; rowId: RowId; patch: Record<ColumnId, unknown> }
  | { type: "grid.delete_row"; rowId: RowId }
  | { type: "grid.move_row"; rowId: RowId; toIndex: number }

  // ── Columns ──
  | { type: "grid.add_column"; def: ColumnDef; opts?: { at?: number | "end" } }
  | { type: "grid.delete_column"; columnId: ColumnId }
  | { type: "grid.move_column"; columnId: ColumnId; toIndex: number }
  | {
      type: "grid.update_column";
      columnId: ColumnId;
      patch: Partial<ColumnDef>;
    }

  // ── View state ──
  | { type: "grid.set_sort"; specs: SortSpec[] }
  | { type: "grid.clear_sort" }
  | { type: "grid.set_filter"; filter: FilterClause | null }
  | {
      type: "grid.select";
      target:
        | { rowId: RowId; columnId: ColumnId }
        | {
            range: {
              start: { rowId: RowId; columnId: ColumnId };
              end: { rowId: RowId; columnId: ColumnId };
            };
          };
    }

  // ── Formulas ──
  | {
      type: "grid.set_formula";
      rowId: RowId;
      columnId: ColumnId;
      source: string;
    }
  | { type: "grid.clear_formula"; rowId: RowId; columnId: ColumnId }

  // ── Transactions + history ──
  | { type: "grid.batch"; ops: AgentOp[] }
  | { type: "grid.undo" }
  | { type: "grid.redo" }
  | { type: "grid.snapshot" }
  | { type: "grid.restore"; snapshot: Snapshot };
