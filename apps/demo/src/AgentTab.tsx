import { AgentChat, Grid, useGridController } from "@sheetgrid/react";
import { ProviderConfigStrip } from "./ProviderConfig.js";
import { useProviderSend } from "./useProviderSend.js";

const seedRows = [
  { id: "r1", name: "Ada", age: 36, active: true, note: "" },
  { id: "r2", name: "Grace", age: 40, active: false, note: "" },
  { id: "r3", name: "Katherine", age: 100, active: true, note: "" },
];

const columns = [
  { id: "name", header: "Name", type: "text" as const },
  { id: "age", header: "Age", type: "number" as const },
  { id: "active", header: "Active", type: "boolean" as const },
  {
    id: "note",
    header: "Note",
    type: "text" as const,
    description: "Free-text customer note",
  },
];

export function AgentTab() {
  const controller = useGridController();
  const { config, setConfig, send } = useProviderSend();

  const placeholder =
    config.provider === "mock"
      ? 'Mock LLM — try: "fill notes", "undo", "sort by age desc", "who is in the grid"'
      : `Chat with ${config.model || config.provider}...`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "600px",
        gap: 12,
      }}
    >
      <ProviderConfigStrip config={config} onChange={setConfig} />
      <div
        style={{ height: 240, border: "1px solid var(--sg-border, #e5e7eb)" }}
      >
        <Grid controller={controller} rows={seedRows} columns={columns} />
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          border: "1px solid var(--sg-border, #e5e7eb)",
          borderRadius: 6,
        }}
      >
        <AgentChat
          controller={controller}
          send={send}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
