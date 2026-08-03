import { describe, expect, it } from "vitest";
import { fromMatrix } from "../data/from-matrix.js";
import { createGridStore } from "./grid-store.js";

describe("createGridStore", () => {
  it("gets and sets a cell value", () => {
    const { rows, columns } = fromMatrix(
      [
        ["Name"],
        ["Ada"],
      ],
      { headerRow: true },
    );
    const store = createGridStore({ rows, columns });
    const rowId = rows[0]!.id;
    const colId = columns[0]!.id;
    expect(store.getCell(rowId, colId)).toBe("Ada");
    store.setCell(rowId, colId, "Grace", "api");
    expect(store.getCell(rowId, colId)).toBe("Grace");
    expect(store.getRows()[0]!.values[colId]).toBe("Grace");
  });

  it("replaceRows replaces data", () => {
    const a = fromMatrix([["A"], [1]], { headerRow: true });
    const store = createGridStore(a);
    const b = fromMatrix([["A"], [2], [3]], { headerRow: true });
    store.replaceRows(b.rows);
    expect(store.getRows()).toHaveLength(2);
  });

  it("toMatrix exports current data", () => {
    const { rows, columns } = fromMatrix(
      [
        ["A", "B"],
        [1, 2],
      ],
      { headerRow: true },
    );
    const store = createGridStore({ rows, columns });
    expect(store.toMatrix({ headerRow: true })).toEqual([
      ["A", "B"],
      [1, 2],
    ]);
  });

  it("setFormula stores source, writes computed value, recalcs dependents", () => {
    const { rows, columns } = fromMatrix(
      [
        ["A", "B"],
        [1, 0],
      ],
      { headerRow: true },
    );
    const store = createGridStore({
      rows,
      columns,
      formulas: true,
    });
    const r0 = rows[0]!.id;
    const a = columns[0]!.id;
    const b = columns[1]!.id;
    store.setFormula(r0, b, "=A1*2");
    expect(store.getCell(r0, b)).toBe(2);
    expect(store.getFormula(r0, b)?.source).toBe("=A1*2");
    store.setCell(r0, a, 5, "api");
    expect(store.getCell(r0, b)).toBe(10);
  });

  it("setCell clears formula", () => {
    const { rows, columns } = fromMatrix(
      [
        ["A", "B"],
        [1, 0],
      ],
      { headerRow: true },
    );
    const store = createGridStore({ rows, columns, formulas: true });
    const r0 = rows[0]!.id;
    const b = columns[1]!.id;
    store.setFormula(r0, b, "=A1+1");
    expect(store.getFormula(r0, b)).not.toBeNull();
    store.setCell(r0, b, 99, "edit");
    expect(store.getFormula(r0, b)).toBeNull();
    expect(store.getCell(r0, b)).toBe(99);
  });
});
