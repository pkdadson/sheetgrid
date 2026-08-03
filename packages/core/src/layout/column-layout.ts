import type { ColumnDef, ColumnId } from "../types.js";

const DEFAULT_WIDTH = 120;

export function setColumnWidth(
  widths: Record<ColumnId, number>,
  id: ColumnId,
  px: number,
  minWidth = 40,
  maxWidth = 2000,
): Record<ColumnId, number> {
  const clamped = Math.max(minWidth, Math.min(maxWidth, px));
  return { ...widths, [id]: clamped };
}

/**
 * Resolve pixel widths for ordered columns given container width.
 * Fixed numbers keep their value. `flex`, `auto`, and unset widths share the
 * remaining space so the grid fills the container (avoids a sparse matrix look).
 * When remaining space is 0, flexible columns fall back to `measured` or 120px.
 */
export function resolveColumnWidths(
  columns: ColumnDef[],
  containerWidth: number,
  order: ColumnId[],
  measured?: Record<ColumnId, number>,
): Record<ColumnId, number> {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const ordered = order
    .map((id) => byId.get(id))
    .filter((c): c is ColumnDef => c !== undefined);

  const result: Record<ColumnId, number> = {};
  let fixedTotal = 0;
  const flexCols: ColumnDef[] = [];

  for (const col of ordered) {
    const minW = col.minWidth ?? 40;
    const maxW = col.maxWidth ?? 2000;
    if (typeof col.width === "number") {
      const w = Math.max(minW, Math.min(maxW, col.width));
      result[col.id] = w;
      fixedTotal += w;
    } else {
      // flex | auto | undefined — share remaining space to fill the container
      flexCols.push(col);
    }
  }

  const remaining = Math.max(0, containerWidth - fixedTotal);
  if (flexCols.length > 0) {
    const each = remaining / flexCols.length;
    for (const col of flexCols) {
      const minW = col.minWidth ?? 40;
      const maxW = col.maxWidth ?? 2000;
      const fallback = measured?.[col.id] ?? DEFAULT_WIDTH;
      const w = each > 0 ? each : fallback;
      result[col.id] = Math.max(minW, Math.min(maxW, w));
    }
  }

  return result;
}
