import type { ColumnGroupDef, ColumnId, GridRow, RowId } from "../types.js";

export type VisibleRow =
  | { type: "body"; rowId: RowId; row: GridRow }
  | {
      type: "group";
      key: string;
      groupId: string;
      field: ColumnId;
      value: unknown;
      depth: number;
      count: number;
      expanded: boolean;
    };

export interface BuildVisibleRowsOpts {
  groupBy: ColumnId[];
}

function groupKey(field: ColumnId, value: unknown): string {
  return `${field}:${String(value)}`;
}

function countLeaves(rows: GridRow[]): number {
  return rows.length;
}

function buildLevel(
  rows: GridRow[],
  groupBy: ColumnId[],
  depth: number,
  expandState: Record<string, boolean>,
  out: VisibleRow[],
): void {
  if (groupBy.length === 0 || depth >= groupBy.length) {
    for (const row of rows) {
      out.push({ type: "body", rowId: row.id, row });
    }
    return;
  }

  const field = groupBy[depth]!;
  const buckets = new Map<string, { value: unknown; rows: GridRow[] }>();
  for (const row of rows) {
    const value = row.values[field];
    const key = groupKey(field, value);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { value, rows: [] };
      buckets.set(key, bucket);
    }
    bucket.rows.push(row);
  }

  for (const [key, bucket] of buckets) {
    const expanded = expandState[key] !== false; // default true
    out.push({
      type: "group",
      key,
      groupId: key,
      field,
      value: bucket.value,
      depth,
      count: countLeaves(bucket.rows),
      expanded,
    });
    if (expanded) {
      buildLevel(bucket.rows, groupBy, depth + 1, expandState, out);
    }
  }
}

export function buildVisibleRows(
  rows: GridRow[],
  opts: BuildVisibleRowsOpts,
  expandState: Record<string, boolean>,
): VisibleRow[] {
  const out: VisibleRow[] = [];
  buildLevel(rows, opts.groupBy, 0, expandState, out);
  return out;
}

export interface HeaderCellSpan {
  id: string;
  header: string;
  colSpan: number;
  columnIds: ColumnId[];
}

export interface FlattenColumnGroupsOptions {
  /** Display labels for leaf columns (defaults to column id). */
  leafHeaders?: Record<ColumnId, string>;
}

/**
 * Flatten column groups into header levels with colSpan for leaf order.
 * Last level is always leaves; earlier levels are group bands.
 */
export function flattenColumnGroups(
  groups: ColumnGroupDef[],
  leafOrder: ColumnId[],
  options: FlattenColumnGroupsOptions = {},
): HeaderCellSpan[][] {
  const leafHeaders = options.leafHeaders ?? {};
  const leafLabel = (id: ColumnId) => leafHeaders[id] ?? id;

  if (groups.length === 0) {
    return [
      leafOrder.map((id) => ({
        id,
        header: leafLabel(id),
        colSpan: 1,
        columnIds: [id],
      })),
    ];
  }

  const groupById = new Map(groups.map((g) => [g.id, g]));

  function leafIdsUnder(nodeId: string, seen = new Set<string>()): ColumnId[] {
    if (seen.has(nodeId)) return [];
    seen.add(nodeId);
    const group = groupById.get(nodeId);
    if (!group) {
      return leafOrder.includes(nodeId) ? [nodeId] : [];
    }
    return group.children.flatMap((c) => leafIdsUnder(c, seen));
  }

  // Top-level: groups whose id is not a child of another group, plus ungrouped leaves
  const childIds = new Set(groups.flatMap((g) => g.children));
  const top: string[] = [
    ...groups.filter((g) => !childIds.has(g.id)).map((g) => g.id),
    ...leafOrder.filter((id) => !childIds.has(id) && !groupById.has(id)),
  ];

  // Order top by first leaf position in leafOrder
  top.sort((a, b) => {
    const la = leafIdsUnder(a)[0];
    const lb = leafIdsUnder(b)[0];
    return leafOrder.indexOf(la ?? "") - leafOrder.indexOf(lb ?? "");
  });

  const level0: HeaderCellSpan[] = top.map((id) => {
    const leaves = leafIdsUnder(id).filter((l) => leafOrder.includes(l));
    leaves.sort((a, b) => leafOrder.indexOf(a) - leafOrder.indexOf(b));
    const group = groupById.get(id);
    return {
      id,
      header: group?.header ?? leafLabel(id),
      colSpan: Math.max(1, leaves.length),
      columnIds: leaves.length ? leaves : [id],
    };
  });

  const level1: HeaderCellSpan[] = leafOrder.map((id) => ({
    id,
    header: leafLabel(id),
    colSpan: 1,
    columnIds: [id],
  }));

  return [level0, level1];
}
