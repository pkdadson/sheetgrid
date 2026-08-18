import { createGridStore } from "@sheetgrid/core";
import { describe, expect, it, vi } from "vitest";
import { createGridController } from "./create.js";

function fx() {
  return createGridStore({
    rows: [
      { id: "r1", values: { n: 1 } },
      { id: "r2", values: { n: 2 } },
    ],
    columns: [{ id: "n", header: "N", type: "number" }],
  });
}

describe("controller batch()", () => {
  it("applies all ops as a single undo entry", async () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    const res = await c.batch(async (tx) => {
      tx.setCell("r1", "n", 10);
      tx.setCell("r2", "n", 20);
      return "done";
    });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error();
    expect(res.value).toBe("done");
    expect(store.getCell("r1", "n")).toBe(10);
    expect(store.getCell("r2", "n")).toBe(20);
    // One undo reverts BOTH ops.
    c.undo();
    expect(store.getCell("r1", "n")).toBe(1);
    expect(store.getCell("r2", "n")).toBe(2);
  });

  it("rolls back all ops if fn throws", async () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    const res = await c.batch(async (tx) => {
      tx.setCell("r1", "n", 10);
      throw new Error("nope");
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.code).toBe("internal");
    // r1 restored.
    expect(store.getCell("r1", "n")).toBe(1);
  });

  it("rolls back if any inner op fails", async () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    const res = await c.batch(async (tx) => {
      tx.setCell("r1", "n", 10);
      const r = tx.setCell("missing", "n", 99);
      if (!r.ok) throw new Error("halt");
    });
    expect(res.ok).toBe(false);
    expect(store.getCell("r1", "n")).toBe(1);
  });

  it("emits transaction.started + committed + rolledback events", async () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    const seen: string[] = [];
    c.on("*", (e) => seen.push(e.type));
    await c.batch(async (tx) => {
      tx.setCell("r1", "n", 10);
    });
    expect(seen.filter((s) => s.startsWith("transaction."))).toEqual([
      "transaction.started",
      "transaction.committed",
    ]);
    seen.length = 0;
    await c.batch(async () => {
      throw new Error("bad");
    });
    expect(seen.filter((s) => s.startsWith("transaction."))).toEqual([
      "transaction.started",
      "transaction.rolledback",
    ]);
  });
});
