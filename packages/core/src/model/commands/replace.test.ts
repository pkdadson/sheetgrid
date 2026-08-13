import { describe, expect, it } from "vitest";
import { createInternalStore } from "../internal-store.js";
import { ReplaceRowsCommand } from "./replace-rows.js";
import { ReplaceColumnsCommand } from "./replace-columns.js";

const src = { kind: "system", reason: "init" } as const;

describe("ReplaceRowsCommand", () => {
  it("replaces rows and inverse restores prev list", () => {
    const s = createInternalStore({
      rows: [
        { id: "a", values: { n: 1 } },
        { id: "b", values: { n: 2 } },
      ],
      columns: [{ id: "n", header: "N" }],
    });
    const next = [{ id: "c", values: { n: 9 } }];
    const res = new ReplaceRowsCommand(next, src).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getRowsRef().map((r) => r.id)).toEqual(["c"]);
    res.inverse.apply(s);
    expect(s.getRowsRef().map((r) => r.id)).toEqual(["a", "b"]);
  });
});

describe("ReplaceColumnsCommand", () => {
  it("replaces columns and inverse restores prev columns AND prev columnOrder", () => {
    const s = createInternalStore({
      rows: [],
      columns: [
        { id: "a", header: "A" },
        { id: "b", header: "B" },
      ],
      columnOrder: ["b", "a"],
    });
    const res = new ReplaceColumnsCommand(
      [{ id: "c", header: "C" }],
      src,
    ).apply(s);
    if (!res.ok) throw new Error();
    expect(s.getColumnsRef().map((c) => c.id)).toEqual(["c"]);
    expect(s.getColumnOrderRef()).toEqual(["c"]);
    res.inverse.apply(s);
    expect(s.getColumnsRef().map((c) => c.id)).toEqual(["a", "b"]);
    expect(s.getColumnOrderRef()).toEqual(["b", "a"]);
  });
});
