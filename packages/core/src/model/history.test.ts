import { describe, expect, it } from "vitest";
import { createInternalStore } from "./internal-store.js";
import { History } from "./history.js";
import { SetCellCommand } from "./commands/set-cell.js";
import { CompoundCommand } from "./commands/compound.js";

const src = { kind: "system", reason: "init" } as const;

function fx() {
  const internal = createInternalStore({
    rows: [{ id: "r1", values: { a: 1 } }],
    columns: [{ id: "a", header: "A" }],
  });
  const history = new History(internal, { limit: 5 });
  return { internal, history };
}

describe("History", () => {
  it("dispatch, undo, redo restore values", () => {
    const { internal, history } = fx();
    history.dispatch(new SetCellCommand("r1", "a", 2, src));
    expect(internal.getRowsRef()[0]!.values.a).toBe(2);
    history.undo();
    expect(internal.getRowsRef()[0]!.values.a).toBe(1);
    history.redo();
    expect(internal.getRowsRef()[0]!.values.a).toBe(2);
  });

  it("new mutation clears redo stack", () => {
    const { internal, history } = fx();
    history.dispatch(new SetCellCommand("r1", "a", 2, src));
    history.dispatch(new SetCellCommand("r1", "a", 3, src));
    history.undo(); // a = 2
    history.dispatch(new SetCellCommand("r1", "a", 9, src));
    expect(history.canRedo()).toBe(false);
    expect(internal.getRowsRef()[0]!.values.a).toBe(9);
  });

  it("respects the limit by evicting oldest inverse", () => {
    const { internal, history } = fx();
    for (let i = 1; i <= 7; i++) {
      history.dispatch(new SetCellCommand("r1", "a", i, src));
    }
    // Limit = 5 → oldest two dropped; only 5 undos possible.
    let undone = 0;
    while (history.canUndo()) {
      history.undo();
      undone++;
    }
    expect(undone).toBe(5);
    // The two dropped mutations mean the earliest reachable value is 2 (from setting to 2).
    expect(internal.getRowsRef()[0]!.values.a).toBe(2);
  });

  it("does not push commands whose Command.history === 'skip'", () => {
    const { history } = fx();
    class NopSkip {
      kind = "nop";
      source = src;
      history = "skip" as const;
      apply() {
        return { ok: true as const, inverse: this, events: [] };
      }
    }
    history.dispatch(new NopSkip() as any);
    expect(history.canUndo()).toBe(false);
  });

  it("emits history.pushed / history.undone / history.redone events", () => {
    const { history } = fx();
    const seen: string[] = [];
    history.on((e) => seen.push(e.type));
    history.dispatch(new SetCellCommand("r1", "a", 2, src));
    history.undo();
    history.redo();
    expect(seen).toEqual(["history.pushed", "history.undone", "history.redone"]);
  });

  it("failure results are not pushed to history", () => {
    const { history } = fx();
    const res = history.dispatch(new SetCellCommand("missing", "a", 2, src));
    expect(res.ok).toBe(false);
    expect(history.canUndo()).toBe(false);
  });

  it("transaction commit groups multiple ops into a single undo", () => {
    const { internal, history } = fx();
    history.beginTransaction();
    history.dispatch(new SetCellCommand("r1", "a", 10, src));
    history.dispatch(new SetCellCommand("r1", "a", 20, src));
    history.commitTransaction((children) => new CompoundCommand(children, src));
    expect(internal.getRowsRef()[0]!.values.a).toBe(20);
    // Single undo reverses both.
    history.undo();
    expect(internal.getRowsRef()[0]!.values.a).toBe(1);
  });

  it("commitTransaction without beginTransaction throws", () => {
    const { history } = fx();
    expect(() => history.commitTransaction((c) => c[0]!)).toThrow(
      /without matching beginTransaction/,
    );
  });

  it("rollbackTransaction restores state and clears collected inverses", () => {
    const { internal, history } = fx();
    history.beginTransaction();
    history.dispatch(new SetCellCommand("r1", "a", 99, src));
    expect(internal.getRowsRef()[0]!.values.a).toBe(99);
    history.rollbackTransaction();
    expect(internal.getRowsRef()[0]!.values.a).toBe(1);
    expect(history.canUndo()).toBe(false);
  });
});
