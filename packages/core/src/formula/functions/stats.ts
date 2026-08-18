import { flattenValues, toNumber } from "../coerce.js";
import { matchesCriteria } from "../criteria.js";
import { formulaError, isFormulaError } from "../errors.js";
import type { FormulaValue } from "../types.js";
import type { FormulaFnDef } from "./types.js";

function numericList(args: FormulaValue[]): number[] | FormulaValue {
  const out: number[] = [];
  for (const a of args) {
    for (const v of flattenValues(a)) {
      if (isFormulaError(v)) return v;
      if (typeof v === "number" && Number.isFinite(v)) out.push(v);
    }
  }
  return out;
}

function stdev(nums: number[], sample: boolean): FormulaValue {
  if (nums.length < (sample ? 2 : 1)) return formulaError("DIV0");
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const sumSq = nums.reduce((a, b) => a + (b - mean) ** 2, 0);
  const den = sample ? nums.length - 1 : nums.length;
  return Math.sqrt(sumSq / den);
}

export const statsFunctions: FormulaFnDef[] = [
  {
    name: "MEDIAN",
    minArgs: 1,
    maxArgs: Number.POSITIVE_INFINITY,
    impl: (args) => {
      const nums = numericList(args);
      if (!Array.isArray(nums)) return nums;
      if (nums.length === 0) return formulaError("NUM");
      const s = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
    },
  },
  {
    name: "MODE",
    minArgs: 1,
    maxArgs: Number.POSITIVE_INFINITY,
    impl: (args) => {
      const nums = numericList(args);
      if (!Array.isArray(nums)) return nums;
      const freq = new Map<number, number>();
      let best = nums[0];
      let bestC = 0;
      for (const n of nums) {
        const c = (freq.get(n) ?? 0) + 1;
        freq.set(n, c);
        if (c > bestC) {
          bestC = c;
          best = n;
        }
      }
      if (bestC < 2) return formulaError("NA");
      return best ?? formulaError("NA");
    },
  },
  {
    name: "LARGE",
    minArgs: 2,
    maxArgs: 2,
    impl: (args) => {
      const nums = numericList([args[0]!]);
      if (!Array.isArray(nums)) return nums;
      const k = toNumber(args[1]!);
      if (isFormulaError(k)) return k;
      const s = [...nums].sort((a, b) => b - a);
      const i = Math.trunc(k) - 1;
      if (i < 0 || i >= s.length) return formulaError("NUM");
      return s[i]!;
    },
  },
  {
    name: "SMALL",
    minArgs: 2,
    maxArgs: 2,
    impl: (args) => {
      const nums = numericList([args[0]!]);
      if (!Array.isArray(nums)) return nums;
      const k = toNumber(args[1]!);
      if (isFormulaError(k)) return k;
      const s = [...nums].sort((a, b) => a - b);
      const i = Math.trunc(k) - 1;
      if (i < 0 || i >= s.length) return formulaError("NUM");
      return s[i]!;
    },
  },
  {
    name: "RANK",
    minArgs: 2,
    maxArgs: 3,
    impl: (args) => {
      const n = toNumber(args[0]!);
      if (isFormulaError(n)) return n;
      const nums = numericList([args[1]!]);
      if (!Array.isArray(nums)) return nums;
      const order = args[2] !== undefined ? toNumber(args[2]) : 0;
      if (isFormulaError(order)) return order;
      const sorted = [...nums].sort((a, b) => (order === 0 ? b - a : a - b));
      const idx = sorted.indexOf(n);
      if (idx < 0) return formulaError("NA");
      return idx + 1;
    },
  },
  {
    name: "PERCENTILE",
    minArgs: 2,
    maxArgs: 2,
    impl: (args) => {
      const nums = numericList([args[0]!]);
      if (!Array.isArray(nums)) return nums;
      const p = toNumber(args[1]!);
      if (isFormulaError(p)) return p;
      if (p < 0 || p > 1 || nums.length === 0) return formulaError("NUM");
      const s = [...nums].sort((a, b) => a - b);
      const pos = (s.length - 1) * p;
      const lo = Math.floor(pos);
      const hi = Math.ceil(pos);
      if (lo === hi) return s[lo]!;
      return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
    },
  },
  {
    name: "QUARTILE",
    minArgs: 2,
    maxArgs: 2,
    impl: (args, ctx) => {
      const q = toNumber(args[1]!);
      if (isFormulaError(q)) return q;
      const map = [0, 0.25, 0.5, 0.75, 1];
      const qi = Math.trunc(q);
      if (qi < 0 || qi > 4) return formulaError("NUM");
      const pct = statsFunctions.find((f) => f.name === "PERCENTILE")!;
      return pct.impl([args[0]!, map[qi]!], ctx);
    },
  },
  {
    name: "STDEV",
    minArgs: 1,
    maxArgs: Number.POSITIVE_INFINITY,
    impl: (args) => {
      const nums = numericList(args);
      if (!Array.isArray(nums)) return nums;
      return stdev(nums, true);
    },
  },
  {
    name: "STDEVP",
    minArgs: 1,
    maxArgs: Number.POSITIVE_INFINITY,
    impl: (args) => {
      const nums = numericList(args);
      if (!Array.isArray(nums)) return nums;
      return stdev(nums, false);
    },
  },
  {
    name: "VAR",
    minArgs: 1,
    maxArgs: Number.POSITIVE_INFINITY,
    impl: (args) => {
      const s = stdev(
        Array.isArray(numericList(args)) ? (numericList(args) as number[]) : [],
        true,
      );
      // recompute properly
      const nums = numericList(args);
      if (!Array.isArray(nums)) return nums;
      if (nums.length < 2) return formulaError("DIV0");
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      return nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1);
    },
  },
  {
    name: "VARP",
    minArgs: 1,
    maxArgs: Number.POSITIVE_INFINITY,
    impl: (args) => {
      const nums = numericList(args);
      if (!Array.isArray(nums)) return nums;
      if (nums.length < 1) return formulaError("DIV0");
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      return nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
    },
  },
  {
    name: "SUMIF",
    minArgs: 2,
    maxArgs: 3,
    impl: (args) => {
      const range = flattenValues(args[0]!);
      const criteria = args[1]!;
      const sumRange = args[2] !== undefined ? flattenValues(args[2]) : range;
      let sum = 0;
      const len = Math.min(range.length, sumRange.length);
      for (let i = 0; i < len; i++) {
        if (matchesCriteria(range[i]!, criteria)) {
          const n = toNumber(sumRange[i]!);
          if (!isFormulaError(n)) sum += n;
        }
      }
      return sum;
    },
  },
  {
    name: "SUMIFS",
    minArgs: 3,
    maxArgs: Number.POSITIVE_INFINITY,
    impl: (args) => {
      if ((args.length - 1) % 2 !== 0) return formulaError("VALUE");
      const sumRange = flattenValues(args[0]!);
      const pairs: { range: FormulaValue[]; crit: FormulaValue }[] = [];
      for (let i = 1; i < args.length; i += 2) {
        pairs.push({ range: flattenValues(args[i]!), crit: args[i + 1]! });
      }
      let sum = 0;
      for (let i = 0; i < sumRange.length; i++) {
        let ok = true;
        for (const p of pairs) {
          if (!matchesCriteria(p.range[i] ?? null, p.crit)) {
            ok = false;
            break;
          }
        }
        if (ok) {
          const n = toNumber(sumRange[i]!);
          if (!isFormulaError(n)) sum += n;
        }
      }
      return sum;
    },
  },
  {
    name: "COUNTIF",
    minArgs: 2,
    maxArgs: 2,
    impl: (args) => {
      const range = flattenValues(args[0]!);
      const criteria = args[1]!;
      let c = 0;
      for (const v of range) {
        if (matchesCriteria(v, criteria)) c++;
      }
      return c;
    },
  },
  {
    name: "COUNTIFS",
    minArgs: 2,
    maxArgs: Number.POSITIVE_INFINITY,
    impl: (args) => {
      if (args.length % 2 !== 0) return formulaError("VALUE");
      const pairs: { range: FormulaValue[]; crit: FormulaValue }[] = [];
      for (let i = 0; i < args.length; i += 2) {
        pairs.push({ range: flattenValues(args[i]!), crit: args[i + 1]! });
      }
      const len = pairs[0]?.range.length ?? 0;
      let c = 0;
      for (let i = 0; i < len; i++) {
        if (pairs.every((p) => matchesCriteria(p.range[i] ?? null, p.crit))) {
          c++;
        }
      }
      return c;
    },
  },
  {
    name: "AVERAGEIF",
    minArgs: 2,
    maxArgs: 3,
    impl: (args) => {
      const range = flattenValues(args[0]!);
      const criteria = args[1]!;
      const avgRange = args[2] !== undefined ? flattenValues(args[2]) : range;
      let sum = 0;
      let c = 0;
      const len = Math.min(range.length, avgRange.length);
      for (let i = 0; i < len; i++) {
        if (matchesCriteria(range[i]!, criteria)) {
          const n = toNumber(avgRange[i]!);
          if (!isFormulaError(n)) {
            sum += n;
            c++;
          }
        }
      }
      if (c === 0) return formulaError("DIV0");
      return sum / c;
    },
  },
  {
    name: "AVERAGEIFS",
    minArgs: 3,
    maxArgs: Number.POSITIVE_INFINITY,
    impl: (args) => {
      if ((args.length - 1) % 2 !== 0) return formulaError("VALUE");
      const avgRange = flattenValues(args[0]!);
      const pairs: { range: FormulaValue[]; crit: FormulaValue }[] = [];
      for (let i = 1; i < args.length; i += 2) {
        pairs.push({ range: flattenValues(args[i]!), crit: args[i + 1]! });
      }
      let sum = 0;
      let c = 0;
      for (let i = 0; i < avgRange.length; i++) {
        if (pairs.every((p) => matchesCriteria(p.range[i] ?? null, p.crit))) {
          const n = toNumber(avgRange[i]!);
          if (!isFormulaError(n)) {
            sum += n;
            c++;
          }
        }
      }
      if (c === 0) return formulaError("DIV0");
      return sum / c;
    },
  },
];
