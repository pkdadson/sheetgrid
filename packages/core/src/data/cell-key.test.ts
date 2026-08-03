import { describe, expect, it } from "vitest";
import { cellKey, parseCellKey } from "./cell-key.js";

describe("cellKey", () => {
  it("round-trips rowId and columnId", () => {
    const k = cellKey("r1", "name");
    expect(parseCellKey(k)).toEqual({ rowId: "r1", columnId: "name" });
  });

  it("does not collide on ids containing separator-like chars when encoded", () => {
    const k = cellKey("a|b", "c|d");
    expect(parseCellKey(k)).toEqual({ rowId: "a|b", columnId: "c|d" });
  });
});
