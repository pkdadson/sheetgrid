import { describe, expect, it } from "vitest";
import { createSizeCache } from "./size-cache.js";

describe("createSizeCache", () => {
  it("prefers measured over estimate", () => {
    const cache = createSizeCache({ defaultEstimate: 40 });
    cache.setEstimate("a", 50);
    expect(cache.getOrEstimate("a")).toBe(50);
    expect(cache.setMeasured("a", 80)).toBe(true);
    expect(cache.getOrEstimate("a", 50)).toBe(80);
    cache.setEstimate("a", 10); // must not clobber measure
    expect(cache.get("a")).toBe(80);
  });

  it("setMeasured returns false when unchanged", () => {
    const cache = createSizeCache();
    expect(cache.setMeasured("x", 32)).toBe(true);
    expect(cache.setMeasured("x", 32)).toBe(false);
  });

  it("buildSizes aligns to keys with estimates for misses", () => {
    const cache = createSizeCache();
    cache.setMeasured("b", 100);
    const sizes = cache.buildSizes(["a", "b", "c"], (i) => 10 + i);
    expect(sizes).toEqual([10, 100, 12]);
  });

  it("invalidate clears a key", () => {
    const cache = createSizeCache({ defaultEstimate: 40 });
    cache.setMeasured("a", 90);
    cache.invalidate("a");
    expect(cache.get("a")).toBeUndefined();
    expect(cache.getOrEstimate("a")).toBe(40);
  });
});
