import { describe, expect, it } from "vitest";
import { RestoreCommand } from "./commands/restore.js";
import { SetCellCommand } from "./commands/set-cell.js";
import { History } from "./history.js";
import { createInternalStore } from "./internal-store.js";
import { applySnapshot, takeSnapshot } from "./snapshot.js";

const src = { kind: "system", reason: "init" } as const;

describe("takeSnapshot / applySnapshot", () => {
  it("round-trips rows, columns, order, and formulas", () => {
    const s = createInternalStore({
      rows: [
        { id: "r1", values: { a: 2, b: 3 } },
        { id: "r2", values: { a: 5, b: 7 } },
      ],
      columns: [
        { id: "a", header: "A", type: "number" },
        { id: "b", header: "B", type: "number" },
      ],
      formulas: true,
    });
    s.formulas.set("r1", "b", "=A1*2");
    s.formulas.recalcAll();

    const snap = takeSnapshot(s);
    // mutate
    s.setRows([{ id: "r1", values: { a: 99, b: 99 } }]);
    s.formulas.clear("r1", "b");
    // restore
    applySnapshot(s, snap);
    expect(s.getRowsRef()).toHaveLength(2);
    expect(s.getRowsRef()[0]!.values.a).toBe(2);
    expect(s.formulas.getRaw("r1", "b")).toBe("=A1*2");
  });
});

describe("RestoreCommand", () => {
  it("clears history stacks and pushes single restore entry", () => {
    const internal = createInternalStore({
      rows: [{ id: "r1", values: { a: 1 } }],
      columns: [{ id: "a", header: "A" }],
    });
    const history = new History(internal);
    history.dispatch(new SetCellCommand("r1", "a", 2, src));
    const snap = takeSnapshot(internal);
    history.dispatch(new SetCellCommand("r1", "a", 3, src));
    history.dispatch(new RestoreCommand(snap, src));
    expect(internal.getRowsRef()[0]!.values.a).toBe(2);
    // Now undoing once should get us back to the pre-restore state (a=3).
    history.undo();
    expect(internal.getRowsRef()[0]!.values.a).toBe(3);
  });
});
