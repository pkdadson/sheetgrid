import { useState } from "react";
import { Grid, type ObjectRow } from "@sheetgrid/react";

const columns = [
  { id: "name", header: "Name", width: 160 },
  {
    id: "role",
    header: "Role",
    width: 140,
    type: "select" as const,
    selectOptions: [
      { label: "Engineer", value: "Engineer" },
      { label: "Admiral", value: "Admiral" },
      { label: "Researcher", value: "Researcher" },
      { label: "Mathematician", value: "Mathematician" },
    ],
  },
  { id: "score", header: "Score", width: 100, type: "number" as const },
  { id: "active", header: "Active", width: 90, type: "boolean" as const },
];

const seed: ObjectRow[] = [
  { id: "1", name: "Ada Lovelace", role: "Engineer", score: 98, active: true },
  { id: "2", name: "Grace Hopper", role: "Admiral", score: 99, active: true },
  { id: "3", name: "Alan Turing", role: "Researcher", score: 97, active: false },
  { id: "4", name: "Katherine Johnson", role: "Mathematician", score: 100, active: true },
  { id: "5", name: "Claude Shannon", role: "Engineer", score: 96, active: true },
];

export function App() {
  const [rows, setRows] = useState<ObjectRow[]>(seed);
  return (
    <div className="page">
      <header>
        <h1>SheetGrid — React starter</h1>
        <p className="hint">
          Click a cell to select. Enter to edit. Arrow keys to move. Ctrl/Cmd+C copies
          as TSV. Click a header to sort (Shift+click for multi-sort).
        </p>
      </header>
      <div className="grid-host">
        <Grid
          rows={rows}
          columns={columns}
          virtualizeColumns={false}
          zebra
          onRowsChange={(next) => setRows(next)}
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
