import { describe, expect, it } from "vitest";
import { createGridStore } from "./grid-store.js";

describe("GridStore v2 CRUD + sort/filter", () => {
  it("addRow, updateRow, deleteRow with undo/redo", () => {
    const store = createGridStore({
      rows: [{ id: "r1", values: { n: 1 } }],
      columns: [{ id: "n", header: "N", type: "number" }],
    });
    const addRes = store.addRow({ n: 2 }, { id: "r2", at: "end" });
    expect(addRes.ok).toBe(true);
    expect(store.getRows().map((r) => r.id)).toEqual(["r1", "r2"]);

    store.updateRow("r2", { n: 22 });
    expect(store.getCell("r2", "n")).toBe(22);

    store.deleteRow("r2");
    expect(store.getRows().map((r) => r.id)).toEqual(["r1"]);

    // Undo delete → update → add.
    store.__history.undo();
    expect(store.getRows().map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(store.getCell("r2", "n")).toBe(22);
    store.__history.undo();
    expect(store.getCell("r2", "n")).toBe(2);
    store.__history.undo();
    expect(store.getRows().map((r) => r.id)).toEqual(["r1"]);
  });

  it("addColumn, updateColumn, deleteColumn", () => {
    const store = createGridStore({
      rows: [{ id: "r1", values: { a: 1 } }],
      columns: [{ id: "a", header: "A" }],
    });
    store.addColumn({ id: "b", header: "B" }, { at: "end" });
    expect(store.getColumns().map((c) => c.id)).toEqual(["a", "b"]);
    store.updateColumn("b", { header: "Bee" });
    expect(store.getColumns().find((c) => c.id === "b")!.header).toBe("Bee");
    store.deleteColumn("a");
    expect(store.getColumns().map((c) => c.id)).toEqual(["b"]);
  });

  it("setSort + getSort + inverse", () => {
    const store = createGridStore({
      rows: [],
      columns: [{ id: "a", header: "A" }],
    });
    expect(store.getSort()).toEqual([]);
    store.setSort([{ columnId: "a", direction: "asc" }]);
    expect(store.getSort()).toEqual([{ columnId: "a", direction: "asc" }]);
    store.clearSort();
    expect(store.getSort()).toEqual([]);
    store.__history.undo(); // undo clearSort → asc again
    expect(store.getSort()).toEqual([{ columnId: "a", direction: "asc" }]);
  });

  it("setFilter + getFilter + inverse", () => {
    const store = createGridStore({
      rows: [],
      columns: [{ id: "a", header: "A" }],
    });
    expect(store.getFilter()).toBeNull();
    store.setFilter({ column: "a", op: "eq", value: 1 });
    expect(store.getFilter()).toMatchObject({ column: "a", op: "eq", value: 1 });
    store.clearFilter();
    expect(store.getFilter()).toBeNull();
  });
});
