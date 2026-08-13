import { describe, expect, it } from "vitest";
import { createGridStore } from "./grid-store.js";

describe("GridStore undo/redo via __history", () => {
  it("undoes and redoes cell edits", () => {
    const store = createGridStore({
      rows: [{ id: "r1", values: { a: 1 } }],
      columns: [{ id: "a", header: "A" }],
    });
    store.setCell("r1", "a", 5, "edit");
    expect(store.getCell("r1", "a")).toBe(5);
    store.__history.undo();
    expect(store.getCell("r1", "a")).toBe(1);
    store.__history.redo();
    expect(store.getCell("r1", "a")).toBe(5);
  });

  it("undoes row moves and formula changes", () => {
    const store = createGridStore({
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
    store.moveRow("r1", 1);
    expect(store.getRows().map((r) => r.id)).toEqual(["r2", "r1"]);
    store.setFormula("r1", "b", "=A2");
    expect(store.getCell("r1", "b")).toBe(1);
    store.__history.undo(); // undo formula
    expect(store.getFormula("r1", "b")).toBeNull();
    store.__history.undo(); // undo move
    expect(store.getRows().map((r) => r.id)).toEqual(["r1", "r2"]);
  });

  it("snapshot + restore round-trips through public API", () => {
    const store = createGridStore({
      rows: [{ id: "r1", values: { a: 1 } }],
      columns: [{ id: "a", header: "A" }],
    });
    store.setCell("r1", "a", 2, "edit");
    const snap = store.__takeSnapshot();
    store.setCell("r1", "a", 99, "edit");
    store.__restore(snap);
    expect(store.getCell("r1", "a")).toBe(2);
    // Restore is itself undoable.
    store.__history.undo();
    expect(store.getCell("r1", "a")).toBe(99);
  });
});
