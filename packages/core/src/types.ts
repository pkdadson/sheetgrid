export type RowId = string;
export type ColumnId = string;
export type CellValue = string | number | boolean | null | Date;

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string; code?: string };

export interface GridRow {
  id: RowId;
  values: Record<ColumnId, unknown>;
}

export interface ValidateCtx {
  rowId: RowId;
  columnId: ColumnId;
  row: GridRow;
  rows: GridRow[];
}

export interface ColumnDef {
  id: ColumnId;
  header: string;
  width?: number | "flex" | "auto";
  minWidth?: number;
  maxWidth?: number;
  editable?: boolean | ((row: GridRow) => boolean);
  validate?: (
    value: unknown,
    ctx: ValidateCtx,
  ) => ValidationResult | Promise<ValidationResult>;
  sortable?: boolean;
  /** Data type hint. Drives default sort comparator selection. */
  type?: string;
  /** Optional custom comparator. Overrides the default derived from `type`. */
  comparator?: Comparator;
  /**
   * Whether an agent (via GridController) is allowed to write this column.
   * Defaults to true unless the column is otherwise read-only.
   */
  agentWritable?: boolean;
  /**
   * Optional human-readable description shown to the agent in tool descriptors.
   * Use this to hint constraints like "Free-text customer note. Empty means not contacted."
   */
  description?: string;
}

export interface ColumnGroupDef {
  id: string;
  header: string;
  children: string[];
}

export type SelectionMode = "cell" | "range" | "rows" | "columns";

export interface CellCoord {
  rowId: RowId;
  columnId: ColumnId;
}

export interface CellRange {
  start: CellCoord;
  end: CellCoord;
}

export interface SelectionState {
  active: CellCoord | null;
  ranges: CellRange[];
  rowIds: RowId[];
  columnIds: ColumnId[];
}

export type CommitReason = "edit" | "paste" | "cut" | "api" | "reorder";

export type ValidationMode = "reject" | "commit-with-error";

export interface CellError {
  message: string;
  code?: string;
}

export type SortDirection = "asc" | "desc";

export interface SortSpec {
  columnId: ColumnId;
  direction: SortDirection;
}

export type Comparator = (
  a: unknown,
  b: unknown,
  ctx: { rowA: GridRow; rowB: GridRow; direction: SortDirection },
) => number;

export type FilterOp =
  | "eq"
  | "neq"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "in"
  | "not_in"
  | "is_null"
  | "is_not_null";

export type FilterClause =
  | { column: ColumnId; op: FilterOp; value?: unknown }
  | { and: FilterClause[] }
  | { or: FilterClause[] }
  | { not: FilterClause };
