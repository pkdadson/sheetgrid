import { describe, expect, it } from "vitest";
import { createInternalStore } from "../internal-store.js";
import { AddRowCommand } from "./add-row.js";

const src = { kind: "system", reason: "init" } as const;

function base() {
  return createInternalStore({
    rows: [
      { id: "a", values: { n: 1 } },
      { id: "b", values: { n: 2 } },
    ],
    columns: [{ id: "n", header: "N" }],
  });
}

describe("AddRowCommand", () => {
  it("appends at end by default with generated id", () => {
    const s = base();
    const cmd = new AddRowCommand({ n: 3 }, { at: "end" }, src);
    const res = cmd.apply(s);
    if (!res.ok) throw new Error();
    expect(s.getRowsRef().map((r) => r.id)).toEqual(["a", "b", expect.any(String)]);
    expect(s.getRowsRef()[2]!.values.n).toBe(3);
    // Inverse is DeleteRowCommand — removes the row we just added.
    res.inverse.apply(s);
    expect(s.getRowsRef().map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("inserts at explicit index", () => {
    const s = base();
    const res = new AddRowCommand({ n: 9 }, { at: 1 }, src).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getRowsRef().map((r) => r.values.n)).toEqual([1, 9, 2]);
  });

  it("uses provided id when supplied", () => {
    const s = base();
    const res = new AddRowCommand({ n: 5 }, { id: "custom", at: "end" }, src).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getRowsRef()[2]!.id).toBe("custom");
  });

  it("rejects duplicate id", () => {
    const s = base();
    const res = new AddRowCommand({ n: 5 }, { id: "a" }, src).apply(s);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.code).toBe("conflict");
  });

  it("emits row.added event with index", () => {
    const s = base();
    const res = new AddRowCommand({ n: 5 }, { id: "z", at: 0 }, src).apply(s);
    if (!res.ok) throw new Error();
    expect(res.events).toEqual([
      {
        type: "row.added",
        rowId: "z",
        index: 0,
        values: { n: 5 },
        source: src,
      },
    ]);
  });
});
