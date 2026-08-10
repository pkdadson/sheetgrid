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
}

declare const SheetGrid: DefineComponent<SheetGridProps>;
export default SheetGrid;
