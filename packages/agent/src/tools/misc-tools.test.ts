import { createGridStore } from "@sheetgrid/core";
import { describe, expect, it } from "vitest";
import { createGridController } from "../controller/create.js";
import { describeGridTools } from "./index.js";

function fx() {
  const store = createGridStore({
    rows: [{ id: "r1", values: { a: 1, b: 0 } }],
    columns: [
      { id: "a", header: "A", type: "number" },
      { id: "b", header: "B", type: "number" },
    ],
    formulas: true,
  });
  const c = createGridController();
  c.__attach(store);
  return { c, store };
}

describe("view + formula + history tools", () => {
  it("grid_set_sort + grid_clear_sort", async () => {
    const { c } = fx();
    const t = describeGridTools(c);
    await t
      .find((x) => x.name === "grid_set_sort")!
      .execute({
        specs: [{ columnId: "a", direction: "desc" }],
      });
    expect(c.getSchema().sort).toEqual([{ columnId: "a", direction: "desc" }]);
    await t.find((x) => x.name === "grid_clear_sort")!.execute({});
    expect(c.getSchema().sort).toEqual([]);
  });

  it("grid_set_filter", async () => {
    const { c } = fx();
    const t = describeGridTools(c).find((x) => x.name === "grid_set_filter")!;
    await t.execute({ filter: { column: "a", op: "gt", value: 0 } });
    expect(c.getSchema().filter).toMatchObject({
      column: "a",
      op: "gt",
      value: 0,
    });
    await t.execute({ filter: null });
    expect(c.getSchema().filter).toBeNull();
  });

  it("grid_select", async () => {
    const { c } = fx();
    const t = describeGridTools(c).find((x) => x.name === "grid_select")!;
    await t.execute({ target: { rowId: "r1", columnId: "a" } });
    expect(c.getSelection().active).toEqual({ rowId: "r1", columnId: "a" });
  });

  it("grid_set_formula + grid_clear_formula", async () => {
    const { c, store } = fx();
    const t = describeGridTools(c);
    await t
      .find((x) => x.name === "grid_set_formula")!
      .execute({
        rowId: "r1",
        columnId: "b",
        source: "=A1*2",
      });
    expect(store.getCell("r1", "b")).toBe(2);
    await t
      .find((x) => x.name === "grid_clear_formula")!
      .execute({
        rowId: "r1",
        columnId: "b",
      });
    expect(store.getFormula("r1", "b")).toBeNull();
  });

  it("grid_undo + grid_redo", async () => {
    const { c, store } = fx();
    const t = describeGridTools(c);
    await t
      .find((x) => x.name === "grid_set_cell")!
      .execute({ rowId: "r1", columnId: "a", value: 5 });
    await t.find((x) => x.name === "grid_undo")!.execute({});
    expect(store.getCell("r1", "a")).toBe(1);
    await t.find((x) => x.name === "grid_redo")!.execute({});
    expect(store.getCell("r1", "a")).toBe(5);
  });

  it("grid_snapshot + grid_restore round-trip", async () => {
    const { c, store } = fx();
    const t = describeGridTools(c);
    await t
      .find((x) => x.name === "grid_set_cell")!
      .execute({ rowId: "r1", columnId: "a", value: 5 });
    const snapRes = await t
      .find((x) => x.name === "grid_snapshot")!
      .execute({});
    expect(snapRes.ok).toBe(true);
    if (!snapRes.ok) throw new Error();
    await t
      .find((x) => x.name === "grid_set_cell")!
      .execute({ rowId: "r1", columnId: "a", value: 99 });
    await t
      .find((x) => x.name === "grid_restore")!
      .execute({ snapshot: snapRes.value });
    expect(store.getCell("r1", "a")).toBe(5);
  });
});
