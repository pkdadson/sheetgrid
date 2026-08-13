import { describe, expect, it } from "vitest";
import { defaultSystemPrompt } from "./system-prompt.js";
import type { GridSchema } from "../types/controller.js";

const schema: GridSchema = {
  columns: [
    { id: "name", header: "Name", type: "text", agentWritable: true },
    { id: "age", header: "Age", type: "number", agentWritable: true, description: "Years" },
    { id: "id", header: "ID", agentWritable: false },
  ],
  rowIdField: "id",
  rowCount: 3,
  mode: "objects",
  sort: [],
  filter: null,
};

describe("defaultSystemPrompt", () => {
  it("mentions grid mode, column count, and writable columns", () => {
    const p = defaultSystemPrompt(schema);
    expect(p).toContain("SheetGrid");
    expect(p).toContain("objects");
    expect(p).toContain("3 rows");
    expect(p).toMatch(/name.*text/);
    expect(p).toMatch(/age.*number.*Years/);
  });

  it("flags non-writable columns explicitly", () => {
    const p = defaultSystemPrompt(schema);
    expect(p).toMatch(/id.*read-only/i);
  });

  it("instructs use of grid tools", () => {
    const p = defaultSystemPrompt(schema);
    expect(p).toMatch(/tool/i);
  });
});
