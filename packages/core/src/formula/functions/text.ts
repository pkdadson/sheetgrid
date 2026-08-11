import { toNumber, toStringValue } from "../coerce.js";
import { formulaError, isFormulaError } from "../errors.js";
import type { EvalContext, FormulaValue } from "../types.js";
import type { FormulaFnDef } from "./types.js";

function str(v: FormulaValue): string | ReturnType<typeof formulaError> {
  return toStringValue(v);
}

function capString(s: string, ctx: EvalContext): FormulaValue {
  if (s.length > ctx.limits.maxStringLength) {
    return formulaError("LIMIT", "String too long");
  }
  return s;
}

export const textFunctions: FormulaFnDef[] = [
  {
    name: "LEN",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const s = str(args[0]!);
      if (isFormulaError(s)) return s;
      return s.length;
    },
  },
  {
    name: "LEFT",
    minArgs: 1,
    maxArgs: 2,
    impl: (args) => {
      const s = str(args[0]!);
      if (isFormulaError(s)) return s;
      const n = args[1] !== undefined ? toNumber(args[1]) : 1;
      if (isFormulaError(n)) return n;
      return s.slice(0, Math.max(0, Math.trunc(n)));
    },
  },
  {
    name: "RIGHT",
    minArgs: 1,
    maxArgs: 2,
    impl: (args) => {
      const s = str(args[0]!);
      if (isFormulaError(s)) return s;
      const n = args[1] !== undefined ? toNumber(args[1]) : 1;
      if (isFormulaError(n)) return n;
      const k = Math.max(0, Math.trunc(n));
      return s.slice(Math.max(0, s.length - k));
    },
  },
  {
    name: "MID",
    minArgs: 3,
    maxArgs: 3,
    impl: (args) => {
      const s = str(args[0]!);
      if (isFormulaError(s)) return s;
      const start = toNumber(args[1]!);
      const len = toNumber(args[2]!);
      if (isFormulaError(start)) return start;
      if (isFormulaError(len)) return len;
      const i = Math.max(0, Math.trunc(start) - 1);
      return s.slice(i, i + Math.max(0, Math.trunc(len)));
    },
  },
  {
    name: "UPPER",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const s = str(args[0]!);
      return isFormulaError(s) ? s : s.toUpperCase();
    },
  },
  {
    name: "LOWER",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const s = str(args[0]!);
      return isFormulaError(s) ? s : s.toLowerCase();
    },
  },
  {
    name: "PROPER",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const s = str(args[0]!);
      if (isFormulaError(s)) return s;
      return s.toLowerCase().replace(/(^|[^a-zA-Z])([a-zA-Z])/g, (_, a, b) => a + b.toUpperCase());
    },
  },
  {
    name: "TRIM",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const s = str(args[0]!);
      if (isFormulaError(s)) return s;
      return s.trim().replace(/\s+/g, " ");
    },
  },
  {
    name: "CLEAN",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const s = str(args[0]!);
      if (isFormulaError(s)) return s;
      let out = "";
      for (let i = 0; i < s.length; i++) {
        const code = s.charCodeAt(i);
        if (code >= 32) out += s[i];
      }
      return out;
    },
  },
  {
    name: "CONCAT",
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args, ctx) => {
      let out = "";
      for (const a of args) {
        const s = str(a);
        if (isFormulaError(s)) return s;
        out += s;
        if (out.length > ctx.limits.maxStringLength) {
          return formulaError("LIMIT", "String too long");
        }
      }
      return out;
    },
  },
  {
    name: "CONCATENATE",
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args, ctx) => {
      const def = textFunctions.find((f) => f.name === "CONCAT")!;
      return def.impl(args, ctx);
    },
  },
  {
    name: "TEXTJOIN",
    minArgs: 3,
    maxArgs: Infinity,
    impl: (args, ctx) => {
      const delim = str(args[0]!);
      if (isFormulaError(delim)) return delim;
      const ignoreEmpty = args[1] === true || args[1] === 1 || args[1] === "TRUE";
      const parts: string[] = [];
      for (let i = 2; i < args.length; i++) {
        const s = str(args[i]!);
        if (isFormulaError(s)) return s;
        if (ignoreEmpty && s === "") continue;
        parts.push(s);
      }
      return capString(parts.join(delim), ctx);
    },
  },
  {
    name: "REPLACE",
    minArgs: 4,
    maxArgs: 4,
    impl: (args) => {
      const s = str(args[0]!);
      if (isFormulaError(s)) return s;
      const start = toNumber(args[1]!);
      const len = toNumber(args[2]!);
      const rep = str(args[3]!);
      if (isFormulaError(start)) return start;
      if (isFormulaError(len)) return len;
      if (isFormulaError(rep)) return rep;
      const i = Math.max(0, Math.trunc(start) - 1);
      const n = Math.max(0, Math.trunc(len));
      return s.slice(0, i) + rep + s.slice(i + n);
    },
  },
  {
    name: "SUBSTITUTE",
    minArgs: 3,
    maxArgs: 4,
    impl: (args, ctx) => {
      const s = str(args[0]!);
      const oldS = str(args[1]!);
      const newS = str(args[2]!);
      if (isFormulaError(s) || isFormulaError(oldS) || isFormulaError(newS)) {
        return isFormulaError(s) ? s : isFormulaError(oldS) ? oldS : newS;
      }
      if (oldS === "") return s;
      const instance =
        args[3] !== undefined ? toNumber(args[3]) : null;
      if (instance !== null && isFormulaError(instance)) return instance;
      if (instance === null) {
        // M2: guard against output exceeding maxStringLength before allocating
        const parts = s.split(oldS);
        const occurrences = parts.length - 1;
        const projectedSize =
          s.length + occurrences * (newS.length - oldS.length);
        if (projectedSize > ctx.limits.maxStringLength) {
          return formulaError("VALUE", "SUBSTITUTE result exceeds max string length");
        }
        return parts.join(newS);
      }
      let count = 0;
      let out = "";
      let i = 0;
      const target = Math.trunc(instance as number);
      while (i < s.length) {
        if (s.startsWith(oldS, i)) {
          count++;
          if (count === target) {
            // M2: guard instance-specific substitution output
            const projected = out.length + newS.length + (s.length - i - oldS.length);
            if (projected > ctx.limits.maxStringLength) {
              return formulaError("VALUE", "SUBSTITUTE result exceeds max string length");
            }
            out += newS;
            i += oldS.length;
            out += s.slice(i);
            return out;
          }
          out += oldS;
          i += oldS.length;
        } else {
          out += s[i];
          i++;
        }
      }
      return s;
    },
  },
  {
    name: "FIND",
    minArgs: 2,
    maxArgs: 3,
    impl: (args) => {
      const find = str(args[0]!);
      const within = str(args[1]!);
      if (isFormulaError(find) || isFormulaError(within)) {
        return isFormulaError(find) ? find : within;
      }
      const start = args[2] !== undefined ? toNumber(args[2]) : 1;
      if (isFormulaError(start)) return start;
      const i = within.indexOf(find, Math.max(0, Math.trunc(start) - 1));
      if (i < 0) return formulaError("VALUE", "Not found");
      return i + 1;
    },
  },
  {
    name: "SEARCH",
    minArgs: 2,
    maxArgs: 3,
    impl: (args) => {
      const find = str(args[0]!);
      const within = str(args[1]!);
      if (isFormulaError(find) || isFormulaError(within)) {
        return isFormulaError(find) ? find : within;
      }
      const start = args[2] !== undefined ? toNumber(args[2]) : 1;
      if (isFormulaError(start)) return start;
      const i = within
        .toLowerCase()
        .indexOf(find.toLowerCase(), Math.max(0, Math.trunc(start) - 1));
      if (i < 0) return formulaError("VALUE", "Not found");
      return i + 1;
    },
  },
  {
    name: "EXACT",
    minArgs: 2,
    maxArgs: 2,
    impl: (args) => {
      const a = str(args[0]!);
      const b = str(args[1]!);
      if (isFormulaError(a) || isFormulaError(b)) {
        return isFormulaError(a) ? a : b;
      }
      return a === b;
    },
  },
  {
    name: "REPT",
    minArgs: 2,
    maxArgs: 2,
    impl: (args, ctx) => {
      const s = str(args[0]!);
      const n = toNumber(args[1]!);
      if (isFormulaError(s)) return s;
      if (isFormulaError(n)) return n;
      const times = Math.max(0, Math.trunc(n));
      if (s.length * times > ctx.limits.maxStringLength) {
        return formulaError("LIMIT", "REPT too large");
      }
      return s.repeat(times);
    },
  },
  {
    name: "TEXT",
    minArgs: 1,
    maxArgs: 2,
    impl: (args) => {
      // Simplified: return number as string; format string ignored beyond basic
      const n = toNumber(args[0]!);
      if (isFormulaError(n)) {
        const s = str(args[0]!);
        return s;
      }
      return String(n);
    },
  },
  {
    name: "VALUE",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => toNumber(args[0]!),
  },
  {
    name: "T",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const v = args[0]!;
      if (typeof v === "string") return v;
      return "";
    },
  },
  {
    name: "CHAR",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const n = toNumber(args[0]!);
      if (isFormulaError(n)) return n;
      const code = Math.trunc(n);
      if (code < 1 || code > 255) return formulaError("VALUE");
      return String.fromCharCode(code);
    },
  },
  {
    name: "CODE",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const s = str(args[0]!);
      if (isFormulaError(s)) return s;
      if (s.length === 0) return formulaError("VALUE");
      return s.charCodeAt(0);
    },
  },
];
