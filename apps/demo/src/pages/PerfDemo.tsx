import { Grid, type ObjectRow } from "@sheetgrid/react";
import { useMemo, useState } from "react";
import type { Density, Theme } from "../App";

function makeColumns(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `c${i}`,
    header: `Col ${i + 1}`,
    width: 100,
  }));
}

function makeRows(rowCount: number, colCount: number): ObjectRow[] {
  return Array.from({ length: rowCount }, (_, r) => {
    const row: ObjectRow = { id: `r${r}` };
    for (let c = 0; c < colCount; c++) {
      row[`c${c}`] = `R${r}C${c}`;
    }
    return row;
  });
}

export function PerfDemo({
  density,
  theme,
}: {
  density: Density;
  theme: Theme;
}) {
  const [rowCount, setRowCount] = useState(10_000);
  const [colCount, setColCount] = useState(50);
  const columns = useMemo(() => makeColumns(colCount), [colCount]);
  const rows = useMemo(
    () => makeRows(rowCount, colCount),
    [rowCount, colCount],
  );

  return (
    <>
      <div className="panel" data-testid="panel-perf">
        <h2>Performance playground</h2>
        <p>
          Row <strong>and</strong> column virtualization — only the visible
          window mounts. Scroll both axes: {rowCount.toLocaleString()} rows ×{" "}
          {colCount} columns.
        </p>
        <p style={{ marginTop: 8, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <label>
            Rows:{" "}
            <select
              data-testid="perf-rows"
              value={rowCount}
              onChange={(e) => setRowCount(Number(e.target.value))}
            >
              <option value={1_000}>1,000</option>
              <option value={10_000}>10,000</option>
              <option value={50_000}>50,000</option>
            </select>
          </label>
          <label>
            Columns:{" "}
            <select
              data-testid="perf-cols"
              value={colCount}
              onChange={(e) => setColCount(Number(e.target.value))}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </p>
        <div className="panel-meta">
          <span className="badge">row + col virtualization</span>
          <span className="badge">{density}</span>
        </div>
      </div>
      <div className="grid-host" data-testid="grid-host-perf">
        <Grid
          data-testid="grid-perf"
          rows={rows}
          columns={columns}
          density={density}
          theme={theme}
          statusBar={false}
          style={{ height: "100%" }}
        />
      </div>
    </>
  );
}
