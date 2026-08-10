import type { DefineComponent } from "vue";
import type { ObjectRow, VueColumnDef } from "./column-types.js";

export interface SheetGridProps {
  /** Object rows. Every row must have a stable string `id`. */
  rows?: ObjectRow[];
  /** Column definitions. */
  columns?: VueColumnDef[];
  /** 2D matrix data. Use instead of `rows`/`columns` for spreadsheet input. */
  data?: unknown[][];
  /** Treat the first row of `data` as the header row. */
  headerRow?: boolean;
  density?: "comfortable" | "compact";
  theme?: "light" | "dark";
  zebra?: boolean;
  className?: string;
}

declare const SheetGrid: DefineComponent<SheetGridProps>;
export default SheetGrid;
