import { createGridStore } from "@sheetgrid/core";
import { describe, expect, it } from "vitest";
import { createGridController } from "../controller/create.js";
import { describeGridTools } from "./index.js";

function fx() {
  const store = createGridStore({
    rows: [{ id: "r1", values: { name: "Ada" } }],
    columns: [{ id: "name", header: "Name" }],
  });
  const c = createGridController();
  c.__attach(store);
  return { c, store };
}

describe("row tools", () => {
  it("grid_add_row / grid_update_row / grid_delete_row / grid_move_row all execute", async () => {
    const { c, store } = fx();
    const tools = describeGridTools(c);
    const add = tools.find((t) => t.name === "grid_add_row")!;
    const upd = tools.find((t) => t.name === "grid_update_row")!;
    const del = tools.find((t) => t.name === "grid_delete_row")!;
    const mv = tools.find((t) => t.name === "grid_move_row")!;

    const addRes = await add.execute({
      values: { name: "Grace" },
      opts: { id: "r2", at: "end" },
    });
    expect(addRes.ok).toBe(true);
    expect(store.getRows().map((r) => r.id)).toEqual(["r1", "r2"]);

    const updRes = await upd.execute({
      rowId: "r2",
      patch: { name: "Grace Hopper" },
    });
    expect(updRes.ok).toBe(true);
    expect(store.getCell("r2", "name")).toBe("Grace Hopper");

    const mvRes = await mv.execute({ rowId: "r2", toIndex: 0 });
    expect(mvRes.ok).toBe(true);
    expect(store.getRows().map((r) => r.id)).toEqual(["r2", "r1"]);

    const delRes = await del.execute({ rowId: "r1" });
    expect(delRes.ok).toBe(true);
  });
});
