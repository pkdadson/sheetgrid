import { createGridStore } from "@sheetgrid/core";
import { describe, expect, it } from "vitest";
import { createGridController } from "../controller/create.js";
import { describeGridTools } from "./index.js";

function fx() {
  const store = createGridStore({
    rows: [{ id: "r1", values: { a: 1 } }],
    columns: [{ id: "a", header: "A" }],
  });
  const c = createGridController();
  c.__attach(store);
  return c;
}

describe("describeGridTools filters", () => {
  it("include narrows to named tools", () => {
    const tools = describeGridTools(fx(), {
      include: ["grid_get_schema", "grid_set_cell"],
    });
    expect(tools.map((t) => t.name).sort()).toEqual([
      "grid_get_schema",
      "grid_set_cell",
    ]);
  });

  it("exclude removes named tools", () => {
    const tools = describeGridTools(fx(), {
      exclude: ["grid_delete_row", "grid_delete_column"],
    });
    const names = tools.map((t) => t.name);
    expect(names).not.toContain("grid_delete_row");
    expect(names).not.toContain("grid_delete_column");
    expect(names).toContain("grid_set_cell");
  });
});
