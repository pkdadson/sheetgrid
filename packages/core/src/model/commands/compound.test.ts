import { describe, expect, it } from "vitest";
import { createInternalStore } from "../internal-store.js";
import { CompoundCommand } from "./compound.js";
import { SetCellCommand } from "./set-cell.js";

const src = { kind: "agent", toolName: "batch" } as const;

describe("CompoundCommand", () => {
  it("applies children in order, inverse undoes in reverse order", () => {
    const s = createInternalStore({
      rows: [{ id: "r1", values: { a: 0, b: 0 } }],
      columns: [
        { id: "a", header: "A" },
        { id: "b", header: "B" },
      ],
    });
    const cmd = new CompoundCommand(
      [
        new SetCellCommand("r1", "a", 1, src),
        new SetCellCommand("r1", "b", 2, src),
      ],
      src,
    );
    const res = cmd.apply(s);
    if (!res.ok) throw new Error();
    expect(s.getRowsRef()[0]!.values).toEqual({ a: 1, b: 2 });
    expect(res.events).toHaveLength(2);
    res.inverse.apply(s);
    expect(s.getRowsRef()[0]!.values).toEqual({ a: 0, b: 0 });
  });

  it("returns first child's failure and rolls back applied children", () => {
    const s = createInternalStore({
      rows: [{ id: "r1", values: { a: 0 } }],
      columns: [{ id: "a", header: "A" }],
    });
    const cmd = new CompoundCommand(
      [
        new SetCellCommand("r1", "a", 5, src),
        new SetCellCommand("missing", "a", 9, src), // fails
      ],
      src,
    );
    const res = cmd.apply(s);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.code).toBe("not_found");
    // First child was rolled back.
    expect(s.getRowsRef()[0]!.values.a).toBe(0);
  });
});
