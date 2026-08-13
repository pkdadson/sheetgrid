import { describe, expect, it } from "vitest";
import { createInternalStore } from "../internal-store.js";
import { AddColumnCommand } from "./add-column.js";
import { DeleteColumnCommand } from "./delete-column.js";

const src = { kind: "system", reason: "init" } as const;

function base() {
  return createInternalStore({
    rows: [
      { id: "r1", values: { a: 1, b: 2 } },
      { id: "r2", values: { a: 3, b: 4 } },
    ],
    columns: [
      { id: "a", header: "A" },
      { id: "b", header: "B" },
    ],
    formulas: true,
  });
}

describe("AddColumnCommand", () => {
  it("appends column at end by default with column id in columnOrder", () => {
    const s = base();
    const res = new AddColumnCommand(
      { id: "c", header: "C" },
      { at: "end" },
      src,
    ).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getColumnsRef().map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(s.getColumnOrderRef()).toEqual(["a", "b", "c"]);
    res.inverse.apply(s);
    expect(s.getColumnsRef().map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("inserts at explicit index in columnOrder", () => {
    const s = base();
    new AddColumnCommand({ id: "c", header: "C" }, { at: 0 }, src).apply(s);
    expect(s.getColumnOrderRef()).toEqual(["c", "a", "b"]);
  });

  it("rejects duplicate column id", () => {
    const s = base();
    const res = new AddColumnCommand({ id: "a", header: "dup" }, {}, src).apply(s);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.code).toBe("conflict");
  });

  it("emits column.added event", () => {
    const s = base();
    const res = new AddColumnCommand({ id: "c", header: "C" }, { at: 1 }, src).apply(s);
    if (!res.ok) throw new Error();
    expect(res.events[0]).toMatchObject({
      type: "column.added",
      columnId: "c",
      index: 1,
    });
  });
});

describe("DeleteColumnCommand", () => {
  it("removes column def + order entry, inverse restores at original position with values preserved", () => {
    const s = base();
    const res = new DeleteColumnCommand("b", src).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getColumnsRef().map((c) => c.id)).toEqual(["a"]);
    expect(s.getColumnOrderRef()).toEqual(["a"]);
    // Row values for `b` are preserved in the row map (not deleted).
    res.inverse.apply(s);
    expect(s.getColumnsRef().map((c) => c.id)).toEqual(["a", "b"]);
    expect(s.getColumnOrderRef()).toEqual(["a", "b"]);
    expect(s.getRowsRef()[0]!.values.b).toBe(2);
  });

  it("captures and restores formulas on the deleted column", () => {
    const s = base();
    s.formulas.set("r1", "b", "=A1*2");
    s.formulas.recalcAll();
    const res = new DeleteColumnCommand("b", src).apply(s);
    if (!res.ok) throw new Error();
    expect(s.formulas.getRaw("r1", "b")).toBeNull();
    res.inverse.apply(s);
    expect(s.formulas.getRaw("r1", "b")).toBe("=A1*2");
  });

  it("fails not_found on unknown column", () => {
    const s = base();
    const res = new DeleteColumnCommand("z", src).apply(s);
    expect(res.ok).toBe(false);
  });
});
