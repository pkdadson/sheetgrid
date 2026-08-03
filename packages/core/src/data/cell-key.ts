import type { ColumnId, RowId } from "../types.js";

/** Encode so row/column ids may contain `|` without parse ambiguity. */
export function cellKey(rowId: RowId, columnId: ColumnId): string {
  return `${encodeURIComponent(rowId)}|${encodeURIComponent(columnId)}`;
}

export function parseCellKey(key: string): {
  rowId: RowId;
  columnId: ColumnId;
} {
  const i = key.indexOf("|");
  if (i < 0) {
    throw new Error(`Invalid cell key: ${key}`);
  }
  return {
    rowId: decodeURIComponent(key.slice(0, i)),
    columnId: decodeURIComponent(key.slice(i + 1)),
  };
}
