import { describe, expect, it } from "vitest";
import { createGridStore } from "@sheetgrid/core";
import { createGridController } from "../controller/create.js";
import { describeGridTools } from "./index.js";

function fx() {
  const store = createGridStore({
    rows: [{ id: "r1", values: { name: "Ada", age: 36 } }],
    columns: [
      { id: "name", header: "Name" },
      { id: "age", header: "Age", type: "number" },
    ],
  });
  const c = createGridController();
  c.__attach(store);
  return c;
}

describe("describeGridTools — read tools", () => {
  it("includes get_schema, get_data, get_cell, query_rows, get_selection, describe", () => {
    const tools = describeGridTools(fx());
    const names = tools.map((t) => t.name);
    for (const expected of [
      "grid_get_schema",
      "grid_get_data",
      "grid_get_cell",
      "grid_query_rows",
      "grid_get_selection",
      "grid_describe",
    ]) {
      expect(names).toContain(expected);
    }
  });

  it("get_schema tool has no input params and executes successfully", async () => {
    const c = fx();
    const tools = describeGridTools(c);
    const t = tools.find((t) => t.name === "grid_get_schema")!;
    expect(t.input_schema).toMatchObject({ type: "object", properties: {} });
    const res = await t.execute({});
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error();
    expect(res.value).toHaveProperty("rowCount", 1);
  });

  it("get_data respects rowIds param", async () => {
    const c = fx();
    const t = describeGridTools(c).find((t) => t.name === "grid_get_data")!;
    const res = await t.execute({ rowIds: ["r1"] });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error();
    expect((res.value as any).rows).toHaveLength(1);
  });

  it("query_rows returns rowIds matching a where clause", async () => {
    const c = fx();
    const t = describeGridTools(c).find((t) => t.name === "grid_query_rows")!;
    const res = await t.execute({ where: { column: "age", op: "gte", value: 30 } });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error();
    expect((res.value as any).rowIds).toEqual(["r1"]);
  });
});
