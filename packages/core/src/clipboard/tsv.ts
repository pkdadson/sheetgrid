import type { CellCoord, ColumnId, GridRow, RowId, ValidationMode } from "../types.js";
import type { GridStore } from "../model/grid-store.js";
import { commitCell } from "../model/validation.js";

/** Serialize a 2D matrix to TSV with Excel-friendly quoting. */
export function serializeTsv(matrix: unknown[][]): string {
  return matrix
    .map((row) => row.map((cell) => escapeCell(cell)).join("\t"))
    .join("\n");
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = value instanceof Date ? value.toISOString() : String(value);
  if (/[\t\n\r"]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Parse TSV/CSV-ish text into a matrix. */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === "\t") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  row.push(cell);
  if (row.length > 1 || row[0] !== "" || text.length > 0) {
    rows.push(row);
  }
  return rows;
}

export function extractRange(
  store: GridStore,
  start: CellCoord,
  end: CellCoord,
): unknown[][] {
  const rows = store.getRows();
  const cols = store.getOrderedColumns();
  const rowIds = rows.map((r) => r.id);
  const colIds = cols.map((c) => c.id);
  const r0 = Math.min(rowIds.indexOf(start.rowId), rowIds.indexOf(end.rowId));
  const r1 = Math.max(rowIds.indexOf(start.rowId), rowIds.indexOf(end.rowId));
  const c0 = Math.min(
    colIds.indexOf(start.columnId),
    colIds.indexOf(end.columnId),
  );
  const c1 = Math.max(
    colIds.indexOf(start.columnId),
    colIds.indexOf(end.columnId),
  );
  if (r0 < 0 || c0 < 0) return [];
  const matrix: unknown[][] = [];
  for (let r = r0; r <= r1; r++) {
    const row = rows[r]!;
    const line: unknown[] = [];
    for (let c = c0; c <= c1; c++) {
      line.push(row.values[colIds[c]!] ?? null);
    }
    matrix.push(line);
  }
  return matrix;
}

export async function applyPaste(
  store: GridStore,
  start: CellCoord,
  matrix: unknown[][],
  mode: ValidationMode,
): Promise<void> {
  const rows = store.getRows();
  const cols = store.getOrderedColumns();
  const rowIds = rows.map((r) => r.id);
  const colIds = cols.map((c) => c.id);
  const rStart = rowIds.indexOf(start.rowId);
  const cStart = colIds.indexOf(start.columnId);
  if (rStart < 0 || cStart < 0) return;

  for (let r = 0; r < matrix.length; r++) {
    const line = matrix[r]!;
    const rowId = rowIds[rStart + r] as RowId | undefined;
    if (!rowId) break;
    for (let c = 0; c < line.length; c++) {
      const columnId = colIds[cStart + c] as ColumnId | undefined;
      if (!columnId) break;
      await commitCell(store, {
        rowId,
        columnId,
        value: line[c],
        mode,
        reason: "paste",
      });
    }
  }
}
