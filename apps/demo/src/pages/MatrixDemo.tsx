import { Grid } from "@sheetgrid/react";
import { useState } from "react";
import type { Density, Theme } from "../App";

const seed: unknown[][] = [
  ["Product", "Q1", "Q2", "Q3", "Q4", "Total", "Note"],
  ["Widgets", 120, 140, 135, 160, 0, ""],
  ["Gadgets", 80, 95, 100, 110, 0, ""],
  ["Doodads", 40, 42, 38, 55, 0, ""],
  ["Thingies", 200, 210, 205, 230, 0, ""],
];

export function MatrixDemo({
  density,
  theme,
}: {
  density: Density;
  theme: Theme;
}) {
  const [data, setData] = useState(seed);

  return (
    <>
      <div className="panel" data-testid="panel-matrix">
        <h2>2D matrix data</h2>
        <p>
          First-class <code>data</code> + <code>headerRow</code> API. Paste TSV
          from a spreadsheet into a selected cell. Edits flow through{" "}
          <code>onDataChange</code>. Secure formulas are enabled — type{" "}
          <code>=</code> for A1 expressions (e.g. <code>=SUM(B1:E1)</code>).
          While editing a formula, click or drag cells to insert references.
        </p>
        <div className="panel-meta">
          <span className="badge">headerRow</span>
          <span className="badge">TSV paste</span>
          <span className="badge">formulas</span>
          <ul className="kbd-legend" aria-label="Keyboard shortcuts">
            <li>
              <kbd>⌘/Ctrl</kbd>+<kbd>V</kbd> paste TSV
            </li>
            <li>
              <kbd>Enter</kbd> edit cell
            </li>
            <li>
              <kbd>=</kbd> start formula · click/drag cells to insert refs
            </li>
          </ul>
        </div>
      </div>
      <div className="grid-host" data-testid="grid-host-matrix">
        <Grid
          data-testid="grid-matrix"
          data={data}
          headerRow
          formulas
          onDataChange={(next) => setData(next)}
          density={density}
          theme={theme}
          zebra
          style={{ height: "100%" }}
        />
      </div>
    </>
  );
}
