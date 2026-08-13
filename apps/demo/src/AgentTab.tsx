import { useState } from "react";
import { Grid, useGridController } from "@sheetgrid/react";
import { describeGridTools } from "@sheetgrid/agent";

const seedRows = [
  { id: "r1", name: "Ada", age: 36, active: true, note: "" },
  { id: "r2", name: "Grace", age: 40, active: false, note: "" },
  { id: "r3", name: "Katherine", age: 100, active: true, note: "" },
];

const columns = [
  { id: "name", header: "Name", type: "text" as const },
  { id: "age", header: "Age", type: "number" as const },
  { id: "active", header: "Active", type: "boolean" as const },
  { id: "note", header: "Note", type: "text" as const, description: "Free-text customer note" },
];

export function AgentTab() {
  const controller = useGridController();
  const [log, setLog] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [wired, setWired] = useState(false);

  if (!wired) {
    controller.on("*", (event) => {
      setLog((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}  ${event.type}`]);
    });
    setWired(true);
  }

  const runCommand = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    if (cmd === "fill") {
      controller.setCells([
        { rowId: "r1", columnId: "note", value: "First contact 2026-08-11" },
        { rowId: "r2", columnId: "note", value: "Follow-up scheduled" },
        { rowId: "r3", columnId: "note", value: "Retired" },
      ]);
    } else if (cmd === "undo") {
      controller.undo();
    } else if (cmd === "snapshot") {
      const snap = controller.snapshot();
      (window as any).__snap = snap;
      setLog((prev) => [...prev, `snapshot saved → window.__snap`]);
    } else if (cmd === "restore") {
      const snap = (window as any).__snap;
      if (!snap) {
        setLog((prev) => [...prev, `no snapshot`]);
        return;
      }
      controller.restore(snap);
    } else if (cmd === "tools") {
      const tools = describeGridTools(controller);
      setLog((prev) => [...prev, `${tools.length} tools available: ${tools.map((t) => t.name).join(", ")}`]);
    } else {
      setLog((prev) => [...prev, `unknown: ${raw} (try: fill, undo, snapshot, restore, tools)`]);
    }
    setCommand("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "600px", gap: "12px" }}>
      <div style={{ height: 300, border: "1px solid #ccc" }}>
        <Grid controller={controller} rows={seedRows} columns={columns} />
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          data-testid="agent-input"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runCommand(command);
          }}
          placeholder='try: "fill" — "undo" — "snapshot" — "restore" — "tools"'
          style={{ flex: 1, padding: "6px" }}
        />
        <button data-testid="agent-run" onClick={() => runCommand(command)}>
          Run
        </button>
      </div>
      <pre
        data-testid="agent-log"
        style={{
          flex: 1,
          margin: 0,
          padding: "8px",
          background: "#f7f7f7",
          overflow: "auto",
          fontSize: 12,
        }}
      >
        {log.join("\n")}
      </pre>
    </div>
  );
}
