import type { ColumnDef } from "@sheetgrid/core";
import type { BuiltInCellType } from "./cells/types.js";

/**
 * A row you pass into `<SheetGrid rows={...}>`. `id` must be a stable string
 * that survives re-renders — selection, edit state, and reorder tracking key
 * off it. If you don't have a natural id, generate one once (e.g.
 * `crypto.randomUUID()`) and store it alongside your row data.
 */
export type ObjectRow = Record<string, unknown> & { id: string };

export interface SelectOption {
  label: string;
  value: string;
}

/**
 * Column definition used by `<SheetGrid>`. Extends core `ColumnDef`. Vue
 * component overrides for `cell` and `editor` land in a later milestone.
 */
export interface VueColumnDef extends ColumnDef {
  /** Built-in cell type. Default: "text". */
  type?: BuiltInCellType | (string & {});
  selectOptions?: SelectOption[];
}
