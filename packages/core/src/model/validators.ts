import type { ValidationResult } from "../types.js";

export function required(value: unknown): ValidationResult {
  if (value === null || value === undefined) {
    return { ok: false, message: "This field is required", code: "required" };
  }
  if (typeof value === "string" && value.trim() === "") {
    return { ok: false, message: "This field is required", code: "required" };
  }
  return { ok: true };
}

export function number(value: unknown): ValidationResult {
  if (value === null || value === undefined || value === "") {
    return { ok: true };
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    return { ok: true };
  }
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return { ok: true };
  }
  return { ok: false, message: "Must be a number", code: "number" };
}

export function min(bound: number) {
  return (value: unknown): ValidationResult => {
    const n = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(n)) {
      return { ok: false, message: "Must be a number", code: "number" };
    }
    if (n < bound) {
      return { ok: false, message: `Must be ≥ ${bound}`, code: "min" };
    }
    return { ok: true };
  };
}

export function max(bound: number) {
  return (value: unknown): ValidationResult => {
    const n = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(n)) {
      return { ok: false, message: "Must be a number", code: "number" };
    }
    if (n > bound) {
      return { ok: false, message: `Must be ≤ ${bound}`, code: "max" };
    }
    return { ok: true };
  };
}

export function pattern(re: RegExp, message = "Invalid format") {
  return (value: unknown): ValidationResult => {
    if (value === null || value === undefined || value === "") {
      return { ok: true };
    }
    const s = String(value);
    if (!re.test(s)) {
      return { ok: false, message, code: "pattern" };
    }
    return { ok: true };
  };
}
