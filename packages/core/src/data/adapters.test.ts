import { describe, expect, it } from "vitest";
import { fromMatrix } from "./from-matrix.js";
import { fromObjects } from "./from-objects.js";
import { toMatrix } from "./to-matrix.js";

describe("fromMatrix / toMatrix", () => {
  it("parses header row into columns and body rows", () => {
    const { rows, columns } = fromMatrix(
      [
        ["Name", "Age"],
        ["Ada", 36],
        ["Grace", 40],
      ],
      { headerRow: true },
    );
    expect(columns.map((c) => c.header)).toEqual(["Name", "Age"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.values[columns[0]!.id]).toBe("Ada");
    expect(rows[0]!.values[columns[1]!.id]).toBe(36);
  });

  it("round-trips matrix with headerRow", () => {
    const matrix = [
      ["A", "B"],
      [1, 2],
      [3, 4],
    ];
    const { rows, columns } = fromMatrix(matrix, { headerRow: true });
    expect(toMatrix(rows, columns, { headerRow: true })).toEqual(matrix);
  });

  it("without headerRow uses col_0..n and keeps all rows as data", () => {
    const { rows, columns } = fromMatrix([["x", "y"]], { headerRow: false });
    expect(columns.map((c) => c.id)).toEqual(["col_0", "col_1"]);
    expect(rows).toHaveLength(1);
  });

  it("fills missing cells with null", () => {
    const { rows, columns } = fromMatrix(
      [
        ["A", "B"],
        ["only"],
      ],
      { headerRow: true },
    );
    expect(rows[0]!.values[columns[1]!.id]).toBeNull();
  });
});

describe("fromObjects", () => {
  it("maps object fields through column defs", () => {
    const columns = [
      { id: "name", header: "Name" },
      { id: "age", header: "Age" },
    ];
    const rows = fromObjects(
      [
        { id: "1", name: "Ada", age: 36 },
        { id: "2", name: "Grace", age: 40 },
      ],
      columns,
    );
    expect(rows[0]).toEqual({
      id: "1",
      values: { name: "Ada", age: 36 },
    });
  });

  it("generates row ids when missing", () => {
    const columns = [{ id: "name", header: "Name" }];
    const rows = fromObjects([{ name: "Ada" }], columns);
    expect(rows[0]!.id).toBeTruthy();
    expect(rows[0]!.values.name).toBe("Ada");
  });
});
