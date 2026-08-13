import { describe, expect, it } from "vitest";
import { createInternalStore } from "../internal-store.js";
import { SetFilterCommand } from "./set-filter.js";

const src = { kind: "system", reason: "init" } as const;

describe("SetFilterCommand", () => {
  it("stores filter clause and inverse restores prev (null)", () => {
    const s = createInternalStore({ rows: [], columns: [{ id: "a", header: "A" }] });
    const res = new SetFilterCommand(
      { column: "a", op: "eq", value: 1 },
      src,
    ).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getFilterRef()).toMatchObject({ column: "a", op: "eq", value: 1 });
    res.inverse.apply(s);
    expect(s.getFilterRef()).toBeNull();
  });

  it("rejects filter referencing unknown column", () => {
    const s = createInternalStore({ rows: [], columns: [{ id: "a", header: "A" }] });
    const res = new SetFilterCommand(
      { column: "z", op: "eq", value: 1 },
      src,
    ).apply(s);
    expect(res.ok).toBe(false);
  });

  it("accepts null (clear filter)", () => {
    const s = createInternalStore({ rows: [], columns: [{ id: "a", header: "A" }] });
    s.setFilter({ column: "a", op: "eq", value: 5 });
    const res = new SetFilterCommand(null, src).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getFilterRef()).toBeNull();
    res.inverse.apply(s);
    expect(s.getFilterRef()).toMatchObject({ column: "a", op: "eq", value: 5 });
  });
});
