import type { EvalContext, FormulaValue } from "../types.js";

export type FormulaFn = (
  args: FormulaValue[],
  ctx: EvalContext,
) => FormulaValue;

export interface FormulaFnDef {
  name: string;
  minArgs: number;
  maxArgs: number;
  volatile?: boolean;
  impl: FormulaFn;
}
