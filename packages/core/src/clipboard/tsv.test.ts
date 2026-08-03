import { describe, expect, it } from "vitest";
import { fromMatrix } from "../data/from-matrix.js";
import { createGridStore } from "../model/grid-store.js";
import { applyPaste, extractRange, parseTsv, serializeTsv } from "./tsv.js";

describe("tsv", () => {
  it("serializes and parses simple matrix", () => {
    const tsv = serializeTsv([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(tsv).toBe("a\tb\nc\td");
    expect(parseTsv(tsv)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("quotes cells with tabs", () => {
    const tsv = serializeTsv([["x\ty"]]);
    expect(tsv).toBe('"x\ty"');
    expect(parseTsv(tsv)).toEqual([["x\ty"]]);
  });

  it("extractRange and applyPaste", async () => {
    const { rows, columns } = fromMatrix(
      [
        ["A", "B"],
        [1, 2],
        [3, 4],
      ],
      { headerRow: true },
    );
    const store = createGridStore({ rows, columns });
    const matrix = extractRange(
      store,
      { rowId: rows[0]!.id, columnId: columns[0]!.id },
      { rowId: rows[1]!.id, columnId: columns[1]!.id },
    );
    expect(matrix).toEqual([
      [1, 2],
      [3, 4],
    ]);

    await applyPaste(
      store,
      { rowId: rows[0]!.id, columnId: columns[0]!.id },
      [["x", "y"]],
      "reject",
    );
    expect(store.getCell(rows[0]!.id, columns[0]!.id)).toBe("x");
  });
});
