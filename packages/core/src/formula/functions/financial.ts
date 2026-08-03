import { toNumber } from "../coerce.js";
import { formulaError, isFormulaError } from "../errors.js";
import { flattenValues } from "../coerce.js";
import type { FormulaFnDef } from "./types.js";

export const financialFunctions: FormulaFnDef[] = [
  {
    name: "PMT",
    minArgs: 3,
    maxArgs: 5,
    impl: (args) => {
      const rate = toNumber(args[0]!);
      const nper = toNumber(args[1]!);
      const pv = toNumber(args[2]!);
      const fv = args[3] !== undefined ? toNumber(args[3]) : 0;
      const type = args[4] !== undefined ? toNumber(args[4]) : 0;
      if ([rate, nper, pv, fv, type].some(isFormulaError)) {
        return [rate, nper, pv, fv, type].find(isFormulaError)!;
      }
      const r = rate as number;
      const n = nper as number;
      const p = pv as number;
      const f = fv as number;
      const t = type as number;
      if (r === 0) return -(p + f) / n;
      const pvif = (1 + r) ** n;
      let pmt = (r * (p * pvif + f)) / ((1 + r * t) * (pvif - 1));
      return -pmt;
    },
  },
  {
    name: "PV",
    minArgs: 3,
    maxArgs: 5,
    impl: (args) => {
      const rate = toNumber(args[0]!);
      const nper = toNumber(args[1]!);
      const pmt = toNumber(args[2]!);
      const fv = args[3] !== undefined ? toNumber(args[3]) : 0;
      const type = args[4] !== undefined ? toNumber(args[4]) : 0;
      if ([rate, nper, pmt, fv, type].some(isFormulaError)) {
        return [rate, nper, pmt, fv, type].find(isFormulaError)!;
      }
      const r = rate as number;
      const n = nper as number;
      const p = pmt as number;
      const f = fv as number;
      const t = type as number;
      if (r === 0) return -p * n - f;
      return -(
        (p * (1 + r * t) * ((1 + r) ** n - 1)) / r +
        f
      ) / (1 + r) ** n;
    },
  },
  {
    name: "FV",
    minArgs: 3,
    maxArgs: 5,
    impl: (args) => {
      const rate = toNumber(args[0]!);
      const nper = toNumber(args[1]!);
      const pmt = toNumber(args[2]!);
      const pv = args[3] !== undefined ? toNumber(args[3]) : 0;
      const type = args[4] !== undefined ? toNumber(args[4]) : 0;
      if ([rate, nper, pmt, pv, type].some(isFormulaError)) {
        return [rate, nper, pmt, pv, type].find(isFormulaError)!;
      }
      const r = rate as number;
      const n = nper as number;
      const p = pmt as number;
      const present = pv as number;
      const t = type as number;
      if (r === 0) return -present - p * n;
      return -(
        present * (1 + r) ** n +
        p * (1 + r * t) * (((1 + r) ** n - 1) / r)
      );
    },
  },
  {
    name: "NPER",
    minArgs: 3,
    maxArgs: 5,
    impl: (args) => {
      const rate = toNumber(args[0]!);
      const pmt = toNumber(args[1]!);
      const pv = toNumber(args[2]!);
      const fv = args[3] !== undefined ? toNumber(args[3]) : 0;
      const type = args[4] !== undefined ? toNumber(args[4]) : 0;
      if ([rate, pmt, pv, fv, type].some(isFormulaError)) {
        return [rate, pmt, pv, fv, type].find(isFormulaError)!;
      }
      const r = rate as number;
      const p = pmt as number;
      const present = pv as number;
      const f = fv as number;
      const t = type as number;
      if (r === 0) {
        if (p === 0) return formulaError("NUM");
        return -(present + f) / p;
      }
      const num = p * (1 + r * t) - f * r;
      const den = present * r + p * (1 + r * t);
      if (num === 0 || den === 0) return formulaError("NUM");
      return Math.log(num / den) / Math.log(1 + r);
    },
  },
  {
    name: "RATE",
    minArgs: 3,
    maxArgs: 6,
    impl: (args) => {
      // Newton-Raphson approximation
      const nper = toNumber(args[0]!);
      const pmt = toNumber(args[1]!);
      const pv = toNumber(args[2]!);
      const fv = args[3] !== undefined ? toNumber(args[3]) : 0;
      if ([nper, pmt, pv, fv].some(isFormulaError)) {
        return [nper, pmt, pv, fv].find(isFormulaError)!;
      }
      const n = nper as number;
      const p = pmt as number;
      const present = pv as number;
      const f = fv as number;
      let rate = 0.1;
      for (let i = 0; i < 50; i++) {
        if (rate === -1) return formulaError("NUM");
        const y =
          present * (1 + rate) ** n +
          p * ((1 + rate) ** n - 1) / rate +
          f;
        const dy =
          n * present * (1 + rate) ** (n - 1) +
          p *
            (n * (1 + rate) ** (n - 1) * rate - ((1 + rate) ** n - 1)) /
            rate ** 2;
        const next = rate - y / dy;
        if (!Number.isFinite(next)) return formulaError("NUM");
        if (Math.abs(next - rate) < 1e-10) return next;
        rate = next;
      }
      return rate;
    },
  },
  {
    name: "IPMT",
    minArgs: 4,
    maxArgs: 6,
    impl: (args, ctx) => {
      // IPMT = interest portion of payment for period
      const rate = toNumber(args[0]!);
      const per = toNumber(args[1]!);
      const nper = toNumber(args[2]!);
      const pv = toNumber(args[3]!);
      if ([rate, per, nper, pv].some(isFormulaError)) {
        return [rate, per, nper, pv].find(isFormulaError)!;
      }
      const pmtFn = financialFunctions.find((f) => f.name === "PMT")!;
      const pmt = pmtFn.impl([rate, nper, pv, args[4], args[5]], ctx);
      if (isFormulaError(pmt)) return pmt;
      let balance = pv as number;
      const r = rate as number;
      const period = Math.trunc(per as number);
      for (let i = 1; i < period; i++) {
        const interest = balance * r;
        balance += interest + (pmt as number);
      }
      return balance * r;
    },
  },
  {
    name: "PPMT",
    minArgs: 4,
    maxArgs: 6,
    impl: (args, ctx) => {
      const pmtFn = financialFunctions.find((f) => f.name === "PMT")!;
      const ipmtFn = financialFunctions.find((f) => f.name === "IPMT")!;
      const pmt = pmtFn.impl(
        [args[0]!, args[2]!, args[3]!, args[4], args[5]],
        ctx,
      );
      const ipmt = ipmtFn.impl(args, ctx);
      if (isFormulaError(pmt)) return pmt;
      if (isFormulaError(ipmt)) return ipmt;
      return (pmt as number) - (ipmt as number);
    },
  },
  {
    name: "NPV",
    minArgs: 2,
    maxArgs: Infinity,
    impl: (args) => {
      const rate = toNumber(args[0]!);
      if (isFormulaError(rate)) return rate;
      const r = rate as number;
      let npv = 0;
      let i = 1;
      for (let a = 1; a < args.length; a++) {
        for (const v of flattenValues(args[a]!)) {
          const cf = toNumber(v);
          if (isFormulaError(cf)) return cf;
          npv += (cf as number) / (1 + r) ** i;
          i++;
        }
      }
      return npv;
    },
  },
  {
    name: "IRR",
    minArgs: 1,
    maxArgs: 2,
    impl: (args) => {
      const cfs: number[] = [];
      for (const v of flattenValues(args[0]!)) {
        const n = toNumber(v);
        if (isFormulaError(n)) return n;
        cfs.push(n);
      }
      if (cfs.length < 2) return formulaError("NUM");
      let guess = args[1] !== undefined ? toNumber(args[1]) : 0.1;
      if (isFormulaError(guess)) return guess;
      let rate = guess as number;
      for (let iter = 0; iter < 50; iter++) {
        let npv = 0;
        let dnpv = 0;
        for (let t = 0; t < cfs.length; t++) {
          const den = (1 + rate) ** t;
          npv += cfs[t]! / den;
          if (t > 0) dnpv -= (t * cfs[t]!) / (1 + rate) ** (t + 1);
        }
        if (Math.abs(dnpv) < 1e-12) return formulaError("NUM");
        const next = rate - npv / dnpv;
        if (!Number.isFinite(next)) return formulaError("NUM");
        if (Math.abs(next - rate) < 1e-8) return next;
        rate = next;
      }
      return rate;
    },
  },
];
