import { describe, expect, it } from "vitest";
import { createInternalStore } from "./internal-store.js";

describe("createInternalStore", () => {
  it("exposes mutable references and notify()", () => {
    const seen: number[] = [];
    const internal = createInternalStore({
      rows: [{ id: "r1", values: { name: "Ada" } }],
      columns: [{ id: "name", header: "Name" }],
    });
    const unsub = internal.subscribe(() => seen.push(seen.length));

    expect(internal.getRowsRef()).toHaveLength(1);
    internal.setRows([
      { id: "r1", values: { name: "Ada" } },
      { id: "r2", values: { name: "Grace" } },
    ]);
    internal.notify();
    expect(seen).toEqual([0]);

    unsub();
    internal.notify();
    expect(seen).toEqual([0]);
  });

  it("has a formulas facade with enable=false by default", () => {
    const internal = createInternalStore({
      rows: [],
      columns: [],
    });
    expect(internal.formulas.isEnabled()).toBe(false);
    expect(internal.formulas.set("r1", "c1", "=1+1")).toBe(false);
  });
});
