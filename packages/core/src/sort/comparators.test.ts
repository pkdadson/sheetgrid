import { describe, expect, it } from "vitest";
import type { GridRow, SortDirection } from "../types.js";
import { pickDefaultComparator, withNullsLast } from "./comparators.js";

const dummyRow: GridRow = { id: "x", values: {} };
const ctx = (direction: SortDirection) => ({
  rowA: dummyRow,
  rowB: dummyRow,
  direction,
});

describe("withNullsLast", () => {
  it("sorts null/undefined last regardless of direction", () => {
    const cmp = withNullsLast(
      (a: unknown, b: unknown) => (a as number) - (b as number),
    );
    expect(cmp(1, null, ctx("asc"))).toBeLessThan(0);
    expect(cmp(null, 1, ctx("asc"))).toBeGreaterThan(0);
    expect(cmp(1, null, ctx("desc"))).toBeLessThan(0);
    expect(cmp(null, 1, ctx("desc"))).toBeGreaterThan(0);
    expect(cmp(null, null, ctx("asc"))).toBe(0);
    expect(cmp(undefined, 1, ctx("asc"))).toBeGreaterThan(0);
  });

  it("delegates non-null values to inner comparator", () => {
    const cmp = withNullsLast(
      (a: unknown, b: unknown) => (a as number) - (b as number),
    );
    expect(cmp(1, 2, ctx("asc"))).toBeLessThan(0);
    expect(cmp(3, 2, ctx("asc"))).toBeGreaterThan(0);
  });
});

describe("pickDefaultComparator", () => {
  it("returns numeric comparator for type=number", () => {
    const cmp = pickDefaultComparator("number");
    expect(cmp(10, 2, ctx("asc"))).toBeGreaterThan(0);
  });

  it("treats NaN as null (sorts last)", () => {
    const cmp = pickDefaultComparator("number");
    expect(cmp(Number.NaN, 1, ctx("asc"))).toBeGreaterThan(0);
    expect(cmp(1, Number.NaN, ctx("asc"))).toBeLessThan(0);
  });

  it("returns boolean comparator (false < true) for type=boolean", () => {
    const cmp = pickDefaultComparator("boolean");
    expect(cmp(false, true, ctx("asc"))).toBeLessThan(0);
    expect(cmp(true, false, ctx("asc"))).toBeGreaterThan(0);
    expect(cmp(true, true, ctx("asc"))).toBe(0);
  });

  it("returns locale-aware string comparator for type=text and default", () => {
    const cmp = pickDefaultComparator("text");
    expect(cmp("banana", "apple", ctx("asc"))).toBeGreaterThan(0);
    expect(cmp("apple", "banana", ctx("asc"))).toBeLessThan(0);
    // numeric-aware: "9" < "10"
    expect(cmp("9", "10", ctx("asc"))).toBeLessThan(0);
  });

  it("returns string comparator for select and unknown types", () => {
    const cmpSelect = pickDefaultComparator("select");
    expect(cmpSelect("b", "a", ctx("asc"))).toBeGreaterThan(0);
    const cmpUnknown = pickDefaultComparator(undefined);
    expect(cmpUnknown("b", "a", ctx("asc"))).toBeGreaterThan(0);
  });
});
