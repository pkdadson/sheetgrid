import { createGridStore } from "@sheetgrid/core";
import { describe, expect, it } from "vitest";
import { createGridController } from "./create.js";

describe("controller snapshot/restore", () => {
  it("snapshot returns opaque state, restore round-trips", () => {
    const store = createGridStore({
      rows: [{ id: "r1", values: { n: 1 } }],
      columns: [{ id: "n", header: "N", type: "number" }],
    });
    const c = createGridController();
    c.__attach(store);
    c.setCell("r1", "n", 5);
    const snap = c.snapshot();
    c.setCell("r1", "n", 99);
    const res = c.restore(snap);
    expect(res.ok).toBe(true);
    expect(store.getCell("r1", "n")).toBe(5);
  });

  it("restore is undoable through history", () => {
    const store = createGridStore({
      rows: [{ id: "r1", values: { n: 1 } }],
      columns: [{ id: "n", header: "N", type: "number" }],
    });
    const c = createGridController();
    c.__attach(store);
    c.setCell("r1", "n", 5);
    const snap = c.snapshot();
    c.setCell("r1", "n", 99);
    c.restore(snap);
    expect(store.getCell("r1", "n")).toBe(5);
    c.undo();
    expect(store.getCell("r1", "n")).toBe(99);
  });
});
