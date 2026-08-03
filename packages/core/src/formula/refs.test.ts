import { describe, expect, it } from "vitest";
import {
  colIndexToLetters,
  lettersToColIndex,
  parseA1,
  parseA1Range,
} from "./refs.js";

describe("refs", () => {
  it("maps column letters", () => {
    expect(colIndexToLetters(0)).toBe("A");
    expect(colIndexToLetters(25)).toBe("Z");
    expect(colIndexToLetters(26)).toBe("AA");
    expect(lettersToColIndex("A")).toBe(0);
    expect(lettersToColIndex("AA")).toBe(26);
  });

  it("parses A1 with absolutes", () => {
    expect(parseA1("B2")).toEqual({
      row: 1,
      col: 1,
      rowAbs: false,
      colAbs: false,
    });
    expect(parseA1("$A$1")).toEqual({
      row: 0,
      col: 0,
      rowAbs: true,
      colAbs: true,
    });
  });

  it("parses ranges normalized", () => {
    expect(parseA1Range("B2:A1")).toEqual({
      r1: 0,
      c1: 0,
      r2: 1,
      c2: 1,
    });
  });

  it("rejects sheet qualifiers", () => {
    expect(parseA1("Sheet1!A1")).toBeNull();
  });

  it("formats A1 and ranges", async () => {
    const { formatA1, formatA1Range } = await import("./refs.js");
    expect(formatA1(0, 0)).toBe("A1");
    expect(formatA1(1, 1)).toBe("B2");
    expect(formatA1Range(0, 1, 0, 3)).toBe("B1:D1");
    expect(formatA1Range(0, 0, 0, 0)).toBe("A1");
  });
});
