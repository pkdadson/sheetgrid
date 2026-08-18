import { describe, expect, it } from "vitest";
import {
  formatFormulaError,
  formulaDisplayValue,
  formulaError,
  isFormulaError,
} from "./errors.js";

describe("formula errors", () => {
  it("formats known error types as Excel-like tokens", () => {
    expect(formatFormulaError(formulaError("DIV0"))).toBe("#DIV/0!");
    expect(formatFormulaError(formulaError("NAME"))).toBe("#NAME?");
    expect(formatFormulaError(formulaError("CYCLE"))).toBe("#CYCLE!");
    expect(formatFormulaError(formulaError("LIMIT"))).toBe("#LIMIT!");
    expect(formatFormulaError(formulaError("PARSE"))).toBe("#PARSE!");
  });

  it("isFormulaError narrows structured errors only", () => {
    expect(isFormulaError(formulaError("VALUE"))).toBe(true);
    expect(isFormulaError("#VALUE!")).toBe(false);
    expect(isFormulaError(null)).toBe(false);
  });

  it("formulaDisplayValue formats errors and unwraps arrays", () => {
    expect(formulaDisplayValue(formulaError("NA"))).toBe("#N/A");
    expect(formulaDisplayValue([[42]])).toBe(42);
  });
});
