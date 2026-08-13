import { describe, expect, it } from "vitest";
import { runAuthCheck } from "./authorize-check.js";
import type { AgentOp } from "../types/agent-op.js";
import type { ColumnDef } from "@sheetgrid/core";

const cols: ColumnDef[] = [
  { id: "a", header: "A" },
  { id: "b", header: "B" },
];
(cols[0] as any).agentWritable = true;
(cols[1] as any).agentWritable = false;

describe("runAuthCheck", () => {
  it("reads always allowed", () => {
    const op: AgentOp = { type: "grid.get_data" };
    expect(runAuthCheck(op, cols, { readOnly: false })).toEqual({ ok: true, value: undefined });
    expect(runAuthCheck(op, cols, { readOnly: true })).toEqual({ ok: true, value: undefined });
  });

  it("rejects any write when grid-level readOnly is true", () => {
    const op: AgentOp = { type: "grid.set_cell", rowId: "r", columnId: "a", value: 1 };
    const res = runAuthCheck(op, cols, { readOnly: true });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.code).toBe("read_only");
    expect(res.message).toMatch(/grid is read-only/i);
  });

  it("rejects writes to non-writable columns", () => {
    const op: AgentOp = { type: "grid.set_cell", rowId: "r", columnId: "b", value: 1 };
    const res = runAuthCheck(op, cols, {});
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.code).toBe("read_only");
    expect(res.details).toEqual({ columnId: "b" });
  });

  it("allows writes to writable columns", () => {
    const op: AgentOp = { type: "grid.set_cell", rowId: "r", columnId: "a", value: 1 };
    expect(runAuthCheck(op, cols, {})).toEqual({ ok: true, value: undefined });
  });

  it("consults authorize() and forwards its string as message", () => {
    const op: AgentOp = { type: "grid.set_cell", rowId: "r", columnId: "a", value: 1 };
    const res = runAuthCheck(op, cols, {
      authorize: () => "row is locked",
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.message).toBe("row is locked");
  });

  it("structural ops skip per-column check but go through authorize()", () => {
    const op: AgentOp = { type: "grid.delete_row", rowId: "r1" };
    const res = runAuthCheck(op, cols, {
      authorize: (o) => (o.type === "grid.delete_row" ? "no deletes" : true),
    });
    expect(res.ok).toBe(false);
  });

  it("setCells collects per-patch column checks and reports all rejected", () => {
    const op: AgentOp = {
      type: "grid.set_cells",
      patches: [
        { rowId: "r1", columnId: "a", value: 1 },
        { rowId: "r1", columnId: "b", value: 2 }, // read-only
      ],
    };
    const res = runAuthCheck(op, cols, {});
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.details).toMatchObject({ columnIds: ["b"] });
  });
});
