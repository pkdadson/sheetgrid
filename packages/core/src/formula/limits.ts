import type { FormulaLimits } from "./types.js";

export const defaultFormulaLimits: FormulaLimits = {
  maxSourceLength: 10_000,
  maxTokens: 2_000,
  maxAstDepth: 64,
  maxRangeCells: 100_000,
  maxCellsTouched: 500_000,
  maxStringLength: 32_768,
  maxFactN: 170,
  maxOffsetSize: 10_000,
  maxEvalMsPerCell: 50,
  maxEvalMsPerBatch: 2_000,
};

export function mergeFormulaLimits(
  partial?: Partial<FormulaLimits>,
): FormulaLimits {
  return { ...defaultFormulaLimits, ...partial };
}
