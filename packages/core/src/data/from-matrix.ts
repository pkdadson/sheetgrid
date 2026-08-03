import type { ColumnDef, GridRow } from "../types.js";

export interface FromMatrixOptions {
  headerRow?: boolean;
}

function slugHeader(header: string, used: Set<string>, index: number): string {
  const base =
    header
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || `col_${index}`;
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}_${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

/**
 * Convert a 2D matrix into core rows + columns.
 * Missing cells become `null`.
 */
export function fromMatrix(
  matrix: unknown[][],
  options: FromMatrixOptions = {},
): { rows: GridRow[]; columns: ColumnDef[] } {
  const headerRow = options.headerRow ?? false;
  if (matrix.length === 0) {
    return { rows: [], columns: [] };
  }

  const used = new Set<string>();
  let columns: ColumnDef[];
  let body: unknown[][];

  if (headerRow) {
    const headers = matrix[0] ?? [];
    const colCount = Math.max(
      headers.length,
      ...matrix.slice(1).map((r) => r.length),
      0,
    );
    columns = Array.from({ length: colCount }, (_, i) => {
      const raw = headers[i];
      const header =
        raw === undefined || raw === null ? `Column ${i + 1}` : String(raw);
      return {
        id: slugHeader(header, used, i),
        header,
      };
    });
    body = matrix.slice(1);
  } else {
    const colCount = Math.max(...matrix.map((r) => r.length), 0);
    columns = Array.from({ length: colCount }, (_, i) => {
      const id = `col_${i}`;
      used.add(id);
      return { id, header: id };
    });
    body = matrix;
  }

  const rows: GridRow[] = body.map((raw, rowIndex) => {
    const values: Record<string, unknown> = {};
    for (let c = 0; c < columns.length; c++) {
      const col = columns[c]!;
      values[col.id] = c < raw.length ? (raw[c] ?? null) : null;
    }
    return { id: `row_${rowIndex}`, values };
  });

  return { rows, columns };
}
