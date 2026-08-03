import { describe, expect, it } from "vitest";
import { evaluateAst } from "./evaluate.js";
import { formulaError, isFormulaError } from "./errors.js";
import { listFunctions } from "./functions/index.js";
import { tokenize } from "./lexer.js";
import { defaultFormulaLimits, mergeFormulaLimits } from "./limits.js";
import { parseFormula } from "./parser.js";
import type { EvalContext, FormulaValue } from "./types.js";

function gridCtx(cells: FormulaValue[][]): EvalContext {
  const limits = mergeFormulaLimits();
  return {
    rowCount: cells.length,
    colCount: cells[0]?.length ?? 0,
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
    now: () => new Date("2026-08-02T12:00:00Z"),
    rng: () => 0.5,
  };
}

function evalEq(source: string, grid: FormulaValue[][] = [[]]) {
  const parsed = parseFormula(source);
  if (!parsed.ok) throw new Error(`parse failed: ${parsed.error.type}`);
  return evaluateAst(parsed.ast, gridCtx(grid));
}

describe("formula engine", () => {
  it("tokenizes and parses arithmetic", () => {
    const tokens = tokenize("=1+2*3", defaultFormulaLimits);
    expect(tokens.ok).toBe(true);
    expect(evalEq("=1+2*3")).toBe(7);
  });

  it("divides by zero as DIV0", () => {
    const v = evalEq("=1/0");
    expect(isFormulaError(v) && v.type === "DIV0").toBe(true);
  });

  it("reads cell refs", () => {
    expect(evalEq("=A1+B1", [[1, 2]])).toBe(3);
  });

  it("SUM range", () => {
    expect(evalEq("=SUM(A1:A3)", [[1], [2], [3]])).toBe(6);
  });

  it("IF", () => {
    expect(evalEq("=IF(TRUE,1,2)")).toBe(1);
    expect(evalEq("=IF(FALSE,1,2)")).toBe(2);
  });

  it("unknown function is NAME", () => {
    const v = evalEq("=NOPE(1)");
    expect(isFormulaError(v) && v.type === "NAME").toBe(true);
  });

  it("INDIRECT is off by default", () => {
    const v = evalEq('=INDIRECT("A1")', [[42]]);
    expect(isFormulaError(v) && v.type === "REF").toBe(true);
  });

  it("does not eval JS-looking sources", () => {
    for (const src of ["=eval(1)", "=constructor"]) {
      const r = parseFormula(src);
      if (r.ok) {
        const v = evaluateAst(r.ast, gridCtx([[]]));
        expect(v).not.toBe(1);
      }
    }
  });

  it("registers a full allowlist of functions", () => {
    const names = listFunctions();
    expect(names).toContain("SUM");
    expect(names).toContain("VLOOKUP");
    expect(names).toContain("PMT");
    expect(names).not.toContain("EVAL");
    expect(names.length).toBeGreaterThan(80);
  });

  it("TEXTJOIN and REPT respect limits via REPT", () => {
    const v = evalEq('=REPT("a", 10)');
    expect(v).toBe("aaaaaaaaaa");
  });

  it("COUNTIF criteria", () => {
    expect(evalEq('=COUNTIF(A1:A3,">1")', [[1], [2], [3]])).toBe(2);
  });

  it("fuzz malformed input never throws", () => {
    const samples = [
      "=",
      "==",
      "=(",
      "=((((",
      '="unterminated',
      "=A",
      "=++++++++1",
    ];
    for (const s of samples) {
      expect(() => {
        const r = parseFormula(s);
        if (r.ok) evaluateAst(r.ast, gridCtx([[1]]));
      }).not.toThrow();
    }
  });

  it("rejects sheet references", () => {
    expect(parseFormula("=Sheet1!A1").ok).toBe(false);
  });
});

describe("recalc cycles", () => {
  it("detects simple cycles", async () => {
    const { recalcFormulas } = await import("./recalc.js");
    const formulas = new Map();
    formulas.set("0:0", {
      source: "=B1",
      deps: [],
      volatile: false,
      result: null as FormulaValue,
    });
    formulas.set("0:1", {
      source: "=A1",
      deps: [],
      volatile: false,
      result: null as FormulaValue,
    });
    const results = new Map<string, FormulaValue>();
    recalcFormulas({
      formulas,
      dirty: ["0:0", "0:1"],
      rowCount: 1,
      colCount: 2,
      getLiteral: () => null,
      setResult: (r, c, v) => {
        results.set(`${r}:${c}`, v);
      },
    });
    expect(isFormulaError(results.get("0:0")!) && results.get("0:0")).toBeTruthy();
    expect(
      isFormulaError(results.get("0:0")!) &&
        (results.get("0:0") as ReturnType<typeof formulaError>).type ===
          "CYCLE",
    ).toBe(true);
  });
});
