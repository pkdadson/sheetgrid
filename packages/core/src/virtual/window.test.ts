import { describe, expect, it } from "vitest";
import { computeVariableWindow, computeWindow } from "./window.js";

describe("computeWindow", () => {
  it("returns visible indices with overscan", () => {
    const w = computeWindow({
      scrollOffset: 100,
      viewportSize: 200,
      itemSize: 32,
      itemCount: 1000,
      overscan: 2,
    });
    expect(w.startIndex).toBe(1);
    expect(w.endIndex).toBeGreaterThan(w.startIndex);
    expect(w.offsetBefore).toBe(w.startIndex * 32);
    expect(w.totalSize).toBe(1000 * 32);
  });

  it("clamps to bounds", () => {
    const w = computeWindow({
      scrollOffset: 0,
      viewportSize: 100,
      itemSize: 32,
      itemCount: 3,
      overscan: 5,
    });
    expect(w.startIndex).toBe(0);
    expect(w.endIndex).toBe(2);
  });

  it("handles empty", () => {
    const w = computeWindow({
      scrollOffset: 0,
      viewportSize: 100,
      itemSize: 32,
      itemCount: 0,
      overscan: 2,
    });
    expect(w.startIndex).toBe(0);
    expect(w.endIndex).toBe(-1);
    expect(w.totalSize).toBe(0);
  });

  it("clamps scroll past end so the window is never empty", () => {
    const w = computeWindow({
      scrollOffset: 200_000,
      viewportSize: 200,
      itemSize: 32,
      itemCount: 1000,
      overscan: 2,
    });
    expect(w.startIndex).toBeGreaterThanOrEqual(0);
    expect(w.endIndex).toBeGreaterThanOrEqual(w.startIndex);
    expect(w.endIndex).toBeLessThan(1000);
    expect(w.totalSize).toBe(1000 * 32);
  });
});

describe("computeVariableWindow", () => {
  it("windows by cumulative sizes", () => {
    const w = computeVariableWindow({
      scrollOffset: 100,
      viewportSize: 150,
      sizes: [100, 200, 100, 100],
      overscan: 0,
    });
    // viewport [100, 250) intersects col1 [100, 300) only
    expect(w.startIndex).toBe(1);
    expect(w.endIndex).toBe(1);
    expect(w.totalSize).toBe(500);
    expect(w.offsetBefore).toBe(100);
  });

  it("includes multiple columns in a wide viewport", () => {
    const w = computeVariableWindow({
      scrollOffset: 0,
      viewportSize: 350,
      sizes: [100, 200, 100, 100],
      overscan: 0,
    });
    // [0, 350) hits col0, col1, col2
    expect(w.startIndex).toBe(0);
    expect(w.endIndex).toBe(2);
  });

  it("applies overscan", () => {
    const w = computeVariableWindow({
      scrollOffset: 100,
      viewportSize: 150,
      sizes: [100, 200, 100, 100],
      overscan: 1,
    });
    expect(w.startIndex).toBe(0);
    expect(w.endIndex).toBe(2);
  });
});
