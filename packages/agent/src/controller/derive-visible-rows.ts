import {
  type ColumnDef,
  type FilterClause,
  type GridRow,
  type RowId,
  type SortSpec,
  evaluateFilter,
  sortRows,
} from "@sheetgrid/core";

export function deriveVisibleRowIds(
  rows: GridRow[],
  columns: ColumnDef[],
  sort: SortSpec[],
  filter: FilterClause | null,
): RowId[] {
  const filtered =
    filter === null ? rows : rows.filter((r) => evaluateFilter(filter, r));
  const sorted =
    sort.length === 0 ? filtered : sortRows(filtered, columns, sort);
  return sorted.map((r) => r.id);
}
