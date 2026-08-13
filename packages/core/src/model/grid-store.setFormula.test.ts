import { describe, expect, it } from "vitest";
import { createGridStore } from "./grid-store.js";

describe("setFormula on formulas-disabled store", () => {
  it("returns false without dispatching", () => {
    const store = createGridStore({
      rows: [{ id: "r1", values: { a: 1 } }],
      columns: [{ id: "a", header: "A" }],
      formulas: false,
    });
    expect(store.setFormula("r1", "a", "=A1")).toBe(false);
    // Undo stack should be untouched.
    expect(store.__history.canUndo()).toBe(false);
  });

  it("returns false for empty string on disabled store (parity with previous impl)", () => {
    const store = createGridStore({
      rows: [{ id: "r1", values: { a: 1 } }],
      columns: [{ id: "a", header: "A" }],
      formulas: false,
    });
    expect(store.setFormula("r1", "a", "")).toBe(false);
  });
});
