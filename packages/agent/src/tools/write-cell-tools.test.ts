import { createGridStore } from "@sheetgrid/core";
import { describe, expect, it } from "vitest";
import { createGridController } from "../controller/create.js";
import { describeGridTools } from "./index.js";

function fx() {
  const store = createGridStore({
    rows: [{ id: "r1", values: { name: "Ada", age: 36, active: true } }],
    columns: [
      { id: "name", header: "Name", type: "text" },
      {
        id: "age",
        header: "Age",
        type: "number",
        description: "Person's age in years",
      },
      { id: "active", header: "Active", type: "boolean" },
    ],
  });
  const c = createGridController();
  c.__attach(store);
  return { c, store };
}

describe("write-cell tools", () => {
  it("grid_set_cell input schema constrains value.type to number for age column", () => {
    const { c } = fx();
    const tools = describeGridTools(c);
    const t = tools.find((t) => t.name === "grid_set_cell")!;
    // The description should enumerate valid columnIds and their types.
    expect(t.description).toContain("age (number");
    // The schema is a plain object with rowId/columnId/value.
    expect(t.input_schema.type).toBe("object");
  });

  it("grid_set_cell execute writes value + returns ok", async () => {
    const { c, store } = fx();
    const tools = describeGridTools(c);
    const t = tools.find((t) => t.name === "grid_set_cell")!;
    const res = await t.execute({ rowId: "r1", columnId: "age", value: 37 });
    expect(res.ok).toBe(true);
    expect(store.getCell("r1", "age")).toBe(37);
  });

  it("grid_set_cell rejects write to non-agent-writable column", async () => {
    const store = createGridStore({
      rows: [{ id: "r1", values: { name: "Ada", id_col: "x" } }],
      columns: [
        { id: "name", header: "Name" },
        { id: "id_col", header: "ID", agentWritable: false } as any,
      ],
    });
    const c = createGridController();
    c.__attach(store);
    const t = describeGridTools(c).find((t) => t.name === "grid_set_cell")!;
    const res = await t.execute({
      rowId: "r1",
      columnId: "id_col",
      value: "y",
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect((res as any).code).toBe("read_only");
  });

  it("grid_set_cells accepts array of patches", async () => {
    const { c, store } = fx();
    const t = describeGridTools(c).find((t) => t.name === "grid_set_cells")!;
    const res = await t.execute({
      patches: [
        { rowId: "r1", columnId: "name", value: "Ada Lovelace" },
        { rowId: "r1", columnId: "age", value: 200 },
      ],
    });
    expect(res.ok).toBe(true);
    expect(store.getCell("r1", "name")).toBe("Ada Lovelace");
    expect(store.getCell("r1", "age")).toBe(200);
  });
});
