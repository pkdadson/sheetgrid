import { describe, expect, it } from "vitest";
import { createInternalStore } from "../internal-store.js";
import { SetCellCommand } from "./set-cell.js";

const sysSource = { kind: "system", reason: "init" } as const;

function baseStore() {
  return createInternalStore({
    rows: [
      { id: "r1", values: { name: "Ada", age: 36 } },
      { id: "r2", values: { name: "Grace", age: 40 } },
    ],
    columns: [
      { id: "name", header: "Name" },
      { id: "age", header: "Age", type: "number" },
    ],
  });
}

describe("SetCellCommand", () => {
  it("applies the new value and returns an inverse that restores the prev", () => {
    const s = baseStore();
    const cmd = new SetCellCommand("r1", "age", 37, sysSource);
    const res = cmd.apply(s);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(s.getRowsRef()[0]!.values.age).toBe(37);

    const rev = res.inverse.apply(s);
    expect(rev.ok).toBe(true);
    expect(s.getRowsRef()[0]!.values.age).toBe(36);
  });

  it("emits cell.changed event with prev and next", () => {
    const s = baseStore();
    const cmd = new SetCellCommand("r1", "name", "Ada Lovelace", sysSource);
    const res = cmd.apply(s);
    if (!res.ok) throw new Error("expected ok");
    expect(res.events).toEqual([
      {
        type: "cell.changed",
        rowId: "r1",
        columnId: "name",
        prev: "Ada",
        next: "Ada Lovelace",
        source: sysSource,
      },
    ]);
  });

  it("fails with not_found when row does not exist", () => {
    const s = baseStore();
    const res = new SetCellCommand("missing", "name", "x", sysSource).apply(s);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected fail");
    expect(res.code).toBe("not_found");
  });

  it("does not mutate other cells", () => {
    const s = baseStore();
    new SetCellCommand("r1", "age", 99, sysSource).apply(s);
    expect(s.getRowsRef()[1]!.values.age).toBe(40);
    expect(s.getRowsRef()[0]!.values.name).toBe("Ada");
  });
});
