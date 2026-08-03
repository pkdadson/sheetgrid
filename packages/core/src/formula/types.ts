export type FormulaErrorType =
  | "DIV0"
  | "VALUE"
  | "REF"
  | "NAME"
  | "NA"
  | "NUM"
  | "CYCLE"
  | "LIMIT"
  | "PARSE";

export interface FormulaError {
  readonly __formulaError: true;
  type: FormulaErrorType;
  message?: string;
}

/** Runtime formula values (never raw host objects beyond Date). */
export type FormulaValue =
  | string
  | number
  | boolean
  | null
  | Date
  | FormulaError
  | FormulaValue[];

export interface FormulaLimits {
  maxSourceLength: number;
  maxTokens: number;
  maxAstDepth: number;
  maxRangeCells: number;
  maxCellsTouched: number;
  maxStringLength: number;
  maxFactN: number;
  maxOffsetSize: number;
  maxEvalMsPerCell: number;
  maxEvalMsPerBatch: number;
}

export interface FormulaEngineOptions {
  limits?: Partial<FormulaLimits>;
  allowIndirect?: boolean;
  allowVolatile?: boolean;
}

export interface EvalBudget {
  cellsTouched: number;
  startedAt: number;
  cellDeadline: number;
}

export interface EvalContext {
  /** 0-based row/col indices in current grid order */
  getCellValue(rowIndex: number, colIndex: number): FormulaValue;
  getRange(
    r1: number,
    c1: number,
    r2: number,
    c2: number,
  ): FormulaValue[][];
  rowCount: number;
  colCount: number;
  limits: FormulaLimits;
  budget: EvalBudget;
  allowIndirect: boolean;
  allowVolatile: boolean;
  now: () => Date;
  rng: () => number;
}

export interface FormulaRecord {
  source: string;
  result: FormulaValue;
  /** Serialized deps as "rowIndex:colIndex" */
  deps: string[];
  volatile: boolean;
}
