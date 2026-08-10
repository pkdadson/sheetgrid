import { describe, expect, it } from "vitest";
import { matchesCriteria } from "./criteria.js";

describe("matchesCriteria — wildcards", () => {
  it("matches literal text", () => {
    expect(matchesCriteria("hello", "hello")).toBe(true);
    expect(matchesCriteria("hello", "world")).toBe(false);
  });

  it("* matches any number of characters (including zero)", () => {
    expect(matchesCriteria("hello", "h*o")).toBe(true);
    expect(matchesCriteria("ho", "h*o")).toBe(true);
    expect(matchesCriteria("hello", "*")).toBe(true);
    expect(matchesCriteria("hello", "hello*")).toBe(true);
    expect(matchesCriteria("hello", "*hello")).toBe(true);
  });

  it("? matches exactly one character", () => {
    expect(matchesCriteria("hello", "hell?")).toBe(true);
    expect(matchesCriteria("hell", "hell?")).toBe(false);
    expect(matchesCriteria("helloo", "hell?")).toBe(false);
  });

  it("~ escapes wildcards", () => {
    expect(matchesCriteria("a*b", "a~*b")).toBe(true);
    expect(matchesCriteria("a?b", "a~?b")).toBe(true);
    expect(matchesCriteria("axb", "a~*b")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(matchesCriteria("Hello", "hello")).toBe(true);
    expect(matchesCriteria("HELLO", "h*O")).toBe(true);
  });

  it("returns false on trailing text after fixed pattern", () => {
    expect(matchesCriteria("hellox", "hello")).toBe(false);
  });

  // Regression test for the exponential-backtracking DoS (GHSA-TBD):
  // Pattern with many "*" segments followed by a literal that never matches
  // used to take O(2^n) with the recursive matcher. The iterative two-pointer
  // implementation runs in O(m*n) — this should complete in a few ms.
  it("wildcard: pathological pattern completes in linear time (no exponential backtracking)", () => {
    const pattern = `${"*a".repeat(20)}*b`;
    const text = "a".repeat(200);
    const start = performance.now();
    const result = matchesCriteria(text, pattern);
    const elapsed = performance.now() - start;
    expect(result).toBe(false);
    // Old recursive matcher blows past 5+ seconds here; iterative runs in <50ms.
    // Use a generous 500ms bound to avoid CI flakiness while still catching regression.
    expect(elapsed).toBeLessThan(500);
  });

  it("wildcard: pathological pattern DOES match when target is present", () => {
    const pattern = `${"*a".repeat(20)}*b`;
    const text = `${"a".repeat(200)}b`;
    const start = performance.now();
    const result = matchesCriteria(text, pattern);
    const elapsed = performance.now() - start;
    expect(result).toBe(true);
    expect(elapsed).toBeLessThan(500);
  });
});
