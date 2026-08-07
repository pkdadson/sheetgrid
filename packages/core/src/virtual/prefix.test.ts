import { describe, expect, it } from "vitest";
import {
  buildPrefixSums,
  computePads,
  expandWindowForPins,
  offsetOf,
  windowFromPrefix,
} from "./prefix.js";
import { computeVariableWindow } from "./window.js";

describe("buildPrefixSums / windowFromPrefix", () => {
  it("matches computeVariableWindow results", () => {
    const sizes = [100, 200, 100, 100];
    const prefix = buildPrefixSums(sizes);
    const a = windowFromPrefix(prefix, 100, 150, 0);
    const b = computeVariableWindow({
      scrollOffset: 100,
      viewportSize: 150,
      sizes,
      overscan: 0,
    });
    expect(a).toEqual(b);
    expect(offsetOf(prefix, 1)).toBe(100);
  });

  it("handles empty", () => {
    const prefix = buildPrefixSums([]);
    const w = windowFromPrefix(prefix, 0, 100, 2);
    expect(w.endIndex).toBe(-1);
    expect(w.totalSize).toBe(0);
  });
});

describe("expandWindowForPins", () => {
  it("expands continuous range to cover pins", () => {
    const r = expandWindowForPins(10, 15, 100, [3, 20]);
    expect(r.startIndex).toBe(3);
    expect(r.endIndex).toBe(20);
  });

  it("ignores out-of-range pins", () => {
    const r = expandWindowForPins(5, 8, 10, [-1, 99, 6]);
    expect(r.startIndex).toBe(5);
    expect(r.endIndex).toBe(8);
  });
});

describe("computePads", () => {
  it("splits total into padStart, middle, padEnd", () => {
    const prefix = buildPrefixSums([10, 20, 30, 40]);
    // window indices 1..2 → middle = 20+30 = 50, padStart=10, padEnd=40
    const pads = computePads(prefix, 1, 2);
    expect(pads.padStart).toBe(10);
    expect(pads.padEnd).toBe(40);
    expect(pads.totalSize).toBe(100);
  });
});
