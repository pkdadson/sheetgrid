import { describe, expect, it } from "vitest";
import {
  columnValueSchema,
  filterClauseSchema,
  whereClauseSchema,
  sortSpecSchema,
} from "./json-schema.js";
import type { GridSchema } from "../types/controller.js";

const schema: GridSchema = {
  columns: [
    { id: "name", header: "Name", type: "text", agentWritable: true, description: "Full name" },
    { id: "age", header: "Age", type: "number", agentWritable: true },
    { id: "active", header: "Active", type: "boolean", agentWritable: true },
    { id: "role", header: "Role", type: "select", agentWritable: true } as any,
    { id: "id", header: "ID", agentWritable: false } as any,
  ],
  rowIdField: "id",
  rowCount: 0,
  mode: "objects",
  sort: [],
  filter: null,
};

// Extend one column with select options for the test.
(schema.columns[3] as any).options = ["admin", "user", "guest"];

describe("columnValueSchema", () => {
  it("text → string, null allowed", () => {
    const s = columnValueSchema(schema.columns[0]!);
    expect(s.type).toEqual(["string", "null"]);
    expect(s.description).toContain("Full name");
  });

  it("number → number | null", () => {
    const s = columnValueSchema(schema.columns[1]!);
    expect(s.type).toEqual(["number", "null"]);
  });

  it("boolean → boolean | null", () => {
    const s = columnValueSchema(schema.columns[2]!);
    expect(s.type).toEqual(["boolean", "null"]);
  });

  it("select → enum from options", () => {
    const s = columnValueSchema(schema.columns[3]!);
    expect(s.enum).toEqual(["admin", "user", "guest", null]);
  });

  it("unknown column type → any", () => {
    const s = columnValueSchema({ id: "x", header: "X", agentWritable: true } as any);
    expect(s.type).toBeUndefined();
  });
});

describe("filterClauseSchema", () => {
  it("returns a recursive JSON schema with and/or/not/leaf branches", () => {
    const s = filterClauseSchema();
    expect(s.oneOf).toHaveLength(4);
  });
});

describe("sortSpecSchema", () => {
  it("returns array of {columnId,direction}", () => {
    const s = sortSpecSchema();
    expect(s.type).toBe("array");
    expect(s.items).toMatchObject({
      type: "object",
      required: ["columnId", "direction"],
    });
  });
});
