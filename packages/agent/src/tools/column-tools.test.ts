import { createGridStore } from "@sheetgrid/core";
import { describe, expect, it } from "vitest";
import { createGridController } from "../controller/create.js";
import { describeGridTools } from "./index.js";

describe("column tools", () => {
  it("add/update/delete/move column", async () => {
    const store = createGridStore({
      rows: [{ id: "r1", values: { a: 1 } }],
      columns: [{ id: "a", header: "A" }],
    });
    const c = createGridController();
    c.__attach(store);
    const tools = describeGridTools(c);
    await tools
      .find((t) => t.name === "grid_add_column")!
      .execute({ def: { id: "b", header: "B" } });
    expect(store.getColumns().map((x) => x.id)).toEqual(["a", "b"]);
    await tools
      .find((t) => t.name === "grid_update_column")!
      .execute({
        columnId: "b",
        patch: { header: "Bee" },
      });
    expect(store.getColumns().find((x) => x.id === "b")!.header).toBe("Bee");
    await tools
      .find((t) => t.name === "grid_move_column")!
      .execute({ columnId: "b", toIndex: 0 });
    expect(store.getColumnOrder()).toEqual(["b", "a"]);
    await tools
      .find((t) => t.name === "grid_delete_column")!
      .execute({ columnId: "a" });
    expect(store.getColumns().map((x) => x.id)).toEqual(["b"]);
  });
});
