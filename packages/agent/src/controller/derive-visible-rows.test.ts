import { describe, expect, it } from "vitest";
import { deriveVisibleRowIds } from "./derive-visible-rows.js";
import type { GridRow, ColumnDef } from "@sheetgrid/core";

const cols: ColumnDef[] = [
  { id: "n", header: "N", type: "number", sortable: true },
];

const rows: GridRow[] = [
  { id: "r1", values: { n: 3 } },
  { id: "r2", values: { n: 1 } },
  { id: "r3", values: { n: 2 } },
];

describe("deriveVisibleRowIds", () => {
  it("returns rows in original order when no sort/filter", () => {
    const ids = deriveVisibleRowIds(rows, cols, [], null);
    expect(ids).toEqual(["r1", "r2", "r3"]);
  });

  it("applies sort ascending", () => {
    const ids = deriveVisibleRowIds(
      rows,
      cols,
      [{ columnId: "n", direction: "asc" }],
      null,
    );
    expect(ids).toEqual(["r2", "r3", "r1"]);
  });

  it("applies filter", () => {
    const ids = deriveVisibleRowIds(
      rows,
      cols,
      [],
      { column: "n", op: "gte", value: 2 },
    );
    expect(ids).toEqual(["r1", "r3"]);
  });

  it("applies filter then sort", () => {
    const ids = deriveVisibleRowIds(
      rows,
      cols,
      [{ columnId: "n", direction: "desc" }],
      { column: "n", op: "gte", value: 2 },
    );
    expect(ids).toEqual(["r1", "r3"]);
  });
});
