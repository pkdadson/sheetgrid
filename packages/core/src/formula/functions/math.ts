import { flattenValues, toNumber } from "../coerce.js";
import { formulaError, isFormulaError } from "../errors.js";
import type { EvalContext, FormulaValue } from "../types.js";
import type { FormulaFnDef } from "./types.js";

function numsFromArgs(args: FormulaValue[], skipText = true): number[] | FormulaValue {
  const out: number[] = [];
  for (const a of args) {
    for (const v of flattenValues(a)) {
      if (isFormulaError(v)) return v;
      if (v === null || v === "") continue;
      if (typeof v === "string" && skipText) {
        const n = Number(v);
        if (!Number.isFinite(n)) continue;
        out.push(n);
        continue;
      }
      const n = toNumber(v);
      if (isFormulaError(n)) {
        if (skipText && typeof v === "string") continue;
        return n;
      }
      out.push(n);
    }
  }
  return out;
}

function unaryNum(
  args: FormulaValue[],
  fn: (n: number) => number,
): FormulaValue {
  const n = toNumber(args[0]!);
  if (isFormulaError(n)) return n;
  const r = fn(n);
  if (!Number.isFinite(r)) return formulaError("NUM");
  return r;
}

function gcd2(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

export const mathFunctions: FormulaFnDef[] = [
  { name: "ABS", minArgs: 1, maxArgs: 1, impl: (a) => unaryNum(a, Math.abs) },
  {
    name: "SIGN",
    minArgs: 1,
    maxArgs: 1,
    impl: (a) =>
      unaryNum(a, (n) => (n === 0 ? 0 : n > 0 ? 1 : -1)),
  },
  {
    name: "ROUND",
    minArgs: 1,
    maxArgs: 2,
    impl: (args) => {
      const n = toNumber(args[0]!);
      if (isFormulaError(n)) return n;
      const d = args[1] !== undefined ? toNumber(args[1]) : 0;
      if (isFormulaError(d)) return d;
      const f = 10 ** Math.trunc(d);
      return Math.round(n * f) / f;
    },
  },
  {
    name: "ROUNDUP",
    minArgs: 1,
    maxArgs: 2,
    impl: (args) => {
      const n = toNumber(args[0]!);
      if (isFormulaError(n)) return n;
      const d = args[1] !== undefined ? toNumber(args[1]) : 0;
      if (isFormulaError(d)) return d;
      const f = 10 ** Math.trunc(d);
      return (n >= 0 ? Math.ceil(n * f) : Math.floor(n * f)) / f;
    },
  },
  {
    name: "ROUNDDOWN",
    minArgs: 1,
    maxArgs: 2,
    impl: (args) => {
      const n = toNumber(args[0]!);
      if (isFormulaError(n)) return n;
      const d = args[1] !== undefined ? toNumber(args[1]) : 0;
      if (isFormulaError(d)) return d;
      const f = 10 ** Math.trunc(d);
      return (n >= 0 ? Math.floor(n * f) : Math.ceil(n * f)) / f;
    },
  },
  {
    name: "FLOOR",
    minArgs: 1,
    maxArgs: 2,
    impl: (args) => {
      const n = toNumber(args[0]!);
      if (isFormulaError(n)) return n;
      const sig = args[1] !== undefined ? toNumber(args[1]) : 1;
      if (isFormulaError(sig)) return sig;
      if (sig === 0) return formulaError("DIV0");
      return Math.floor(n / sig) * sig;
    },
  },
  {
    name: "CEILING",
    minArgs: 1,
    maxArgs: 2,
    impl: (args) => {
      const n = toNumber(args[0]!);
      if (isFormulaError(n)) return n;
      const sig = args[1] !== undefined ? toNumber(args[1]) : 1;
      if (isFormulaError(sig)) return sig;
      if (sig === 0) return formulaError("DIV0");
      return Math.ceil(n / sig) * sig;
    },
  },
  {
    name: "INT",
    minArgs: 1,
    maxArgs: 1,
    impl: (a) => unaryNum(a, Math.floor),
  },
  {
    name: "TRUNC",
    minArgs: 1,
    maxArgs: 2,
    impl: (args) => {
      const n = toNumber(args[0]!);
      if (isFormulaError(n)) return n;
      const d = args[1] !== undefined ? toNumber(args[1]) : 0;
      if (isFormulaError(d)) return d;
      const f = 10 ** Math.trunc(d);
      return (n < 0 ? Math.ceil(n * f) : Math.floor(n * f)) / f;
    },
  },
  {
    name: "MOD",
    minArgs: 2,
    maxArgs: 2,
    impl: (args) => {
      const n = toNumber(args[0]!);
      const d = toNumber(args[1]!);
      if (isFormulaError(n)) return n;
      if (isFormulaError(d)) return d;
      if (d === 0) return formulaError("DIV0");
      return n - d * Math.floor(n / d);
    },
  },
  {
    name: "POWER",
    minArgs: 2,
    maxArgs: 2,
    impl: (args) => {
      const a = toNumber(args[0]!);
      const b = toNumber(args[1]!);
      if (isFormulaError(a)) return a;
      if (isFormulaError(b)) return b;
      const r = a ** b;
      if (!Number.isFinite(r)) return formulaError("NUM");
      return r;
    },
  },
  {
    name: "SQRT",
    minArgs: 1,
    maxArgs: 1,
    impl: (a) => {
      const n = toNumber(a[0]!);
      if (isFormulaError(n)) return n;
      if (n < 0) return formulaError("NUM");
      return Math.sqrt(n);
    },
  },
  { name: "EXP", minArgs: 1, maxArgs: 1, impl: (a) => unaryNum(a, Math.exp) },
  {
    name: "LN",
    minArgs: 1,
    maxArgs: 1,
    impl: (a) => {
      const n = toNumber(a[0]!);
      if (isFormulaError(n)) return n;
      if (n <= 0) return formulaError("NUM");
      return Math.log(n);
    },
  },
  {
    name: "LOG",
    minArgs: 1,
    maxArgs: 2,
    impl: (args) => {
      const n = toNumber(args[0]!);
      if (isFormulaError(n)) return n;
      const base = args[1] !== undefined ? toNumber(args[1]) : 10;
      if (isFormulaError(base)) return base;
      if (n <= 0 || base <= 0 || base === 1) return formulaError("NUM");
      return Math.log(n) / Math.log(base);
    },
  },
  {
    name: "LOG10",
    minArgs: 1,
    maxArgs: 1,
    impl: (a) => {
      const n = toNumber(a[0]!);
      if (isFormulaError(n)) return n;
      if (n <= 0) return formulaError("NUM");
      return Math.log10(n);
    },
  },
  { name: "PI", minArgs: 0, maxArgs: 0, impl: () => Math.PI },
  { name: "SIN", minArgs: 1, maxArgs: 1, impl: (a) => unaryNum(a, Math.sin) },
  { name: "COS", minArgs: 1, maxArgs: 1, impl: (a) => unaryNum(a, Math.cos) },
  { name: "TAN", minArgs: 1, maxArgs: 1, impl: (a) => unaryNum(a, Math.tan) },
  {
    name: "ASIN",
    minArgs: 1,
    maxArgs: 1,
    impl: (a) => {
      const n = toNumber(a[0]!);
      if (isFormulaError(n)) return n;
      if (n < -1 || n > 1) return formulaError("NUM");
      return Math.asin(n);
    },
  },
  {
    name: "ACOS",
    minArgs: 1,
    maxArgs: 1,
    impl: (a) => {
      const n = toNumber(a[0]!);
      if (isFormulaError(n)) return n;
      if (n < -1 || n > 1) return formulaError("NUM");
      return Math.acos(n);
    },
  },
  { name: "ATAN", minArgs: 1, maxArgs: 1, impl: (a) => unaryNum(a, Math.atan) },
  {
    name: "ATAN2",
    minArgs: 2,
    maxArgs: 2,
    impl: (args) => {
      const x = toNumber(args[0]!);
      const y = toNumber(args[1]!);
      if (isFormulaError(x)) return x;
      if (isFormulaError(y)) return y;
      return Math.atan2(y, x);
    },
  },
  {
    name: "DEGREES",
    minArgs: 1,
    maxArgs: 1,
    impl: (a) => unaryNum(a, (n) => (n * 180) / Math.PI),
  },
  {
    name: "RADIANS",
    minArgs: 1,
    maxArgs: 1,
    impl: (a) => unaryNum(a, (n) => (n * Math.PI) / 180),
  },
  {
    name: "MIN",
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args) => {
      const nums = numsFromArgs(args);
      if (!Array.isArray(nums)) return nums;
      if (nums.length === 0) return 0;
      return Math.min(...nums);
    },
  },
  {
    name: "MAX",
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args) => {
      const nums = numsFromArgs(args);
      if (!Array.isArray(nums)) return nums;
      if (nums.length === 0) return 0;
      return Math.max(...nums);
    },
  },
  {
    name: "SUM",
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args) => {
      const nums = numsFromArgs(args);
      if (!Array.isArray(nums)) return nums;
      return nums.reduce((a, b) => a + b, 0);
    },
  },
  {
    name: "PRODUCT",
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args) => {
      const nums = numsFromArgs(args);
      if (!Array.isArray(nums)) return nums;
      if (nums.length === 0) return 0;
      return nums.reduce((a, b) => a * b, 1);
    },
  },
  {
    name: "SUMPRODUCT",
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args) => {
      if (args.length === 0) return 0;
      const arrays = args.map((a) => flattenValues(a));
      const len = arrays[0]!.length;
      for (const arr of arrays) {
        if (arr.length !== len) return formulaError("VALUE", "Array length mismatch");
      }
      let sum = 0;
      for (let i = 0; i < len; i++) {
        let prod = 1;
        for (const arr of arrays) {
          const n = toNumber(arr[i]!);
          if (isFormulaError(n)) return n;
          prod *= n;
        }
        sum += prod;
      }
      return sum;
    },
  },
  {
    name: "GCD",
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args) => {
      const nums = numsFromArgs(args, false);
      if (!Array.isArray(nums)) return nums;
      if (nums.length === 0) return formulaError("VALUE");
      return nums.map(Math.trunc).reduce((a, b) => gcd2(a, b));
    },
  },
  {
    name: "LCM",
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args) => {
      const nums = numsFromArgs(args, false);
      if (!Array.isArray(nums)) return nums;
      if (nums.length === 0) return formulaError("VALUE");
      return nums
        .map((n) => Math.abs(Math.trunc(n)))
        .reduce((a, b) => (a === 0 || b === 0 ? 0 : Math.abs(a * b) / gcd2(a, b)));
    },
  },
  {
    name: "COMBIN",
    minArgs: 2,
    maxArgs: 2,
    impl: (args) => {
      const n = toNumber(args[0]!);
      const k = toNumber(args[1]!);
      if (isFormulaError(n) || isFormulaError(k)) {
        return isFormulaError(n) ? n : k;
      }
      const N = Math.trunc(n);
      const K = Math.trunc(k);
      if (N < 0 || K < 0 || K > N) return formulaError("NUM");
      if (K > 1000 || N > 1000) return formulaError("LIMIT", "COMBIN too large");
      let r = 1;
      for (let i = 1; i <= K; i++) r = (r * (N - K + i)) / i;
      return Math.round(r);
    },
  },
  {
    name: "PERMUT",
    minArgs: 2,
    maxArgs: 2,
    impl: (args) => {
      const n = toNumber(args[0]!);
      const k = toNumber(args[1]!);
      if (isFormulaError(n) || isFormulaError(k)) {
        return isFormulaError(n) ? n : k;
      }
      const N = Math.trunc(n);
      const K = Math.trunc(k);
      if (N < 0 || K < 0 || K > N) return formulaError("NUM");
      if (K > 1000) return formulaError("LIMIT");
      let r = 1;
      for (let i = 0; i < K; i++) r *= N - i;
      return r;
    },
  },
  {
    name: "FACT",
    minArgs: 1,
    maxArgs: 1,
    impl: (args, ctx: EvalContext) => {
      const n = toNumber(args[0]!);
      if (isFormulaError(n)) return n;
      const N = Math.trunc(n);
      if (N < 0) return formulaError("NUM");
      if (N > ctx.limits.maxFactN) return formulaError("NUM");
      let r = 1;
      for (let i = 2; i <= N; i++) r *= i;
      return r;
    },
  },
  {
    name: "AVERAGE",
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args) => {
      const nums = numsFromArgs(args);
      if (!Array.isArray(nums)) return nums;
      if (nums.length === 0) return formulaError("DIV0");
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    },
  },
  {
    name: "COUNT",
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args) => {
      let c = 0;
      for (const a of args) {
        for (const v of flattenValues(a)) {
          if (typeof v === "number" && Number.isFinite(v)) c++;
          else if (v instanceof Date) c++;
        }
      }
      return c;
    },
  },
  {
    name: "COUNTA",
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args) => {
      let c = 0;
      for (const a of args) {
        for (const v of flattenValues(a)) {
          if (v !== null && v !== "") c++;
        }
      }
      return c;
    },
  },
  {
    name: "COUNTBLANK",
    minArgs: 1,
    maxArgs: Infinity,
    impl: (args) => {
      let c = 0;
      for (const a of args) {
        for (const v of flattenValues(a)) {
          if (v === null || v === "") c++;
        }
      }
      return c;
    },
  },
  {
    name: "RAND",
    minArgs: 0,
    maxArgs: 0,
    volatile: true,
    impl: (_a, ctx) => ctx.rng(),
  },
  {
    name: "RANDBETWEEN",
    minArgs: 2,
    maxArgs: 2,
    volatile: true,
    impl: (args, ctx) => {
      const lo = toNumber(args[0]!);
      const hi = toNumber(args[1]!);
      if (isFormulaError(lo)) return lo;
      if (isFormulaError(hi)) return hi;
      const a = Math.trunc(Math.min(lo, hi));
      const b = Math.trunc(Math.max(lo, hi));
      return a + Math.floor(ctx.rng() * (b - a + 1));
    },
  },
];
