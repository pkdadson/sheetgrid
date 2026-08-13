import { describe, expect, it, vi } from "vitest";
import { createGridStore } from "@sheetgrid/core";
import { createGridController } from "./create.js";

function fx() {
  return createGridStore({
    rows: [
      { id: "r1", values: { name: "Ada", age: 36 } },
      { id: "r2", values: { name: "Grace", age: 40 } },
    ],
    columns: [
      { id: "name", header: "Name" },
      { id: "age", header: "Age", type: "number" },
    ],
  });
}

describe("createGridController (M4: reads + lifecycle)", () => {
  it("attach/detach lifecycle works, isAttached reflects state", () => {
    const c = createGridController();
    const store = fx();
    expect(c.isAttached()).toBe(false);
    c.__attach(store);
    expect(c.isAttached()).toBe(true);
    c.__detach();
    expect(c.isAttached()).toBe(false);
  });

  it("attaching to a second store while attached throws", () => {
    const c = createGridController();
    c.__attach(fx());
    expect(() => c.__attach(fx())).toThrow(/already attached/i);
  });

  it("reads return detached error when not attached", () => {
    const c = createGridController();
    const res = c.getCell("r1", "name");
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.code).toBe("detached");
  });

  it("getSchema returns full column metadata", () => {
    const c = createGridController();
    c.__attach(fx());
    const schema = c.getSchema();
    expect(schema.rowCount).toBe(2);
    expect(schema.columns).toHaveLength(2);
  });

  it("readOnly rejects writes but allows reads", () => {
    const c = createGridController({ readOnly: true });
    c.__attach(fx());
    expect(c.getCell("r1", "name").ok).toBe(true);
    const write = c.setCell("r1", "name", "X");
    expect(write.ok).toBe(false);
    if (write.ok) throw new Error();
    expect(write.code).toBe("read_only");
  });

  it("authorize denies writes with custom message", () => {
    const c = createGridController({
      authorize: (op) => (op.type === "grid.set_cell" ? "not allowed" : true),
    });
    c.__attach(fx());
    const res = c.setCell("r1", "name", "X");
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.message).toBe("not allowed");
  });

  it("event bus receives controller.attached / detached lifecycle events", () => {
    const c = createGridController();
    const seen: string[] = [];
    c.on("*", (e) => seen.push(e.type));
    c.__attach(fx());
    c.__detach();
    expect(seen).toEqual(["controller.attached", "controller.detached"]);
  });

  it("forwards core store events (cell.changed) after user store mutation", () => {
    const c = createGridController();
    const store = fx();
    c.__attach(store);
    const spy = vi.fn();
    c.on("cell.changed", spy);
    store.setCell("r1", "name", "Ada L", "edit");
    expect(spy).toHaveBeenCalled();
  });

  it("subscribe() fires when store state changes", () => {
    const c = createGridController();
    const store = fx();
    c.__attach(store);
    const listener = vi.fn();
    const unsub = c.subscribe(listener);
    store.setCell("r1", "age", 37, "edit");
    expect(listener).toHaveBeenCalled();
    unsub();
    store.setCell("r1", "age", 38, "edit");
    // No further calls after unsub.
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("queryRows enforces column existence", () => {
    const c = createGridController();
    c.__attach(fx());
    const res = c.queryRows({ column: "zz" as any, op: "eq", value: 1 });
    expect(res.ok).toBe(false);
  });

  it("addRow (M5) succeeds and returns a rowId", () => {
    const c = createGridController();
    c.__attach(fx());
    const res = c.addRow({ name: "New" });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error();
    expect(res.value.rowId).toMatch(/^row-/);
  });
});
