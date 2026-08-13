import { describe, expect, it } from "vitest";
import { createGridStore } from "@sheetgrid/core";
import { createGridController } from "./create.js";

function fx() {
  return createGridStore({
    rows: [{ id: "r1", values: { a: 1, b: 2 } }],
    columns: [
      { id: "a", header: "A" },
      { id: "b", header: "B" },
    ],
  });
}

describe("controller column CRUD", () => {
  it("addColumn appends and shows in schema", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    const res = c.addColumn({ id: "c", header: "C" });
    expect(res.ok).toBe(true);
    expect(c.getSchema().columns.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("updateColumn changes header", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    c.updateColumn("a", { header: "Alpha" });
    expect(store.getColumns().find((x) => x.id === "a")!.header).toBe("Alpha");
  });

  it("deleteColumn removes column and is undoable", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    c.deleteColumn("a");
    expect(store.getColumns().map((x) => x.id)).toEqual(["b"]);
    store.__history.undo();
    expect(store.getColumns().map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("moveColumn changes columnOrder", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    c.moveColumn("a", 1);
    expect(store.getColumnOrder()).toEqual(["b", "a"]);
  });
});
