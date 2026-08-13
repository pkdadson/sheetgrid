import { describe, expect, it } from "vitest";
import { createInternalStore } from "../internal-store.js";
import { MoveRowCommand } from "./move-row.js";
import { SwapRowsCommand } from "./swap-rows.js";

const src = { kind: "system", reason: "init" } as const;

function threeRow() {
  return createInternalStore({
    rows: [
      { id: "a", values: { n: 1 } },
      { id: "b", values: { n: 2 } },
      { id: "c", values: { n: 3 } },
    ],
    columns: [{ id: "n", header: "N", type: "number" }],
  });
}

describe("MoveRowCommand", () => {
  it("moves and inverse restores original index", () => {
    const s = threeRow();
    const cmd = new MoveRowCommand("a", 2, src);
    const res = cmd.apply(s);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error();
    expect(s.getRowsRef().map((r) => r.id)).toEqual(["b", "c", "a"]);
    res.inverse.apply(s);
    expect(s.getRowsRef().map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("emits row.moved event with from/to indices", () => {
    const s = threeRow();
    const res = new MoveRowCommand("c", 0, src).apply(s);
    if (!res.ok) throw new Error();
    expect(res.events).toEqual([
      { type: "row.moved", rowId: "c", from: 2, to: 0, source: src },
    ]);
  });

  it("fails with not_found on unknown row", () => {
    const s = threeRow();
    const res = new MoveRowCommand("z", 0, src).apply(s);
    expect(res.ok).toBe(false);
  });
});

describe("SwapRowsCommand", () => {
  it("swaps and inverse restores", () => {
    const s = threeRow();
    const res = new SwapRowsCommand("a", "c", src).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getRowsRef().map((r) => r.id)).toEqual(["c", "b", "a"]);
    res.inverse.apply(s);
    expect(s.getRowsRef().map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
});
