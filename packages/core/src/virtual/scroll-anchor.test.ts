import { describe, expect, it } from "vitest";
import { anchorScrollDelta } from "./scroll-anchor.js";

describe("anchorScrollDelta", () => {
  it("shifts scroll when item is fully above the viewport", () => {
    // item at 0 height 100; scroll at 150 → item fully above
    expect(anchorScrollDelta(0, 100, 140, 150)).toBe(40);
    expect(anchorScrollDelta(0, 100, 60, 150)).toBe(-40);
  });

  it("does not shift when item intersects or is below viewport", () => {
    // item [100, 200), scroll 150 → intersects
    expect(anchorScrollDelta(100, 100, 180, 150)).toBe(0);
    // item below viewport
    expect(anchorScrollDelta(500, 50, 80, 100)).toBe(0);
  });

  it("no-op when size unchanged", () => {
    expect(anchorScrollDelta(0, 100, 100, 200)).toBe(0);
  });
});
