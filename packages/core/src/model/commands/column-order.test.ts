import { describe, expect, it } from "vitest";
import { createInternalStore } from "../internal-store.js";
import { MoveColumnCommand } from "./move-column.js";
import { SwapColumnsCommand } from "./swap-columns.js";
import { SetColumnOrderCommand } from "./set-column-order.js";

const src = { kind: "system", reason: "init" } as const;

function base() {
  return createInternalStore({
    rows: [],
    columns: [
      { id: "a", header: "A" },
      { id: "b", header: "B" },
      { id: "c", header: "C" },
    ],
  });
}

describe("MoveColumnCommand", () => {
  it("moves and inverse restores", () => {
    const s = base();
    const res = new MoveColumnCommand("a", 2, src).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getColumnOrderRef()).toEqual(["b", "c", "a"]);
    res.inverse.apply(s);
    expect(s.getColumnOrderRef()).toEqual(["a", "b", "c"]);
  });

  it("no-op when from === toIndex returns empty events", () => {
    const s = base();
    const res = new MoveColumnCommand("b", 1, src).apply(s);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error();
    expect(res.events).toEqual([]);
    expect(s.getColumnOrderRef()).toEqual(["a", "b", "c"]);
  });
});

describe("SwapColumnsCommand", () => {
  it("swaps and is its own inverse", () => {
    const s = base();
    const res = new SwapColumnsCommand("a", "c", src).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getColumnOrderRef()).toEqual(["c", "b", "a"]);
    res.inverse.apply(s);
    expect(s.getColumnOrderRef()).toEqual(["a", "b", "c"]);
  });
});

describe("SetColumnOrderCommand", () => {
  it("replaces order and inverse restores prev", () => {
    const s = base();
    const res = new SetColumnOrderCommand(["c", "a", "b"], src).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getColumnOrderRef()).toEqual(["c", "a", "b"]);
    res.inverse.apply(s);
    expect(s.getColumnOrderRef()).toEqual(["a", "b", "c"]);
  });

  it("fails with invalid_argument when order contains unknown id", () => {
    const s = base();
    const res = new SetColumnOrderCommand(["a", "zz"], src).apply(s);
    expect(res.ok).toBe(false);
  });

  it("fails with invalid_argument when order length differs from columns", () => {
    const s = base();
    const res = new SetColumnOrderCommand(["a", "b"], src).apply(s);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.code).toBe("invalid_argument");
  });

  it("fails with invalid_argument on duplicate ids", () => {
    const s = base();
    const res = new SetColumnOrderCommand(["a", "b", "a"], src).apply(s);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.code).toBe("invalid_argument");
  });
});
