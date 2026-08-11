/**
 * Regression tests for formula engine defense-in-depth fixes.
 * M1 – wildcard matcher step cap
 * M2 – SUBSTITUTE output length cap
 * M3 – deps.ts large-integer overflow guard
 * L1 – INDIRECT range bounds check
 * L3 – MIN/MAX large-array reduce (no V8 spread limit)
 */
import { describe, expect, it } from "vitest";
import { evaluateAst } from "./evaluate.js";
import { isFormulaError } from "./errors.js";
import { parseFormula } from "./parser.js";
import { mergeFormulaLimits } from "./limits.js";
import type { EvalContext, FormulaValue } from "./types.js";
import { collectDeps } from "./deps.js";
import { mathFunctions } from "./functions/math.js";

function makeCtx(
  cells: FormulaValue[][],
  overrides: Partial<EvalContext> = {},
): EvalContext {
  const limits = mergeFormulaLimits();
  const rowCount = cells.length || 1;
  const colCount = cells[0]?.length || 1;
  const base: EvalContext = {
    rowCount,
    colCount,
    getCellValue(r, c) {
      return cells[r]?.[c] ?? null;
    },
    getRange(r1, c1, r2, c2) {
      const out: FormulaValue[][] = [];
      for (let r = r1; r <= r2; r++) {
        const row: FormulaValue[] = [];
        for (let c = c1; c <= c2; c++) row.push(cells[r]?.[c] ?? null);
        out.push(row);
      }
      return out;
    },
    limits,
    budget: {
      cellsTouched: 0,
      startedAt: Date.now(),
      cellDeadline: Date.now() + limits.maxEvalMsPerCell,
    },
    allowIndirect: false,
    allowVolatile: true,
    now: () => new Date("2026-08-09T12:00:00Z"),
    rng: () => 0.5,
  };
  return { ...base, ...overrides };
}

function evalIn(
  source: string,
  cells: FormulaValue[][],
  ctxOverrides: Partial<EvalContext> = {},
): FormulaValue {
  const parsed = parseFormula(source);
  if (!parsed.ok) return parsed.error;
  return evaluateAst(parsed.ast, makeCtx(cells, ctxOverrides));
}

// ── M1 ──────────────────────────────────────────────────────────────────────

describe("security: M1 — wildcard matcher step cap", () => {
  it("gives up rather than hanging on adversarial pattern", () => {
    // Pattern designed to cause many backtrack steps on a long string.
    // The cap at MAX_MATCH_STEPS returns false quickly rather than hanging.
    const text = "a".repeat(500);
    const pattern = "*a".repeat(60) + "b"; // impossible match; many star resets
    const grid: FormulaValue[][] = [[text]];
    const start = Date.now();
    const result = evalIn(`=COUNTIF(A1:A1,"${pattern}")`, grid);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
    // Returns 0 because the pattern doesn't match (matcher gave up or correctly failed)
    expect(result).toBe(0);
  });
});

// ── M2 ──────────────────────────────────────────────────────────────────────

describe("security: M2 — SUBSTITUTE output length cap", () => {
  it("returns #VALUE! when global replace would exceed maxStringLength", () => {
    // Each "x" replaced with 32768 "y"s → projected output ~1 GB. Must error.
    const bigStr = "x".repeat(32_768);
    const bigRep = "y".repeat(32_768);
    const grid: FormulaValue[][] = [[bigStr], [bigRep]];
    const result = evalIn(`=SUBSTITUTE(A1,"x",A2)`, grid);
    expect(isFormulaError(result)).toBe(true);
    if (isFormulaError(result)) {
      expect(result.type).toBe("VALUE");
    }
  });

  it("small SUBSTITUTE still works correctly", () => {
    const grid: FormulaValue[][] = [["hello world"]];
    const result = evalIn(`=SUBSTITUTE(A1,"world","earth")`, grid);
    expect(result).toBe("hello earth");
  });
});

// ── M3 ──────────────────────────────────────────────────────────────────────

describe("security: M3 — deps.ts large-integer overflow guard", () => {
  it("collectDeps with a huge range falls back to corners and does not hang", () => {
    // 99999 rows × 1000 cols = ~100M cells — far exceeds maxRangeCells (100_000)
    const fakeAst = {
      type: "range" as const,
      r1: 0,
      c1: 0,
      r2: 99_998,
      c2: 999,
    };
    const start = Date.now();
    const info = collectDeps(fakeAst as Parameters<typeof collectDeps>[0], 100_000);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
    // Corner-only fallback → exactly 2 unique corner keys
    expect(info.deps).toHaveLength(2);
  });

  it("collectDeps with non-finite dimensions falls back to corners", () => {
    const fakeAst = {
      type: "range" as const,
      r1: 0,
      c1: 0,
      r2: Number.MAX_SAFE_INTEGER,
      c2: Number.MAX_SAFE_INTEGER,
    };
    const start = Date.now();
    const info = collectDeps(fakeAst as Parameters<typeof collectDeps>[0], 100_000);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
    expect(info.deps).toHaveLength(2);
  });
});

// ── L1 ──────────────────────────────────────────────────────────────────────

describe("security: L1 — INDIRECT range out-of-bounds", () => {
  it("returns #REF! when referenced range exceeds grid column bounds", () => {
    // Grid is 5 rows × 5 cols; Z is column 25 — out of bounds
    const cells: FormulaValue[][] = Array.from({ length: 5 }, () =>
      Array<FormulaValue>(5).fill(0),
    );
    const result = evalIn(`=INDIRECT("A1:Z5")`, cells, {
      allowIndirect: true,
      rowCount: 5,
      colCount: 5,
    });
    expect(isFormulaError(result)).toBe(true);
    if (isFormulaError(result)) {
      expect(result.type).toBe("REF");
    }
  });

  it("INDIRECT with in-bounds 2×2 range sums correctly", () => {
    const cells: FormulaValue[][] = [
      [1, 2],
      [3, 4],
    ];
    const result = evalIn(`=SUM(INDIRECT("A1:B2"))`, cells, {
      allowIndirect: true,
      rowCount: 2,
      colCount: 2,
    });
    expect(result).toBe(10);
  });
});

// ── L3 ──────────────────────────────────────────────────────────────────────

describe("security: L3 — MIN/MAX with large arrays (no V8 spread limit)", () => {
  it("MIN on 70 000 numbers returns the correct minimum without RangeError", () => {
    const count = 70_000;
    const row: FormulaValue[] = Array.from({ length: count }, (_, i) => i + 1);
    row[12_345] = -999; // planted minimum
    const limits = mergeFormulaLimits();
    const ctx = makeCtx([[]], { limits });
    const minFn = mathFunctions.find((f) => f.name === "MIN")!;
    let minResult: FormulaValue;
    expect(() => {
      minResult = minFn.impl([row], ctx);
    }).not.toThrow();
    expect(minResult!).toBe(-999);
  });

  it("MAX on 70 000 numbers returns the correct maximum without RangeError", () => {
    const count = 70_000;
    const row: FormulaValue[] = Array.from({ length: count }, (_, i) => i + 1);
    row[50_000] = 999_999; // planted maximum
    const limits = mergeFormulaLimits();
    const ctx = makeCtx([[]], { limits });
    const maxFn = mathFunctions.find((f) => f.name === "MAX")!;
    let maxResult: FormulaValue;
    expect(() => {
      maxResult = maxFn.impl([row], ctx);
    }).not.toThrow();
    expect(maxResult!).toBe(999_999);
  });
});
