import { describe, expect, it } from "vitest";
import { createInternalStore } from "./internal-store.js";

describe("InternalStore sort/filter state", () => {
  it("has empty sort and null filter by default", () => {
    const s = createInternalStore({ rows: [], columns: [] });
    expect(s.getSortRef()).toEqual([]);
    expect(s.getFilterRef()).toBeNull();
  });

  it("holds sort/filter mutably via set methods", () => {
    const s = createInternalStore({ rows: [], columns: [] });
    s.setSort([{ columnId: "a", direction: "asc" }]);
    expect(s.getSortRef()).toEqual([{ columnId: "a", direction: "asc" }]);
    s.setFilter({ column: "a", op: "eq", value: 1 });
    expect(s.getFilterRef()).toMatchObject({ column: "a", op: "eq", value: 1 });
  });
});
