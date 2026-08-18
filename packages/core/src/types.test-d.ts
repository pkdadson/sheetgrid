import { expectTypeOf, test } from "vitest";
import type { FilterClause, FilterOp } from "./types.js";

test("FilterOp union covers common ops", () => {
  const op: FilterOp = "eq";
  expectTypeOf(op).toMatchTypeOf<FilterOp>();
  const ops: FilterOp[] = [
    "eq",
    "neq",
    "lt",
    "lte",
    "gt",
    "gte",
    "contains",
    "starts_with",
    "ends_with",
    "in",
    "not_in",
    "is_null",
    "is_not_null",
  ];
  expectTypeOf(ops).toMatchTypeOf<FilterOp[]>();
});

test("FilterClause supports leaf + and/or/not combinators", () => {
  const leaf: FilterClause = { column: "status", op: "eq", value: "open" };
  const and: FilterClause = { and: [leaf, leaf] };
  const or: FilterClause = { or: [leaf, and] };
  const not: FilterClause = { not: or };
  expectTypeOf(not).toMatchTypeOf<FilterClause>();
});
