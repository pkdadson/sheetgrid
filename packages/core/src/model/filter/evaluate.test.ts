import { describe, expect, it } from "vitest";
import type { FilterClause, GridRow } from "../../types.js";
import { evaluateFilter } from "./evaluate.js";

const row: GridRow = {
  id: "r1",
  values: { name: "Ada", age: 36, active: true, note: null },
};

describe("evaluateFilter", () => {
  it("evaluates eq / neq", () => {
    expect(
      evaluateFilter({ column: "name", op: "eq", value: "Ada" }, row),
    ).toBe(true);
    expect(
      evaluateFilter({ column: "name", op: "neq", value: "Ada" }, row),
    ).toBe(false);
  });

  it("evaluates numeric comparisons", () => {
    expect(evaluateFilter({ column: "age", op: "gt", value: 30 }, row)).toBe(
      true,
    );
    expect(evaluateFilter({ column: "age", op: "gte", value: 36 }, row)).toBe(
      true,
    );
    expect(evaluateFilter({ column: "age", op: "lt", value: 36 }, row)).toBe(
      false,
    );
    expect(evaluateFilter({ column: "age", op: "lte", value: 36 }, row)).toBe(
      true,
    );
  });

  it("evaluates string ops (case-sensitive)", () => {
    expect(
      evaluateFilter({ column: "name", op: "contains", value: "d" }, row),
    ).toBe(true);
    expect(
      evaluateFilter({ column: "name", op: "starts_with", value: "Ad" }, row),
    ).toBe(true);
    expect(
      evaluateFilter({ column: "name", op: "ends_with", value: "a" }, row),
    ).toBe(true);
  });

  it("evaluates in / not_in", () => {
    expect(
      evaluateFilter(
        { column: "name", op: "in", value: ["Ada", "Grace"] },
        row,
      ),
    ).toBe(true);
    expect(
      evaluateFilter({ column: "name", op: "not_in", value: ["Grace"] }, row),
    ).toBe(true);
  });

  it("evaluates is_null / is_not_null", () => {
    expect(evaluateFilter({ column: "note", op: "is_null" }, row)).toBe(true);
    expect(evaluateFilter({ column: "name", op: "is_not_null" }, row)).toBe(
      true,
    );
  });

  it("evaluates and / or / not", () => {
    const clause: FilterClause = {
      and: [
        { column: "age", op: "gte", value: 30 },
        {
          or: [
            { column: "name", op: "eq", value: "Ada" },
            { column: "active", op: "eq", value: false },
          ],
        },
      ],
    };
    expect(evaluateFilter(clause, row)).toBe(true);
    expect(evaluateFilter({ not: clause }, row)).toBe(false);
  });
});
