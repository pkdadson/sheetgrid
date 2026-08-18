import { datetimeFunctions } from "./datetime.js";
import { financialFunctions } from "./financial.js";
import { infoFunctions } from "./info.js";
import { logicalFunctions } from "./logical.js";
import { lookupFunctions } from "./lookup.js";
import { mathFunctions } from "./math.js";
import { statsFunctions } from "./stats.js";
import { textFunctions } from "./text.js";
import type { FormulaFnDef } from "./types.js";

const REGISTRY = new Map<string, FormulaFnDef>();

export function registerFunctions(defs: FormulaFnDef[]): void {
  for (const d of defs) {
    REGISTRY.set(d.name.toUpperCase(), d);
  }
}

export function getFunction(name: string): FormulaFnDef | undefined {
  return REGISTRY.get(name.toUpperCase());
}

export function listFunctions(): readonly string[] {
  return Object.freeze([...REGISTRY.keys()].sort());
}

registerFunctions([
  ...logicalFunctions,
  ...mathFunctions,
  ...statsFunctions,
  ...textFunctions,
  ...infoFunctions,
  ...lookupFunctions,
  ...datetimeFunctions,
  ...financialFunctions,
]);
