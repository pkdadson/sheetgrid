import type { ColumnDef, GridRow } from "@sheetgrid/core";
import type { ReactNode } from "react";
import type { BuiltInCellType } from "./cells/types.js";

/**
 * A row you pass into `<Grid rows={...}>`. `id` must be a stable string that
 * survives re-renders — selection, edit state, and reorder tracking key off it.
 * If you don't have a natural id, generate one once (e.g. `crypto.randomUUID()`)
 * and store it alongside your row data.
 */
export type ObjectRow = Record<string, unknown> & { id: string };

export interface SelectOption {
  label: string;
  value: string;
}

export interface ReactColumnDef extends ColumnDef {
  /** Built-in or registered cell type. Default: "text". */
  type?: BuiltInCellType | (string & {});
  selectOptions?: SelectOption[];
  cell?: (props: {
    value: unknown;
    row: GridRow;
    column: ReactColumnDef;
    rowId: string;
    isSelected: boolean;
    isEditing: boolean;
    error?: string;
    onCommitValue: (value: unknown) => void;
  }) => ReactNode;
  editor?: (props: {
    value: unknown;
    column: ReactColumnDef;
    onChange: (value: unknown) => void;
    onCommit: (value?: unknown) => void;
    onCancel: () => void;
  }) => ReactNode;
}
