import { createGridStore } from "@sheetgrid/core";
import { describe, expect, it, vi } from "vitest";
import { createGridController } from "./create.js";

function fx() {
  return createGridStore({
    rows: [{ id: "r1", values: { n: 1 } }],
    columns: [{ id: "n", header: "N", type: "number" }],
  });
}

describe("controller history", () => {
  it("undo reverses last write, redo re-applies", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    c.setCell("r1", "n", 5);
    expect(store.getCell("r1", "n")).toBe(5);
    const undo = c.undo();
    expect(undo.ok).toBe(true);
    expect(store.getCell("r1", "n")).toBe(1);
    const redo = c.redo();
    expect(redo.ok).toBe(true);
    expect(store.getCell("r1", "n")).toBe(5);
  });

  it("undo returns not_found when stack empty", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    const res = c.undo();
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.code).toBe("not_found");
  });

  it("emits history.pushed / history.undone / history.redone events", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    const seen: string[] = [];
    c.on("*", (e) => seen.push(e.type));
    c.setCell("r1", "n", 5);
    c.undo();
    c.redo();
    expect(seen.filter((s) => s.startsWith("history."))).toEqual([
      "history.pushed",
      "history.undone",
      "history.redone",
    ]);
  });
});
