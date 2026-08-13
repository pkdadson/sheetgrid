import { describe, expect, it } from "vitest";
import { createGridStore } from "@sheetgrid/core";
import { createGridController } from "./create.js";

describe("controller queue drain", () => {
  it("enqueues writes when detached, replays on attach", () => {
    const c = createGridController();
    expect(c.isAttached()).toBe(false);
    c.__enqueue({ type: "grid.set_cell", rowId: "r1", columnId: "n", value: 5 });
    const store = createGridStore({
      rows: [{ id: "r1", values: { n: 1 } }],
      columns: [{ id: "n", header: "N", type: "number" }],
    });
    c.__attach(store);
    // Drain runs synchronously on attach.
    expect(store.getCell("r1", "n")).toBe(5);
  });
});
