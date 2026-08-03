import type { ColumnDef, GridRow } from "../types.js";

export interface ToMatrixOptions {
  headerRow?: boolean;
}

/**
 * Export core rows + columns to a 2D matrix.
 */
export function toMatrix(
  rows: GridRow[],
  columns: ColumnDef[],
  options: ToMatrixOptions = {},
): unknown[][] {
  const headerRow = options.headerRow ?? false;
  const body = rows.map((row) =>
    columns.map((col) => {
      const v = row.values[col.id];
      return v === undefined ? null : v;
    }),
  );
  if (!headerRow) {
    return body;
  }
  return [columns.map((c) => c.header), ...body];
}
