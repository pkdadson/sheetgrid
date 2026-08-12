import { describe, expect, it } from "vitest";
import { createInternalStore } from "../internal-store.js";
import { DeleteRowCommand } from "./delete-row.js";

const src = { kind: "system", reason: "init" } as const;

function base() {
  return createInternalStore({
    rows: [
      { id: "a", values: { n: 1 } },
      { id: "b", values: { n: 2 } },
      { id: "c", values: { n: 3 } },
    ],
    columns: [{ id: "n", header: "N" }],
    formulas: true,
  });
}

describe("DeleteRowCommand", () => {
  it("removes row and inverse restores at original index with byte-identical values", () => {
    const s = base();
    const res = new DeleteRowCommand("b", src).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getRowsRef().map((r) => r.id)).toEqual(["a", "c"]);
    res.inverse.apply(s);
    expect(s.getRowsRef().map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(s.getRowsRef()[1]!.values.n).toBe(2);
  });

  it("captures and restores per-cell formulas on the deleted row", () => {
    const s = base();
    s.formulas.set("b", "n", "=A1+1");
    s.formulas.recalcAll();
    const res = new DeleteRowCommand("b", src).apply(s);
    if (!res.ok) throw new Error();
    expect(s.formulas.getRaw("b", "n")).toBeNull();
    res.inverse.apply(s);
    expect(s.formulas.getRaw("b", "n")).toBe("=A1+1");
  });

  it("emits row.removed event", () => {
    const s = base();
    const res = new DeleteRowCommand("a", src).apply(s);
    if (!res.ok) throw new Error();
    expect(res.events[0]).toMatchObject({
      type: "row.removed",
      rowId: "a",
      index: 0,
      values: { n: 1 },
    });
  });

  it("fails not_found on unknown row", () => {
    const s = base();
    const res = new DeleteRowCommand("z", src).apply(s);
    expect(res.ok).toBe(false);
  });
});
