import type { DefineComponent } from "vue";
import type { ObjectRow, VueColumnDef } from "./column-types.js";

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
  columnGroups?: import("@sheetgrid/core").ColumnGroupDef[];
  sortBy?: import("@sheetgrid/core").SortSpec[];
  defaultSortBy?: import("@sheetgrid/core").SortSpec[];
  formulas?: boolean;
  formulaEntry?: import("@sheetgrid/core").FormulaEntryMode;
  formulaLimits?: Partial<import("@sheetgrid/core").FormulaLimits>;
  allowIndirect?: boolean;
  allowVolatile?: boolean;
  validationMode?: "reject" | "commit-with-error";
  statusBar?: boolean;
  rowGrouping?: { columns: string[] };
  ariaLabel?: string;
  // Customization hooks
  selection?: import("@sheetgrid/core").SelectionState;
  selectionMode?: "cell" | "row";
  rowClassFn?: (
    row: import("@sheetgrid/core").GridRow,
    index: number,
  ) => string | string[] | Record<string, boolean>;
  cellClassFn?: (
    row: import("@sheetgrid/core").GridRow,
    column: import("@sheetgrid/core").ColumnDef,
  ) => string | string[] | Record<string, boolean>;
  clipboardEnabled?: boolean;
  // Emit shims
  onSelectionChange?: (next: import("@sheetgrid/core").SelectionState) => void;
  onColumnWidthsChange?: (widths: Record<string, number>) => void;
}

export interface SheetGridEmits {
  (e: "selectionChange", next: import("@sheetgrid/core").SelectionState): void;
  (e: "columnWidthsChange", widths: Record<string, number>): void;
  (e: "rowsChange", rows: ObjectRow[], meta: { reason: string }): void;
  (e: "dataChange", data: unknown[][], meta: { reason: string }): void;
  (e: "sortChange", next: import("@sheetgrid/core").SortSpec[]): void;
}

declare const SheetGrid: DefineComponent<SheetGridProps>;
export default SheetGrid;
