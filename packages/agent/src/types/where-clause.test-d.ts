import { expectTypeOf, test } from "vitest";
import type { WhereClause } from "./where-clause.js";

test("WhereClause is the same shape as FilterClause", () => {
  const leaf: WhereClause = { column: "status", op: "eq", value: "open" };
  const and: WhereClause = { and: [leaf, leaf] };
  expectTypeOf(and).toMatchTypeOf<WhereClause>();
});
