import type { ColumnDef, GridRow } from "@sheetgrid/core";
import type { Component } from "vue";
import type {
  BuiltInCellType,
  CellRenderProps,
  EditorRenderProps,
} from "./cells/types.js";

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
 * Column definition used by `<SheetGrid>`. Extends core `ColumnDef`.
 */
export interface VueColumnDef extends ColumnDef {
  /** Built-in cell type. Default: "text". */
  type?: BuiltInCellType | (string & {});
  selectOptions?: SelectOption[];
  /** Override the cell renderer for this column. */
  cell?: Component<CellRenderProps>;
  /** Override the editor for this column. */
  editor?: Component<EditorRenderProps>;
  /** Editability: boolean or predicate. Default true. */
  editable?: boolean | ((row: GridRow) => boolean);
}
