import type { GridRow } from "@sheetgrid/core";
import type { Component } from "vue";
import type { VueColumnDef } from "../column-types.js";

export type BuiltInCellType = "text" | "number" | "boolean" | "select";

export interface CellRenderProps {
  value: unknown;
  row: GridRow;
  column: VueColumnDef;
  rowId: string;
  isSelected: boolean;
  isEditing: boolean;
  error?: string;
  /** Commit a value without entering text edit (e.g. checkbox). */
  onCommitValue: (value: unknown) => void;
}

export interface EditorRenderProps {
  value: unknown;
  column: VueColumnDef;
  onChange: (value: unknown) => void;
  /** Optional value commits immediately (avoids stale reactivity). */
  onCommit: (value?: unknown) => void;
  onCancel: () => void;
  error?: string;
}

export interface CellTypeDefinition {
  cell: Component<CellRenderProps>;
  editor?: Component<EditorRenderProps>;
}
