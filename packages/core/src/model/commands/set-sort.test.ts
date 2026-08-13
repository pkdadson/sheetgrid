import { describe, expect, it } from "vitest";
import { createInternalStore } from "../internal-store.js";
import { SetSortCommand } from "./set-sort.js";

const src = { kind: "system", reason: "init" } as const;

describe("SetSortCommand", () => {
  it("stores sort state and inverse restores prev", () => {
    const s = createInternalStore({ rows: [], columns: [{ id: "a", header: "A" }] });
    const res = new SetSortCommand(
      [{ columnId: "a", direction: "desc" }],
      src,
    ).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getSortRef()).toEqual([{ columnId: "a", direction: "desc" }]);
    res.inverse.apply(s);
    expect(s.getSortRef()).toEqual([]);
  });

  it("rejects sort referencing unknown column", () => {
    const s = createInternalStore({ rows: [], columns: [{ id: "a", header: "A" }] });
    const res = new SetSortCommand(
      [{ columnId: "z", direction: "asc" }],
      src,
    ).apply(s);
    expect(res.ok).toBe(false);
  });

  it("emits sort.changed event", () => {
    const s = createInternalStore({ rows: [], columns: [{ id: "a", header: "A" }] });
    const res = new SetSortCommand([{ columnId: "a", direction: "asc" }], src).apply(s);
    if (!res.ok) throw new Error();
    expect(res.events[0]).toMatchObject({
      type: "sort.changed",
      prev: [],
      next: [{ columnId: "a", direction: "asc" }],
    });
  });
});
