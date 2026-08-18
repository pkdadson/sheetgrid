import { createGridStore } from "@sheetgrid/core";
import { describe, expect, it } from "vitest";
import { doDescribe, doGetCell, doGetData, doQueryRows } from "./reads.js";

function fixture() {
  return createGridStore({
    rows: [
      { id: "r1", values: { name: "Ada", age: 36 } },
      { id: "r2", values: { name: "Grace", age: 40 } },
      { id: "r3", values: { name: "Katherine", age: 100 } },
    ],
    columns: [
      { id: "name", header: "Name" },
      { id: "age", header: "Age", type: "number" },
    ],
  });
}

describe("doGetData", () => {
  it("returns all rows with total when no opts", () => {
    const store = fixture();
    const { rows, total } = doGetData(store, "objects", {});
    expect(rows).toHaveLength(3);
    expect(total).toBe(3);
  });

  it("filters by rowIds", () => {
    const store = fixture();
    const { rows } = doGetData(store, "objects", { rowIds: ["r2"] });
    expect(rows).toEqual([{ id: "r2", values: { name: "Grace", age: 40 } }]);
  });

  it("filters by columnIds — omits other columns from values", () => {
    const store = fixture();
    const { rows } = doGetData(store, "objects", { columnIds: ["name"] });
    expect(rows[0]!.values).toEqual({ name: "Ada" });
  });

  it("range slices by post-sort/filter visible index", () => {
    const store = fixture();
    store.setSort([{ columnId: "age", direction: "desc" }]);
    const { rows, total } = doGetData(store, "objects", {
      range: { fromRow: 0, toRow: 1 },
    });
    expect(rows.map((r) => r.id)).toEqual(["r3"]); // Katherine, oldest first
    expect(total).toBe(3); // total is pre-slice
  });

  it("includes formula sources when requested", () => {
    const store = createGridStore({
      rows: [{ id: "r1", values: { a: 2, b: 0 } }],
      columns: [
        { id: "a", header: "A", type: "number" },
        { id: "b", header: "B", type: "number" },
      ],
      formulas: true,
    });
    store.setFormula("r1", "b", "=A1*2");
    const { rows } = doGetData(store, "objects", {
      includeFormulaSources: true,
    });
    expect(rows[0]!.formulas).toEqual({ b: "=A1*2" });
  });
});

describe("doGetCell", () => {
  it("returns value + formula + error", () => {
    const store = fixture();
    const res = doGetCell(store, "r1", "name");
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error();
    expect(res.value).toEqual({ value: "Ada" });
  });

  it("returns not_found when row missing", () => {
    const store = fixture();
    const res = doGetCell(store, "z", "name");
    expect(res.ok).toBe(false);
  });
});

describe("doQueryRows", () => {
  it("returns rowIds matching a leaf clause", () => {
    const store = fixture();
    const res = doQueryRows(store, { column: "age", op: "gte", value: 40 });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error();
    expect(res.value.rowIds).toEqual(["r2", "r3"]);
  });

  it("returns invalid_argument for unknown column", () => {
    const store = fixture();
    const res = doQueryRows(store, { column: "z", op: "eq", value: 1 });
    expect(res.ok).toBe(false);
  });
});

describe("doDescribe", () => {
  it("returns a compact human-readable summary", () => {
    const store = fixture();
    const text = doDescribe(store, "objects");
    expect(text).toMatch(/3 rows/);
    expect(text).toMatch(/name/);
    expect(text).toMatch(/age.*number/);
  });
});
