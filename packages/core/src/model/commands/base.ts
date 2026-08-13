import type { GridRow, RowId } from "../../types.js";

export function findRowIndex(rows: GridRow[], rowId: RowId): number {
  return rows.findIndex((r) => r.id === rowId);
}

export function cloneRow(row: GridRow): GridRow {
  return { id: row.id, values: { ...row.values } };
}
