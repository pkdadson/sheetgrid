import type { ColumnDef, GridRow } from "../types.js";

let generatedId = 0;

function nextId(): string {
  generatedId += 1;
  return `gen_${generatedId}`;
}

/**
 * Map plain objects into core GridRow records using column defs.
 * Generates row ids when missing.
 */
export function fromObjects(
  objects: Array<Record<string, unknown>>,
  columns: ColumnDef[],
): GridRow[] {
  return objects.map((obj) => {
    const rawId = obj.id;
    const id =
      typeof rawId === "string" || typeof rawId === "number"
        ? String(rawId)
        : nextId();
    const values: Record<string, unknown> = {};
    for (const col of columns) {
      values[col.id] = obj[col.id] ?? null;
    }
    return { id, values };
  });
}

/**
 * Flatten core rows back to plain objects (id + field values). Each returned
 * object is guaranteed to have a stable string `id` copied from `GridRow.id`.
 */
export function toObjects(
  rows: GridRow[],
  columns: ColumnDef[],
): Array<Record<string, unknown> & { id: string }> {
  return rows.map((row) => {
    const obj: Record<string, unknown> & { id: string } = { id: row.id };
    for (const col of columns) {
      obj[col.id] = row.values[col.id] ?? null;
    }
    return obj;
  });
}
