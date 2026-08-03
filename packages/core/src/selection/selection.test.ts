import { describe, expect, it } from "vitest";
import {
  createSelection,
  extendTo,
  isCellSelected,
  moveActive,
  selectAll,
  selectCell,
  selectColumn,
  selectRow,
  toggleCell,
} from "./selection.js";

const rows = ["r0", "r1", "r2"];
const cols = ["c0", "c1", "c2"];
const rowIndexOf = new Map(rows.map((id, i) => [id, i]));
const colIndexOf = new Map(cols.map((id, i) => [id, i]));

describe("selection", () => {
  it("createSelection is empty", () => {
    const s = createSelection();
    expect(s.active).toBeNull();
    expect(s.ranges).toEqual([]);
  });

  it("selectCell sets active and single range", () => {
    const s = selectCell(createSelection(), { rowId: "r1", columnId: "c1" });
    expect(s.active).toEqual({ rowId: "r1", columnId: "c1" });
    expect(s.ranges).toHaveLength(1);
    expect(
      isCellSelected(s, { rowId: "r1", columnId: "c1" }, rowIndexOf, colIndexOf),
    ).toBe(true);
  });

  it("extendTo expands range from active", () => {
    let s = selectCell(createSelection(), { rowId: "r0", columnId: "c0" });
    s = extendTo(s, { rowId: "r1", columnId: "c1" });
    expect(
      isCellSelected(s, { rowId: "r0", columnId: "c1" }, rowIndexOf, colIndexOf),
    ).toBe(true);
    expect(
      isCellSelected(s, { rowId: "r1", columnId: "c0" }, rowIndexOf, colIndexOf),
    ).toBe(true);
  });

  it("toggleCell adds multi-range", () => {
    let s = selectCell(createSelection(), { rowId: "r0", columnId: "c0" });
    s = toggleCell(s, { rowId: "r2", columnId: "c2" });
    expect(s.ranges).toHaveLength(2);
  });

  it("selectRow / selectColumn / selectAll", () => {
    const rowSel = selectRow(createSelection(), "r1", rows, cols);
    expect(
      isCellSelected(
        rowSel,
        { rowId: "r1", columnId: "c2" },
        rowIndexOf,
        colIndexOf,
      ),
    ).toBe(true);

    const colSel = selectColumn(createSelection(), "c1", rows, cols);
    expect(
      isCellSelected(
        colSel,
        { rowId: "r2", columnId: "c1" },
        rowIndexOf,
        colIndexOf,
      ),
    ).toBe(true);

    const all = selectAll(rows, cols);
    expect(
      isCellSelected(all, { rowId: "r2", columnId: "c2" }, rowIndexOf, colIndexOf),
    ).toBe(true);
  });

  it("moveActive navigates and can extend", () => {
    let s = selectCell(createSelection(), { rowId: "r0", columnId: "c0" });
    s = moveActive(s, "right", rows, cols);
    expect(s.active).toEqual({ rowId: "r0", columnId: "c1" });
    s = moveActive(s, "down", rows, cols, { extend: true });
    expect(
      isCellSelected(s, { rowId: "r1", columnId: "c1" }, rowIndexOf, colIndexOf),
    ).toBe(true);
  });
});
