import { dateToSerial, serialToDate, toNumber } from "../coerce.js";
import { formulaError, isFormulaError } from "../errors.js";
import type { FormulaFnDef } from "./types.js";

function asDate(v: unknown): Date | ReturnType<typeof formulaError> {
  if (v instanceof Date) return v;
  const n = toNumber(v as never);
  if (isFormulaError(n)) return n;
  return serialToDate(n);
}

export const datetimeFunctions: FormulaFnDef[] = [
  {
    name: "DATE",
    minArgs: 3,
    maxArgs: 3,
    impl: (args) => {
      const y = toNumber(args[0]!);
      const m = toNumber(args[1]!);
      const d = toNumber(args[2]!);
      if (isFormulaError(y) || isFormulaError(m) || isFormulaError(d)) {
        return isFormulaError(y) ? y : isFormulaError(m) ? m : d;
      }
      return new Date(Date.UTC(Math.trunc(y), Math.trunc(m) - 1, Math.trunc(d)));
    },
  },
  {
    name: "TIME",
    minArgs: 3,
    maxArgs: 3,
    impl: (args) => {
      const h = toNumber(args[0]!);
      const m = toNumber(args[1]!);
      const s = toNumber(args[2]!);
      if (isFormulaError(h) || isFormulaError(m) || isFormulaError(s)) {
        return isFormulaError(h) ? h : isFormulaError(m) ? m : s;
      }
      return (Math.trunc(h) * 3600 + Math.trunc(m) * 60 + Math.trunc(s)) / 86400;
    },
  },
  {
    name: "DATEVALUE",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const v = args[0]!;
      if (v instanceof Date) return dateToSerial(v);
      if (typeof v === "string") {
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return formulaError("VALUE");
        return dateToSerial(d);
      }
      return toNumber(v);
    },
  },
  {
    name: "TIMEVALUE",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const v = args[0]!;
      if (typeof v === "number") return v % 1;
      if (typeof v === "string") {
        const parts = v.split(":").map(Number);
        if (parts.some((p) => !Number.isFinite(p))) return formulaError("VALUE");
        const h = parts[0] ?? 0;
        const m = parts[1] ?? 0;
        const s = parts[2] ?? 0;
        return (h * 3600 + m * 60 + s) / 86400;
      }
      return formulaError("VALUE");
    },
  },
  {
    name: "NOW",
    minArgs: 0,
    maxArgs: 0,
    volatile: true,
    impl: (_a, ctx) => ctx.now(),
  },
  {
    name: "TODAY",
    minArgs: 0,
    maxArgs: 0,
    volatile: true,
    impl: (_a, ctx) => {
      const n = ctx.now();
      return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
    },
  },
  {
    name: "YEAR",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const d = asDate(args[0]);
      return isFormulaError(d) ? d : d.getUTCFullYear();
    },
  },
  {
    name: "MONTH",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const d = asDate(args[0]);
      return isFormulaError(d) ? d : d.getUTCMonth() + 1;
    },
  },
  {
    name: "DAY",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const d = asDate(args[0]);
      return isFormulaError(d) ? d : d.getUTCDate();
    },
  },
  {
    name: "HOUR",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const n = toNumber(args[0]!);
      if (isFormulaError(n)) {
        const d = asDate(args[0]);
        return isFormulaError(d) ? d : d.getUTCHours();
      }
      const frac = n - Math.floor(n);
      return Math.floor(frac * 24) % 24;
    },
  },
  {
    name: "MINUTE",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const d = asDate(args[0]);
      if (!isFormulaError(d)) return d.getUTCMinutes();
      const n = toNumber(args[0]!);
      if (isFormulaError(n)) return n;
      const secs = Math.round((n - Math.floor(n)) * 86400);
      return Math.floor(secs / 60) % 60;
    },
  },
  {
    name: "SECOND",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const d = asDate(args[0]);
      if (!isFormulaError(d)) return d.getUTCSeconds();
      return 0;
    },
  },
  {
    name: "WEEKDAY",
    minArgs: 1,
    maxArgs: 2,
    impl: (args) => {
      const d = asDate(args[0]);
      if (isFormulaError(d)) return d;
      const returnType = args[1] !== undefined ? toNumber(args[1]) : 1;
      if (isFormulaError(returnType)) return returnType;
      const js = d.getUTCDay(); // 0 Sun
      const t = Math.trunc(returnType);
      if (t === 1) return js === 0 ? 1 : js + 1; // Sun=1
      if (t === 2) return js === 0 ? 7 : js; // Mon=1
      if (t === 3) return js === 0 ? 6 : js - 1; // Mon=0
      return js === 0 ? 1 : js + 1;
    },
  },
  {
    name: "WEEKNUM",
    minArgs: 1,
    maxArgs: 2,
    impl: (args) => {
      const d = asDate(args[0]);
      if (isFormulaError(d)) return d;
      const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const day = Math.floor((d.getTime() - start.getTime()) / 86400000);
      return Math.floor(day / 7) + 1;
    },
  },
  {
    name: "EDATE",
    minArgs: 2,
    maxArgs: 2,
    impl: (args) => {
      const d = asDate(args[0]);
      const m = toNumber(args[1]!);
      if (isFormulaError(d)) return d;
      if (isFormulaError(m)) return m;
      return new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + Math.trunc(m), d.getUTCDate()),
      );
    },
  },
  {
    name: "EOMONTH",
    minArgs: 2,
    maxArgs: 2,
    impl: (args) => {
      const d = asDate(args[0]);
      const m = toNumber(args[1]!);
      if (isFormulaError(d)) return d;
      if (isFormulaError(m)) return m;
      return new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + Math.trunc(m) + 1, 0),
      );
    },
  },
  {
    name: "DATEDIF",
    minArgs: 3,
    maxArgs: 3,
    impl: (args) => {
      const a = asDate(args[0]);
      const b = asDate(args[1]);
      if (isFormulaError(a) || isFormulaError(b)) {
        return isFormulaError(a) ? a : b;
      }
      const unit = String(args[2]).toUpperCase();
      const ms = b.getTime() - a.getTime();
      if (unit === "D") return Math.floor(ms / 86400000);
      if (unit === "M") {
        return (
          (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
          (b.getUTCMonth() - a.getUTCMonth())
        );
      }
      if (unit === "Y") return b.getUTCFullYear() - a.getUTCFullYear();
      return formulaError("NUM");
    },
  },
  {
    name: "YEARFRAC",
    minArgs: 2,
    maxArgs: 3,
    impl: (args) => {
      const a = asDate(args[0]);
      const b = asDate(args[1]);
      if (isFormulaError(a) || isFormulaError(b)) {
        return isFormulaError(a) ? a : b;
      }
      const days = Math.abs(b.getTime() - a.getTime()) / 86400000;
      return days / 365;
    },
  },
  {
    name: "WORKDAY",
    minArgs: 2,
    maxArgs: 3,
    impl: (args) => {
      const start = asDate(args[0]);
      const days = toNumber(args[1]!);
      if (isFormulaError(start) || isFormulaError(days)) {
        return isFormulaError(start) ? start : days;
      }
      let left = Math.trunc(days);
      const d = new Date(start.getTime());
      const step = left >= 0 ? 1 : -1;
      left = Math.abs(left);
      while (left > 0) {
        d.setUTCDate(d.getUTCDate() + step);
        const wd = d.getUTCDay();
        if (wd !== 0 && wd !== 6) left--;
      }
      return d;
    },
  },
  {
    name: "NETWORKDAYS",
    minArgs: 2,
    maxArgs: 3,
    impl: (args) => {
      const a = asDate(args[0]);
      const b = asDate(args[1]);
      if (isFormulaError(a) || isFormulaError(b)) {
        return isFormulaError(a) ? a : b;
      }
      let start = a.getTime() <= b.getTime() ? a : b;
      const end = a.getTime() <= b.getTime() ? b : a;
      let count = 0;
      const cur = new Date(start.getTime());
      while (cur.getTime() <= end.getTime()) {
        const wd = cur.getUTCDay();
        if (wd !== 0 && wd !== 6) count++;
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      return count;
    },
  },
];
