import type { EventSource } from "@sheetgrid/core";
import type { AgentOp } from "../types/agent-op.js";

export function agentSource(op: AgentOp, correlationId?: string): EventSource {
  const toolName = op.type.replace(/\./g, "_");
  const src: EventSource = { kind: "agent", toolName };
  if (correlationId) (src as any).correlationId = correlationId;
  return src;
}
