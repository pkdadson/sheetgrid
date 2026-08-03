import type { ColumnDef, GridRow, SortSpec } from "../types.js";
import { pickDefaultComparator, withNullsLast } from "./comparators.js";

/**
 * Return rows sorted according to `spec`. Pure, stable, and does not mutate
 * the input array. Unknown column ids in the spec are skipped. When `spec` is
 * empty, the input array is returned unchanged (same reference).
 */
export function sortRows(
  rows: GridRow[],
  columns: ColumnDef[],
  spec: SortSpec[],
): GridRow[] {
  if (spec.length === 0) return rows;

  const byId = new Map<string, ColumnDef>();
  for (const c of columns) byId.set(c.id, c);

  const active = spec.filter((s) => byId.has(s.columnId));
  if (active.length === 0) return rows;

  const indexed = rows.map((row, i) => ({ row, i }));

  indexed.sort((A, B) => {
    for (const s of active) {
      const col = byId.get(s.columnId)!;
      const cmp = col.comparator
        ? withNullsLast(col.comparator)
        : pickDefaultComparator(col.type);
      const a = A.row.values[s.columnId];
      const b = B.row.values[s.columnId];
      const aNull = a == null || (typeof a === "number" && Number.isNaN(a));
      const bNull = b == null || (typeof b === "number" && Number.isNaN(b));
      if (aNull && bNull) continue;
      if (aNull) return 1;
      if (bNull) return -1;
      const raw = cmp(a, b, {
        rowA: A.row,
        rowB: B.row,
        direction: s.direction,
      });
      if (raw !== 0) return s.direction === "asc" ? raw : -raw;
    }
    return A.i - B.i;
  });

  return indexed.map(({ row }) => row);
}
