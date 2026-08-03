import { describe, expect, it } from "vitest";
import { cellKey } from "../data/cell-key.js";
import { fromObjects } from "../data/from-objects.js";
import { createGridStore } from "./grid-store.js";
import { commitCell } from "./validation.js";
import { max, min, number, pattern, required } from "./validators.js";

describe("validators", () => {
  it("required rejects empty", () => {
    expect(required("").ok).toBe(false);
    expect(required("x").ok).toBe(true);
    expect(required(null).ok).toBe(false);
  });

  it("number accepts numeric strings", () => {
    expect(number("3.5").ok).toBe(true);
    expect(number("nope").ok).toBe(false);
  });

  it("min/max work on numbers", () => {
    expect(min(0)(-1).ok).toBe(false);
    expect(max(10)(11).ok).toBe(false);
    expect(max(10)(10).ok).toBe(true);
  });

  it("pattern tests strings", () => {
    const email = pattern(/@/, "Invalid email");
    expect(email("a@b").ok).toBe(true);
    expect(email("ab").ok).toBe(false);
  });
});

describe("commitCell", () => {
  it("reject mode does not write invalid values", async () => {
    const columns = [
      {
        id: "age",
        header: "Age",
        validate: (v: unknown) =>
          typeof v === "number" && v >= 0
            ? { ok: true as const }
            : { ok: false as const, message: "bad" },
      },
    ];
    const rows = fromObjects([{ id: "1", age: 1 }], columns);
    const store = createGridStore({ rows, columns });
    const result = await commitCell(store, {
      rowId: "1",
      columnId: "age",
      value: -5,
      mode: "reject",
    });
    expect(result.ok).toBe(false);
    expect(store.getCell("1", "age")).toBe(1);
    expect(store.getErrors().has(cellKey("1", "age"))).toBe(true);
  });

  it("commit-with-error writes value and stores error", async () => {
    const columns = [
      {
        id: "age",
        header: "Age",
        validate: () => ({ ok: false as const, message: "bad" }),
      },
    ];
    const rows = fromObjects([{ id: "1", age: 1 }], columns);
    const store = createGridStore({ rows, columns });
    const result = await commitCell(store, {
      rowId: "1",
      columnId: "age",
      value: 9,
      mode: "commit-with-error",
    });
    expect(result.ok).toBe(false);
    expect(store.getCell("1", "age")).toBe(9);
  });

  it("clears error on successful commit", async () => {
    const columns = [
      {
        id: "age",
        header: "Age",
        validate: (v: unknown) =>
          v === 1
            ? { ok: false as const, message: "no" }
            : { ok: true as const },
      },
    ];
    const rows = fromObjects([{ id: "1", age: 0 }], columns);
    const store = createGridStore({ rows, columns });
    await commitCell(store, {
      rowId: "1",
      columnId: "age",
      value: 1,
      mode: "commit-with-error",
    });
    await commitCell(store, {
      rowId: "1",
      columnId: "age",
      value: 2,
      mode: "reject",
    });
    expect(store.getErrors().size).toBe(0);
  });
});
