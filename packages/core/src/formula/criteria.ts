import { toNumber } from "./coerce.js";
import { isFormulaError } from "./errors.js";
import type { FormulaValue } from "./types.js";

/**
 * Match a cell value against Excel-style criteria without building RegExp from
 * untrusted strings (manual wildcard matcher only).
 */
export function matchesCriteria(
  value: FormulaValue,
  criteria: FormulaValue,
): boolean {
  if (isFormulaError(value) || isFormulaError(criteria)) return false;

  if (typeof criteria === "number" || typeof criteria === "boolean") {
    if (typeof value === "number" || typeof value === "boolean") {
      return value === criteria;
    }
    const n = toNumber(value);
    return !isFormulaError(n) && n === Number(criteria);
  }

  if (criteria === null || criteria === "") {
    return value === null || value === "";
  }

  if (typeof criteria !== "string") {
    return value === criteria;
  }

  const c = criteria;
  const ops = [">=", "<=", "<>", ">", "<", "="] as const;
  for (const op of ops) {
    if (c.startsWith(op)) {
      const rest = c.slice(op.length);
      return compareOp(value, op, rest);
    }
  }

  // wildcard / exact string (case-insensitive)
  return wildcardMatch(stringify(value), c);
}

function compareOp(
  value: FormulaValue,
  op: ">=" | "<=" | "<>" | ">" | "<" | "=",
  rhsRaw: string,
): boolean {
  const rhsNum = Number(rhsRaw);
  const lhsNum = toNumber(value);
  if (!isFormulaError(lhsNum) && Number.isFinite(rhsNum) && rhsRaw.trim() !== "") {
    switch (op) {
      case ">=":
        return lhsNum >= rhsNum;
      case "<=":
        return lhsNum <= rhsNum;
      case ">":
        return lhsNum > rhsNum;
      case "<":
        return lhsNum < rhsNum;
      case "=":
        return lhsNum === rhsNum;
      case "<>":
        return lhsNum !== rhsNum;
    }
  }
  const lhs = stringify(value).toLowerCase();
  const rhs = rhsRaw.toLowerCase();
  switch (op) {
    case "=":
      return lhs === rhs;
    case "<>":
      return lhs !== rhs;
    case ">":
      return lhs > rhs;
    case "<":
      return lhs < rhs;
    case ">=":
      return lhs >= rhs;
    case "<=":
      return lhs <= rhs;
  }
}

function stringify(v: FormulaValue): string {
  if (v === null) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof Date) return String(v.getTime());
  if (isFormulaError(v)) return "";
  if (Array.isArray(v)) return stringify(v[0] as FormulaValue);
  return String(v);
}

/** Safe glob: * and ? with ~ escape. No RegExp from user input. */
function wildcardMatch(text: string, pattern: string): boolean {
  const t = text.toLowerCase();
  const p = pattern.toLowerCase();
  return matchAt(t, 0, p, 0);
}

function matchAt(t: string, ti: number, p: string, pi: number): boolean {
  while (pi < p.length) {
    if (p[pi] === "~" && pi + 1 < p.length) {
      if (ti >= t.length || t[ti] !== p[pi + 1]) return false;
      ti++;
      pi += 2;
      continue;
    }
    if (p[pi] === "*") {
      // greedy star
      if (pi + 1 >= p.length) return true;
      for (let k = ti; k <= t.length; k++) {
        if (matchAt(t, k, p, pi + 1)) return true;
      }
      return false;
    }
    if (p[pi] === "?") {
      if (ti >= t.length) return false;
      ti++;
      pi++;
      continue;
    }
    if (ti >= t.length || t[ti] !== p[pi]) return false;
    ti++;
    pi++;
  }
  return ti === t.length;
}
