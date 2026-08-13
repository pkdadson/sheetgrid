import { describe, expect, it } from "vitest";
import { createGridStore } from "@sheetgrid/core";
import { createGridController } from "./create.js";

function fx() {
  return createGridStore({
    rows: [
      { id: "r1", values: { n: 1 } },
      { id: "r2", values: { n: 2 } },
    ],
    columns: [{ id: "n", header: "N", type: "number" }],
  });
}

describe("controller row CRUD", () => {
  it("addRow returns generated rowId", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    const res = c.addRow({ n: 3 });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error();
    expect(res.value.rowId).toMatch(/^row-/);
    expect(store.getRows()).toHaveLength(3);
  });

  it("addRow honours explicit id + position", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    const res = c.addRow({ n: 99 }, { id: "custom", at: 0 });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error();
    expect(res.value.rowId).toBe("custom");
    expect(store.getRows()[0]!.id).toBe("custom");
  });

  it("addRow reports conflict on duplicate id", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    const res = c.addRow({ n: 5 }, { id: "r1" });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.code).toBe("conflict");
  });

  it("updateRow merges patch", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    const res = c.updateRow("r1", { n: 100 });
    expect(res.ok).toBe(true);
    expect(store.getCell("r1", "n")).toBe(100);
  });

  it("deleteRow removes and is reversible via history", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    const res = c.deleteRow("r1");
    expect(res.ok).toBe(true);
    expect(store.getRows().map((r) => r.id)).toEqual(["r2"]);
    store.__history.undo();
    expect(store.getRows().map((r) => r.id)).toEqual(["r1", "r2"]);
  });

  it("moveRow moves and emits row.moved", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    let seen: any = null;
    c.on("row.moved", (e) => (seen = e));
    const res = c.moveRow("r1", 1);
    expect(res.ok).toBe(true);
    expect(store.getRows().map((r) => r.id)).toEqual(["r2", "r1"]);
    expect(seen).toMatchObject({ rowId: "r1", from: 0, to: 1 });
  });
});
