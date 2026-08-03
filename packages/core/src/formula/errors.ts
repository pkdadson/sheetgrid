import type { FormulaError, FormulaErrorType, FormulaValue } from "./types.js";

const TOKENS: Record<FormulaErrorType, string> = {
  DIV0: "#DIV/0!",
  VALUE: "#VALUE!",
  REF: "#REF!",
  NAME: "#NAME?",
  NA: "#N/A",
  NUM: "#NUM!",
  CYCLE: "#CYCLE!",
  LIMIT: "#LIMIT!",
  PARSE: "#PARSE!",
};

export function formulaError(
  type: FormulaErrorType,
  message?: string,
): FormulaError {
  return { __formulaError: true, type, message };
}

export function isFormulaError(v: unknown): v is FormulaError {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as FormulaError).__formulaError === true &&
    typeof (v as FormulaError).type === "string"
  );
}

export function formatFormulaError(err: FormulaError): string {
  return TOKENS[err.type] ?? "#ERROR!";
}

/** Value written into row.values for display/export */
export function formulaDisplayValue(result: FormulaValue): unknown {
  if (isFormulaError(result)) return formatFormulaError(result);
  if (Array.isArray(result)) {
    const first = result[0];
    if (Array.isArray(first)) {
      return formulaDisplayValue(first[0] as FormulaValue);
    }
    return formulaDisplayValue(first as FormulaValue);
  }
  return result;
}
