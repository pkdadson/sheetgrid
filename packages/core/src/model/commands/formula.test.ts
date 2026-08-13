import { describe, expect, it } from "vitest";
import { createInternalStore } from "../internal-store.js";
import { SetFormulaCommand } from "./set-formula.js";
import { ClearFormulaCommand } from "./clear-formula.js";

const src = { kind: "system", reason: "init" } as const;

function fx() {
  return createInternalStore({
    rows: [
      { id: "r1", values: { a: 2, b: 3, c: null } },
    ],
    columns: [
      { id: "a", header: "A", type: "number" },
      { id: "b", header: "B", type: "number" },
      { id: "c", header: "C", type: "number" },
    ],
    formulas: true,
  });
}

describe("SetFormulaCommand", () => {
  it("sets formula, recalcs c=5, inverse clears it", () => {
    const s = fx();
    const res = new SetFormulaCommand("r1", "c", "=A1+B1", src).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getRowsRef()[0]!.values.c).toBe(5);
    res.inverse.apply(s);
    expect(s.formulas.getRaw("r1", "c")).toBeNull();
  });

  it("emits formula.changed event", () => {
    const s = fx();
    const res = new SetFormulaCommand("r1", "c", "=A1*2", src).apply(s);
    if (!res.ok) throw new Error();
    expect(res.events[0]).toMatchObject({
      type: "formula.changed",
      rowId: "r1",
      columnId: "c",
      prev: null,
      next: "=A1*2",
    });
  });

  it("fails with unsupported when formulas not enabled", () => {
    const s = createInternalStore({
      rows: [{ id: "r1", values: { a: 1 } }],
      columns: [{ id: "a", header: "A" }],
      formulas: false,
    });
    const res = new SetFormulaCommand("r1", "a", "=1", src).apply(s);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.code).toBe("unsupported");
  });
});

describe("ClearFormulaCommand", () => {
  it("clears and inverse re-sets the source", () => {
    const s = fx();
    new SetFormulaCommand("r1", "c", "=A1+B1", src).apply(s);
    const res = new ClearFormulaCommand("r1", "c", src).apply(s);
    if (!res.ok) throw new Error();
    expect(s.formulas.getRaw("r1", "c")).toBeNull();
    res.inverse.apply(s);
    expect(s.formulas.getRaw("r1", "c")).toBe("=A1+B1");
  });
});
