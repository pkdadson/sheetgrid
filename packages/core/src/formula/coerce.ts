import { formulaError, isFormulaError } from "./errors.js";
import type { FormulaError, FormulaValue } from "./types.js";

export function isBlank(v: FormulaValue): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string" && v === "") return true;
  return false;
}

export function toNumber(v: FormulaValue): number | FormulaError {
  if (isFormulaError(v)) return v;
  if (Array.isArray(v)) {
    if (v.length === 0) return formulaError("VALUE", "Empty array");
    const first = v[0];
    if (Array.isArray(first)) return toNumber(first[0] as FormulaValue);
    return toNumber(first as FormulaValue);
  }
  if (v === null || v === "") return 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return formulaError("NUM");
    return v;
  }
  if (v instanceof Date) {
    // Excel serial: days since 1899-12-30
    return dateToSerial(v);
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return 0;
    const n = Number(t);
    if (Number.isFinite(n)) return n;
    return formulaError("VALUE", "Cannot convert to number");
  }
  // Boxed RefBox primitives
  if (typeof v === "object" && v !== null && "valueOf" in v) {
    const raw = (v as { valueOf: () => unknown }).valueOf();
    if (raw !== v) return toNumber(raw as FormulaValue);
  }
  return formulaError("VALUE", "Cannot convert to number");
}

export function toStringValue(v: FormulaValue): string | FormulaError {
  if (isFormulaError(v)) return v;
  if (Array.isArray(v)) {
    const first = v[0];
    if (Array.isArray(first)) return toStringValue(first[0] as FormulaValue);
    return toStringValue(first as FormulaValue);
  }
  if (v === null) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return formulaError("VALUE", "Cannot convert to string");
}

export function toBoolean(v: FormulaValue): boolean | FormulaError {
  if (isFormulaError(v)) return v;
  if (Array.isArray(v)) {
    const first = v[0];
    if (Array.isArray(first)) return toBoolean(first[0] as FormulaValue);
    return toBoolean(first as FormulaValue);
  }
  if (v === null || v === "") return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const u = v.toUpperCase();
    if (u === "TRUE") return true;
    if (u === "FALSE") return false;
    const n = Number(v);
    if (Number.isFinite(n)) return n !== 0;
    return formulaError("VALUE", "Cannot convert to boolean");
  }
  if (v instanceof Date) return true;
  return formulaError("VALUE", "Cannot convert to boolean");
}

/** Excel-compatible serial (UTC day count from 1899-12-30). */
export function dateToSerial(d: Date): number {
  const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const epoch = Date.UTC(1899, 11, 30);
  return (utc - epoch) / 86_400_000;
}

export function serialToDate(serial: number): Date {
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 86_400_000);
}

/** Flatten nested range values into a list of scalars (not errors expanded). */
export function flattenValues(v: FormulaValue): FormulaValue[] {
  if (!Array.isArray(v)) return [v];
  const out: FormulaValue[] = [];
  for (const item of v) {
    if (Array.isArray(item)) {
      for (const x of item) out.push(x as FormulaValue);
    } else {
      out.push(item);
    }
  }
  return out;
}
