import { isBlank, toNumber } from "../coerce.js";
import { formulaError, isFormulaError } from "../errors.js";
import type { FormulaFnDef } from "./types.js";

export const infoFunctions: FormulaFnDef[] = [
  {
    name: "ISBLANK",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => isBlank(args[0]!),
  },
  {
    name: "ISNUMBER",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => typeof args[0] === "number" && Number.isFinite(args[0]),
  },
  {
    name: "ISTEXT",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => typeof args[0] === "string",
  },
  {
    name: "ISLOGICAL",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => typeof args[0] === "boolean",
  },
  {
    name: "ISERROR",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => isFormulaError(args[0]),
  },
  {
    name: "ISERR",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => isFormulaError(args[0]) && args[0].type !== "NA",
  },
  {
    name: "ISNA",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => isFormulaError(args[0]) && args[0].type === "NA",
  },
  {
    name: "TYPE",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const v = args[0]!;
      if (typeof v === "number") return 1;
      if (typeof v === "string") return 2;
      if (typeof v === "boolean") return 4;
      if (isFormulaError(v)) return 16;
      if (Array.isArray(v)) return 64;
      return 1;
    },
  },
  {
    name: "N",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const v = args[0]!;
      if (typeof v === "number") return v;
      if (typeof v === "boolean") return v ? 1 : 0;
      if (isFormulaError(v)) return v;
      if (v instanceof Date) return toNumber(v);
      return 0;
    },
  },
  {
    name: "NA",
    minArgs: 0,
    maxArgs: 0,
    impl: () => formulaError("NA"),
  },
  {
    name: "ERROR.TYPE",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const v = args[0]!;
      if (!isFormulaError(v)) return formulaError("NA");
      const map: Record<string, number> = {
        NULL: 1,
        DIV0: 2,
        VALUE: 3,
        REF: 4,
        NAME: 5,
        NUM: 6,
        NA: 7,
      };
      return map[v.type] ?? 1;
    },
  },
];
