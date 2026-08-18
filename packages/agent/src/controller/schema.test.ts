import { createGridStore } from "@sheetgrid/core";
import { describe, expect, it } from "vitest";
import { buildSchema } from "./schema.js";

describe("buildSchema", () => {
  it("returns columns + rowCount + mode + sort + filter", () => {
    const store = createGridStore({
      rows: [{ id: "r1", values: { name: "Ada", age: 36 } }],
      columns: [
        { id: "name", header: "Name" },
        { id: "age", header: "Age", type: "number" },
      ],
    });
    const schema = buildSchema(store, "objects");
    expect(schema.mode).toBe("objects");
    expect(schema.rowIdField).toBe("id");
    expect(schema.rowCount).toBe(1);
    expect(schema.columns).toEqual([
      expect.objectContaining({
        id: "name",
        header: "Name",
        agentWritable: true,
      }),
      expect.objectContaining({
        id: "age",
        header: "Age",
        type: "number",
        agentWritable: true,
      }),
    ]);
    expect(schema.sort).toEqual([]);
    expect(schema.filter).toBeNull();
  });

  it("reports agentWritable=false for read-only columns", () => {
    const store = createGridStore({
      rows: [],
      columns: [
        { id: "id", header: "ID", agentWritable: false } as any,
        { id: "name", header: "Name" },
      ],
    });
    const schema = buildSchema(store, "objects");
    expect(schema.columns.find((c) => c.id === "id")!.agentWritable).toBe(
      false,
    );
    expect(schema.columns.find((c) => c.id === "name")!.agentWritable).toBe(
      true,
    );
  });

  it("includes description when column has one", () => {
    const store = createGridStore({
      rows: [],
      columns: [
        {
          id: "note",
          header: "Note",
          description: "Free-text customer note",
        } as any,
      ],
    });
    const schema = buildSchema(store, "objects");
    expect(schema.columns[0]!.description).toBe("Free-text customer note");
  });
});
