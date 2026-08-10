import { describe, expect, it } from "vitest";
import {
  applyFormulaPick,
  expandPickRange,
  isFormulaDraft,
} from "./formula-point.js";

describe("formula-point", () => {
  it("detects formula drafts", () => {
    expect(isFormulaDraft("=A1")).toBe(true);
    expect(isFormulaDraft(" =SUM(1)")).toBe(true);
    expect(isFormulaDraft("hello")).toBe(false);
    expect(isFormulaDraft(12)).toBe(false);
  });

  it("appends first pick", () => {
    expect(applyFormulaPick("=", "B1", null)).toEqual({
      draft: "=B1",
      pickStart: 1,
    });
  });

  it("replaces token while dragging same pick", () => {
    const first = applyFormulaPick("=SUM(", "B1", null);
    expect(first.draft).toBe("=SUM(B1");
    const next = applyFormulaPick(first.draft, "B1:C2", first.pickStart);
    expect(next.draft).toBe("=SUM(B1:C2");
    expect(next.pickStart).toBe(first.pickStart);
  });

  it("appends after operator for a new pick", () => {
    const r = applyFormulaPick("=B1+", "C1", null);
    expect(r.draft).toBe("=B1+C1");
  });

  it("expands pick range", () => {
    expect(expandPickRange(0, 1, 2, 3)).toEqual({
      r1: 0,
      c1: 1,
      r2: 2,
      c2: 3,
    });
  });
});
