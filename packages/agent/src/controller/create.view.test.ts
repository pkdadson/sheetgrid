import { createGridStore } from "@sheetgrid/core";
import { describe, expect, it } from "vitest";
import { createGridController } from "./create.js";

function fx() {
  return createGridStore({
    rows: [
      { id: "r1", values: { a: 1, b: 0 } },
      { id: "r2", values: { a: 2, b: 0 } },
    ],
    columns: [
      { id: "a", header: "A", type: "number" },
      { id: "b", header: "B", type: "number" },
    ],
    formulas: true,
  });
}

describe("controller view state", () => {
  it("setSort persists sort state visible via getSchema", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    c.setSort([{ columnId: "a", direction: "desc" }]);
    expect(c.getSchema().sort).toEqual([{ columnId: "a", direction: "desc" }]);
  });

  it("clearSort empties it", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    c.setSort([{ columnId: "a", direction: "asc" }]);
    c.clearSort();
    expect(c.getSchema().sort).toEqual([]);
  });

  it("setFilter accepts leaf clause", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    c.setFilter({ column: "a", op: "gt", value: 1 });
    expect(c.getSchema().filter).toMatchObject({
      column: "a",
      op: "gt",
      value: 1,
    });
  });

  it("setFormula computes and getCell returns formula source", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    c.setFormula("r1", "b", "=A1*10");
    const cell = c.getCell("r1", "b");
    if (!cell.ok) throw new Error();
    expect(cell.value).toMatchObject({ value: 10, formula: "=A1*10" });
  });

  it("clearFormula removes formula", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    c.setFormula("r1", "b", "=A1");
    c.clearFormula("r1", "b");
    const cell = c.getCell("r1", "b");
    if (!cell.ok) throw new Error();
    expect(cell.value.formula).toBeUndefined();
  });
});
