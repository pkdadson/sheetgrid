import type {
  CellCoord,
  CellRange,
  ColumnId,
  RowId,
  SelectionState,
} from "../types.js";

export function emptySelection(): SelectionState {
  return {
    active: null,
    ranges: [],
    rowIds: [],
    columnIds: [],
  };
}

export function createSelection(): SelectionState {
  return emptySelection();
}

function rangeFrom(a: CellCoord, b: CellCoord): CellRange {
  return { start: a, end: b };
}

export function selectCell(
  _state: SelectionState,
  coord: CellCoord,
): SelectionState {
  return {
    active: coord,
    ranges: [rangeFrom(coord, coord)],
    rowIds: [],
    columnIds: [],
  };
}

export function extendTo(
  state: SelectionState,
  coord: CellCoord,
): SelectionState {
  const anchor = state.active ?? coord;
  return {
    active: state.active ?? coord,
    ranges: [rangeFrom(anchor, coord)],
    rowIds: [],
    columnIds: [],
  };
}

export function toggleCell(
  state: SelectionState,
  coord: CellCoord,
): SelectionState {
  const existing = state.ranges.some(
    (r) =>
      r.start.rowId === coord.rowId &&
      r.start.columnId === coord.columnId &&
      r.end.rowId === coord.rowId &&
      r.end.columnId === coord.columnId,
  );
  if (existing) {
    const ranges = state.ranges.filter(
      (r) =>
        !(
          r.start.rowId === coord.rowId &&
          r.start.columnId === coord.columnId &&
          r.end.rowId === coord.rowId &&
          r.end.columnId === coord.columnId
        ),
    );
    return {
      active: coord,
      ranges,
      rowIds: [],
      columnIds: [],
    };
  }
  return {
    active: coord,
    ranges: [...state.ranges, rangeFrom(coord, coord)],
    rowIds: [],
    columnIds: [],
  };
}

export function selectRow(
  _state: SelectionState,
  rowId: RowId,
  _rowIds: RowId[],
  columnIds: ColumnId[],
): SelectionState {
  if (columnIds.length === 0) {
    return {
      active: null,
      ranges: [],
      rowIds: [rowId],
      columnIds: [],
    };
  }
  const start = { rowId, columnId: columnIds[0]! };
  const end = { rowId, columnId: columnIds[columnIds.length - 1]! };
  return {
    active: start,
    ranges: [rangeFrom(start, end)],
    rowIds: [rowId],
    columnIds: [],
  };
}

export function selectColumn(
  _state: SelectionState,
  columnId: ColumnId,
  rowIds: RowId[],
  _columnIds: ColumnId[],
): SelectionState {
  if (rowIds.length === 0) {
    return {
      active: null,
      ranges: [],
      rowIds: [],
      columnIds: [columnId],
    };
  }
  const start = { rowId: rowIds[0]!, columnId };
  const end = { rowId: rowIds[rowIds.length - 1]!, columnId };
  return {
    active: start,
    ranges: [rangeFrom(start, end)],
    rowIds: [],
    columnIds: [columnId],
  };
}

export function selectAll(
  rowIds: RowId[],
  columnIds: ColumnId[],
): SelectionState {
  if (rowIds.length === 0 || columnIds.length === 0) {
    return emptySelection();
  }
  const start = { rowId: rowIds[0]!, columnId: columnIds[0]! };
  const end = {
    rowId: rowIds[rowIds.length - 1]!,
    columnId: columnIds[columnIds.length - 1]!,
  };
  return {
    active: start,
    ranges: [rangeFrom(start, end)],
    rowIds: [...rowIds],
    columnIds: [...columnIds],
  };
}

export type Dir = "up" | "down" | "left" | "right" | "home" | "end";

export function moveActive(
  state: SelectionState,
  dir: Dir,
  rowIds: RowId[],
  columnIds: ColumnId[],
  opts?: { extend?: boolean },
): SelectionState {
  if (rowIds.length === 0 || columnIds.length === 0) {
    return state;
  }
  const active = state.active ?? {
    rowId: rowIds[0]!,
    columnId: columnIds[0]!,
  };
  let ri = rowIds.indexOf(active.rowId);
  let ci = columnIds.indexOf(active.columnId);
  if (ri < 0) ri = 0;
  if (ci < 0) ci = 0;

  switch (dir) {
    case "up":
      ri = Math.max(0, ri - 1);
      break;
    case "down":
      ri = Math.min(rowIds.length - 1, ri + 1);
      break;
    case "left":
      ci = Math.max(0, ci - 1);
      break;
    case "right":
      ci = Math.min(columnIds.length - 1, ci + 1);
      break;
    case "home":
      ci = 0;
      break;
    case "end":
      ci = columnIds.length - 1;
      break;
  }

  const next: CellCoord = {
    rowId: rowIds[ri]!,
    columnId: columnIds[ci]!,
  };

  if (opts?.extend) {
    return extendTo({ ...state, active: state.active ?? active }, next);
  }
  return selectCell(state, next);
}

function normalizeRangeIndices(
  range: CellRange,
  rowIndexOf: Map<RowId, number>,
  colIndexOf: Map<ColumnId, number>,
): { r0: number; r1: number; c0: number; c1: number } | null {
  const rs = rowIndexOf.get(range.start.rowId);
  const re = rowIndexOf.get(range.end.rowId);
  const cs = colIndexOf.get(range.start.columnId);
  const ce = colIndexOf.get(range.end.columnId);
  if (
    rs === undefined ||
    re === undefined ||
    cs === undefined ||
    ce === undefined
  ) {
    return null;
  }
  return {
    r0: Math.min(rs, re),
    r1: Math.max(rs, re),
    c0: Math.min(cs, ce),
    c1: Math.max(cs, ce),
  };
}

export function isCellSelected(
  state: SelectionState,
  coord: CellCoord,
  rowIndexOf: Map<RowId, number>,
  colIndexOf: Map<ColumnId, number>,
): boolean {
  if (state.rowIds.includes(coord.rowId)) return true;
  if (state.columnIds.includes(coord.columnId)) return true;
  const ri = rowIndexOf.get(coord.rowId);
  const ci = colIndexOf.get(coord.columnId);
  if (ri === undefined || ci === undefined) return false;
  for (const range of state.ranges) {
    const n = normalizeRangeIndices(range, rowIndexOf, colIndexOf);
    if (!n) continue;
    if (ri >= n.r0 && ri <= n.r1 && ci >= n.c0 && ci <= n.c1) {
      return true;
    }
  }
  return false;
}
