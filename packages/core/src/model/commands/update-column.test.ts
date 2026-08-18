import { describe, expect, it } from "vitest";
import { createInternalStore } from "../internal-store.js";
import { UpdateColumnCommand } from "./update-column.js";

const src = { kind: "system", reason: "init" } as const;

describe("UpdateColumnCommand", () => {
  it("patches column def and inverse restores prev", () => {
    const s = createInternalStore({
      rows: [],
      columns: [{ id: "a", header: "A", type: "text" }],
    });
    const res = new UpdateColumnCommand(
      "a",
      { header: "Alpha", type: "number" },
      src,
    ).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getColumnsRef()[0]).toMatchObject({
      id: "a",
      header: "Alpha",
      type: "number",
    });
    res.inverse.apply(s);
    expect(s.getColumnsRef()[0]).toMatchObject({
      id: "a",
      header: "A",
      type: "text",
    });
  });

  it("rejects patch containing 'id'", () => {
    const s = createInternalStore({
      rows: [],
      columns: [{ id: "a", header: "A" }],
    });
    const res = new UpdateColumnCommand(
      "a",
      { id: "renamed" } as any,
      src,
    ).apply(s);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.code).toBe("invalid_argument");
  });

  it("fails not_found on unknown column", () => {
    const s = createInternalStore({
      rows: [],
      columns: [{ id: "a", header: "A" }],
    });
    const res = new UpdateColumnCommand("z", { header: "X" }, src).apply(s);
    expect(res.ok).toBe(false);
  });

  it("emits column.updated event with prev and patch", () => {
    const s = createInternalStore({
      rows: [],
      columns: [{ id: "a", header: "A" }],
    });
    const res = new UpdateColumnCommand("a", { header: "Alpha" }, src).apply(s);
    if (!res.ok) throw new Error();
    expect(res.events[0]).toMatchObject({
      type: "column.updated",
      columnId: "a",
      patch: { header: "Alpha" },
    });
  });
});
