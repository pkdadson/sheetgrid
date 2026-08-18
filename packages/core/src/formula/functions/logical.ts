import { flattenValues, toBoolean } from "../coerce.js";
import { formulaError, isFormulaError } from "../errors.js";
import type { FormulaValue } from "../types.js";
import type { FormulaFnDef } from "./types.js";

function firstError(...vals: FormulaValue[]): FormulaValue | null {
  for (const v of vals) {
    if (isFormulaError(v)) return v;
    if (Array.isArray(v)) {
      for (const x of flattenValues(v)) {
        if (isFormulaError(x)) return x;
      }
    }
  }
  return null;
}

export const logicalFunctions: FormulaFnDef[] = [
  {
    name: "IF",
    minArgs: 2,
    maxArgs: 3,
    impl: (args) => {
      const cond = toBoolean(args[0]!);
      if (isFormulaError(cond)) return cond;
      if (cond) return args[1] ?? null;
      return args.length >= 3 ? (args[2] ?? false) : false;
    },
  },
  {
    name: "IFS",
    minArgs: 2,
    maxArgs: Number.POSITIVE_INFINITY,
    impl: (args) => {
      if (args.length % 2 !== 0) {
        return formulaError("VALUE", "IFS requires pairs");
      }
      for (let i = 0; i < args.length; i += 2) {
        const cond = toBoolean(args[i]!);
        if (isFormulaError(cond)) return cond;
        if (cond) return args[i + 1] ?? null;
      }
      return formulaError("NA", "No IFS condition matched");
    },
  },
  {
    name: "IFERROR",
    minArgs: 2,
    maxArgs: 2,
    impl: (args) => (isFormulaError(args[0]!) ? (args[1] ?? null) : args[0]!),
  },
  {
    name: "IFNA",
    minArgs: 2,
    maxArgs: 2,
    impl: (args) => {
      const v = args[0]!;
      if (isFormulaError(v) && v.type === "NA") return args[1] ?? null;
      return v;
    },
  },
  {
    name: "AND",
    minArgs: 1,
    maxArgs: Number.POSITIVE_INFINITY,
    impl: (args) => {
      for (const a of args) {
        for (const v of flattenValues(a)) {
          const b = toBoolean(v);
          if (isFormulaError(b)) return b;
          if (!b) return false;
        }
      }
      return true;
    },
  },
  {
    name: "OR",
    minArgs: 1,
    maxArgs: Number.POSITIVE_INFINITY,
    impl: (args) => {
      for (const a of args) {
        for (const v of flattenValues(a)) {
          const b = toBoolean(v);
          if (isFormulaError(b)) return b;
          if (b) return true;
        }
      }
      return false;
    },
  },
  {
    name: "NOT",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const b = toBoolean(args[0]!);
      if (isFormulaError(b)) return b;
      return !b;
    },
  },
  {
    name: "XOR",
    minArgs: 1,
    maxArgs: Number.POSITIVE_INFINITY,
    impl: (args) => {
      let count = 0;
      for (const a of args) {
        for (const v of flattenValues(a)) {
          const b = toBoolean(v);
          if (isFormulaError(b)) return b;
          if (b) count++;
        }
      }
      return count % 2 === 1;
    },
  },
  {
    name: "TRUE",
    minArgs: 0,
    maxArgs: 0,
    impl: () => true,
  },
  {
    name: "FALSE",
    minArgs: 0,
    maxArgs: 0,
    impl: () => false,
  },
  {
    name: "SWITCH",
    minArgs: 3,
    maxArgs: Number.POSITIVE_INFINITY,
    impl: (args) => {
      const expr = args[0]!;
      const err = firstError(expr);
      if (err) return err;
      let defaultVal: FormulaValue | undefined;
      let i = 1;
      while (i < args.length) {
        if (i === args.length - 1) {
          defaultVal = args[i];
          break;
        }
        const match = args[i]!;
        const result = args[i + 1]!;
        // loose equality via string form
        const a = isFormulaError(expr)
          ? expr
          : String(expr instanceof Date ? expr.getTime() : expr);
        const b = isFormulaError(match)
          ? match
          : String(match instanceof Date ? match.getTime() : match);
        if (!isFormulaError(a) && !isFormulaError(b) && a === b) return result;
        i += 2;
      }
      return defaultVal ?? formulaError("NA", "No SWITCH match");
    },
  },
];
