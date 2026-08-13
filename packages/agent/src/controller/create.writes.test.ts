import { describe, expect, it } from "vitest";
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

describe("controller writes — cells", () => {
  it("setCell writes value + emits cell.changed", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    const seen: string[] = [];
    c.on("cell.changed", (e) => {
      // Only the granular event emitted from dispatch has a real rowId.
      if (e.rowId) seen.push(`${e.rowId}.${e.columnId}=${e.next}`);
    });
    const res = c.setCell("r1", "name", "Ada L");
    expect(res.ok).toBe(true);
    expect(store.getCell("r1", "name")).toBe("Ada L");
    expect(seen).toContain("r1.name=Ada L");
  });

  it("setCell reports validation_failed when column validator rejects", () => {
    const store = createGridStore({
      rows: [{ id: "r1", values: { age: 5 } }],
      columns: [
        {
          id: "age",
          header: "Age",
          type: "number",
          validate: (v) =>
            typeof v === "number" && v >= 0 ? { ok: true } : { ok: false, message: "must be non-negative" },
        },
      ],
    });
    const c = createGridController();
    c.__attach(store);
    const res = c.setCell("r1", "age", -1);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.code).toBe("validation_failed");
    expect(store.getCell("r1", "age")).toBe(5);
  });

  it("setCells applies all valid patches and reports rejections per-cell", () => {
    const store = fx();
    const c = createGridController();
    c.__attach(store);
    const res = c.setCells([
      { rowId: "r1", columnId: "name", value: "Ada L" },
      { rowId: "missing", columnId: "name", value: "X" },
      { rowId: "r2", columnId: "age", value: 41 },
    ]);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error();
    expect(res.value.applied).toBe(2);
    expect(res.value.rejected).toHaveLength(1);
    expect(res.value.rejected[0]!.code).toBe("not_found");
    expect(store.getCell("r1", "name")).toBe("Ada L");
    expect(store.getCell("r2", "age")).toBe(41);
  });
});
