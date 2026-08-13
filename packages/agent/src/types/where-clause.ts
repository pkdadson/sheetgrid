import type { FilterClause } from "@sheetgrid/core";

/**
 * Query DSL for `queryRows`. Reuses the same shape as `FilterClause` in core.
 * Kept as its own alias so we can extend it (e.g., add order/limit) without
 * touching the core filter semantics used for row visibility.
 */
export type WhereClause = FilterClause;
