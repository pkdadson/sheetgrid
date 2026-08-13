import { describe, expect, it } from "vitest";
import { agentSource } from "./write-source.js";
import type { AgentOp } from "../types/agent-op.js";

describe("agentSource", () => {
  it("returns kind=agent with toolName derived from op.type", () => {
    const op: AgentOp = { type: "grid.set_cell", rowId: "r", columnId: "c", value: 1 };
    expect(agentSource(op)).toEqual({ kind: "agent", toolName: "grid_set_cell" });
  });

  it("threads through provided correlationId", () => {
    const op: AgentOp = { type: "grid.undo" };
    expect(agentSource(op, "corr-123")).toEqual({
      kind: "agent",
      toolName: "grid_undo",
      correlationId: "corr-123",
    });
  });
});
