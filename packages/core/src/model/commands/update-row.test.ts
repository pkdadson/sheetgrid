import { describe, expect, it } from "vitest";
import { createInternalStore } from "../internal-store.js";
import { UpdateRowCommand } from "./update-row.js";

const src = { kind: "system", reason: "init" } as const;

function base() {
  return createInternalStore({
    rows: [{ id: "a", values: { name: "Ada", age: 36 } }],
    columns: [
      { id: "name", header: "Name" },
      { id: "age", header: "Age", type: "number" },
    ],
  });
}

describe("UpdateRowCommand", () => {
  it("merges patch and inverse restores original values (only patched keys)", () => {
    const s = base();
    const res = new UpdateRowCommand("a", { age: 37 }, src).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getRowsRef()[0]!.values).toEqual({ name: "Ada", age: 37 });
    res.inverse.apply(s);
    expect(s.getRowsRef()[0]!.values).toEqual({ name: "Ada", age: 36 });
  });

  it("emits row.updated event with prev and patch", () => {
    const s = base();
    const res = new UpdateRowCommand("a", { name: "Ada L", age: 100 }, src).apply(s);
    if (!res.ok) throw new Error();
    expect(res.events[0]).toMatchObject({
      type: "row.updated",
      rowId: "a",
      patch: { name: "Ada L", age: 100 },
      prev: { name: "Ada", age: 36 },
    });
  });

  it("fails not_found on unknown row", () => {
    const s = base();
    const res = new UpdateRowCommand("z", { name: "X" }, src).apply(s);
    expect(res.ok).toBe(false);
  });

  it("no-op patch (matching current values) returns empty events", () => {
    const s = base();
    const res = new UpdateRowCommand("a", { age: 36 }, src).apply(s);
    if (!res.ok) throw new Error();
    expect(res.events).toEqual([]);
  });
});
