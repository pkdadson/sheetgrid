import { describe, expect, it } from "vitest";
import { resolveColumnWidths, setColumnWidth } from "./column-layout.js";
import { moveItem, swapItems } from "./reorder.js";

describe("reorder", () => {
  it("moveItem relocates id", () => {
    expect(moveItem(["a", "b", "c"], "a", 2)).toEqual(["b", "c", "a"]);
  });

  it("swapItems swaps two ids", () => {
    expect(swapItems(["a", "b", "c"], "a", "c")).toEqual(["c", "b", "a"]);
  });
});

describe("column layout", () => {
  it("uses fixed widths and shares flex space", () => {
    const widths = resolveColumnWidths(
      [
        { id: "a", header: "A", width: 100 },
        { id: "b", header: "B", width: "flex" },
        { id: "c", header: "C", width: "flex" },
      ],
      400,
      ["a", "b", "c"],
    );
    expect(widths.a).toBe(100);
    expect(widths.b).toBe(150);
    expect(widths.c).toBe(150);
  });

  it("auto/unset columns fill remaining container width", () => {
    const widths = resolveColumnWidths(
      [
        { id: "a", header: "A" },
        { id: "b", header: "B" },
        { id: "c", header: "C" },
        { id: "d", header: "D" },
        { id: "e", header: "E" },
      ],
      600,
      ["a", "b", "c", "d", "e"],
    );
    expect(widths.a).toBe(120);
    expect(widths.b).toBe(120);
    expect(widths.e).toBe(120);
    expect(Object.values(widths).reduce((sum, w) => sum + w, 0)).toBe(600);
  });

  it("setColumnWidth clamps", () => {
    const w = setColumnWidth({}, "a", 10, 40, 200);
    expect(w.a).toBe(40);
  });
});
