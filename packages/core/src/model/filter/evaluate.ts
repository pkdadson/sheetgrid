import type { FilterClause, GridRow } from "../../types.js";

export function evaluateFilter(clause: FilterClause, row: GridRow): boolean {
  if ("and" in clause) return clause.and.every((c) => evaluateFilter(c, row));
  if ("or" in clause) return clause.or.some((c) => evaluateFilter(c, row));
  if ("not" in clause) return !evaluateFilter(clause.not, row);

  const v = row.values[clause.column];
  const target = clause.value;
  switch (clause.op) {
    case "eq":
      return Object.is(v, target);
    case "neq":
      return !Object.is(v, target);
    case "lt":
      return typeof v === "number" && typeof target === "number" && v < target;
    case "lte":
      return typeof v === "number" && typeof target === "number" && v <= target;
    case "gt":
      return typeof v === "number" && typeof target === "number" && v > target;
    case "gte":
      return typeof v === "number" && typeof target === "number" && v >= target;
    case "contains":
      return typeof v === "string" && typeof target === "string" && v.includes(target);
    case "starts_with":
      return typeof v === "string" && typeof target === "string" && v.startsWith(target);
    case "ends_with":
      return typeof v === "string" && typeof target === "string" && v.endsWith(target);
    case "in":
      return Array.isArray(target) && target.some((t) => Object.is(v, t));
    case "not_in":
      return Array.isArray(target) && !target.some((t) => Object.is(v, t));
    case "is_null":
      return v === null || v === undefined;
    case "is_not_null":
      return v !== null && v !== undefined;
    default: {
      const _exhaustive: never = clause.op;
      throw new Error(`unhandled filter op ${_exhaustive}`);
    }
  }
}

/** Returns the row ids visible under the given filter (or all if filter is null). */
export function filterRowIds(rows: GridRow[], filter: FilterClause | null): string[] {
  if (filter === null) return rows.map((r) => r.id);
  return rows.filter((r) => evaluateFilter(filter, r)).map((r) => r.id);
}
