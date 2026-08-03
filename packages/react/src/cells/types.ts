import type { GridRow } from "@sheetgrid/core";
import type { ReactNode } from "react";
import type { ReactColumnDef } from "../column-types.js";

export interface CellRenderProps {
  value: unknown;
  row: GridRow;
  column: ReactColumnDef;
  rowId: string;
  isSelected: boolean;
  isEditing: boolean;
  error?: string;
  /** Commit a value without entering text edit (e.g. checkbox). */
  onCommitValue: (value: unknown) => void;
}

export interface EditorRenderProps {
  value: unknown;
  column: ReactColumnDef;
  onChange: (value: unknown) => void;
  /** Optional value commits immediately (avoids stale React state). */
  onCommit: (value?: unknown) => void;
  onCancel: () => void;
  /** Active validation error while editing (reject / commit-with-error). */
  error?: string;
}

export type CellRenderer = (props: CellRenderProps) => ReactNode;
export type EditorRenderer = (props: EditorRenderProps) => ReactNode;

export interface CellTypeDefinition {
  cell: CellRenderer;
  editor?: EditorRenderer;
}

export type BuiltInCellType = "text" | "number" | "boolean" | "select";
