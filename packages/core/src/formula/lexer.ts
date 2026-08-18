import { formulaError } from "./errors.js";
import { defaultFormulaLimits } from "./limits.js";
import { parseA1, parseA1Range } from "./refs.js";
import type { FormulaError, FormulaLimits } from "./types.js";

export type Token =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "ident"; value: string }
  | { kind: "ref"; value: string }
  | {
      kind:
        | "plus"
        | "minus"
        | "star"
        | "slash"
        | "caret"
        | "percent"
        | "amp"
        | "eq"
        | "ne"
        | "gt"
        | "ge"
        | "lt"
        | "le"
        | "lparen"
        | "rparen"
        | "comma"
        | "eof";
    };

export type LexResult =
  | { ok: true; tokens: Token[] }
  | { ok: false; error: FormulaError };

function isRefText(text: string): boolean {
  if (text.includes(":")) return parseA1Range(text) !== null;
  return parseA1(text) !== null;
}

export function tokenize(
  source: string,
  limits: FormulaLimits = defaultFormulaLimits,
): LexResult {
  let text = source.trim();
  if (text.startsWith("=")) text = text.slice(1);
  if (text.length > limits.maxSourceLength) {
    return {
      ok: false,
      error: formulaError("LIMIT", "Formula source too long"),
    };
  }

  const tokens: Token[] = [];
  let i = 0;

  const push = (t: Token): boolean => {
    tokens.push(t);
    if (tokens.length > limits.maxTokens) return false;
    return true;
  };

  while (i < text.length) {
    const ch = text[i]!;

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }

    if (ch === '"') {
      i++;
      let s = "";
      let closed = false;
      while (i < text.length) {
        const c = text[i]!;
        if (c === '"') {
          if (text[i + 1] === '"') {
            s += '"';
            i += 2;
            continue;
          }
          closed = true;
          i++;
          break;
        }
        s += c;
        i++;
      }
      if (!closed) {
        return {
          ok: false,
          error: formulaError("PARSE", "Unterminated string"),
        };
      }
      if (!push({ kind: "string", value: s })) {
        return {
          ok: false,
          error: formulaError("LIMIT", "Too many tokens"),
        };
      }
      continue;
    }

    if (ch >= "0" && ch <= "9") {
      let j = i;
      while (j < text.length && text[j]! >= "0" && text[j]! <= "9") j++;
      if (text[j] === ".") {
        j++;
        while (j < text.length && text[j]! >= "0" && text[j]! <= "9") j++;
      }
      const raw = text.slice(i, j);
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        return { ok: false, error: formulaError("NUM", "Invalid number") };
      }
      if (!push({ kind: "number", value: n })) {
        return {
          ok: false,
          error: formulaError("LIMIT", "Too many tokens"),
        };
      }
      i = j;
      continue;
    }

    if (
      ch === "." &&
      i + 1 < text.length &&
      text[i + 1]! >= "0" &&
      text[i + 1]! <= "9"
    ) {
      let j = i + 1;
      while (j < text.length && text[j]! >= "0" && text[j]! <= "9") j++;
      const n = Number(text.slice(i, j));
      if (!push({ kind: "number", value: n })) {
        return {
          ok: false,
          error: formulaError("LIMIT", "Too many tokens"),
        };
      }
      i = j;
      continue;
    }

    if (
      (ch >= "A" && ch <= "Z") ||
      (ch >= "a" && ch <= "z") ||
      ch === "_" ||
      ch === "$"
    ) {
      let j = i;
      // ref-like: $A$1 or A1:B2 or ERROR.TYPE
      while (j < text.length) {
        const c = text[j]!;
        if (
          (c >= "A" && c <= "Z") ||
          (c >= "a" && c <= "z") ||
          (c >= "0" && c <= "9") ||
          c === "$" ||
          c === "_" ||
          c === "."
        ) {
          j++;
          continue;
        }
        if (c === ":" && j + 1 < text.length) {
          // peek range second half
          const k = j + 1;
          let m = k;
          while (m < text.length) {
            const d = text[m]!;
            if (
              (d >= "A" && d <= "Z") ||
              (d >= "a" && d <= "z") ||
              (d >= "0" && d <= "9") ||
              d === "$"
            ) {
              m++;
              continue;
            }
            break;
          }
          if (m > k && isRefText(text.slice(i, m))) {
            j = m;
            break;
          }
        }
        break;
      }
      const raw = text.slice(i, j);
      if (raw.includes("!")) {
        return {
          ok: false,
          error: formulaError("PARSE", "Sheet references are not supported"),
        };
      }
      if (isRefText(raw)) {
        if (!push({ kind: "ref", value: raw })) {
          return {
            ok: false,
            error: formulaError("LIMIT", "Too many tokens"),
          };
        }
      } else {
        if (!push({ kind: "ident", value: raw })) {
          return {
            ok: false,
            error: formulaError("LIMIT", "Too many tokens"),
          };
        }
      }
      i = j;
      continue;
    }

    // two-char ops
    if (ch === "<" && text[i + 1] === ">") {
      if (!push({ kind: "ne" })) {
        return { ok: false, error: formulaError("LIMIT", "Too many tokens") };
      }
      i += 2;
      continue;
    }
    if (ch === "<" && text[i + 1] === "=") {
      if (!push({ kind: "le" })) {
        return { ok: false, error: formulaError("LIMIT", "Too many tokens") };
      }
      i += 2;
      continue;
    }
    if (ch === ">" && text[i + 1] === "=") {
      if (!push({ kind: "ge" })) {
        return { ok: false, error: formulaError("LIMIT", "Too many tokens") };
      }
      i += 2;
      continue;
    }

    const single: Record<string, Token["kind"]> = {
      "+": "plus",
      "-": "minus",
      "*": "star",
      "/": "slash",
      "^": "caret",
      "%": "percent",
      "&": "amp",
      "=": "eq",
      ">": "gt",
      "<": "lt",
      "(": "lparen",
      ")": "rparen",
      ",": "comma",
    };
    const kind = single[ch];
    if (kind) {
      if (!push({ kind } as Token)) {
        return { ok: false, error: formulaError("LIMIT", "Too many tokens") };
      }
      i++;
      continue;
    }

    return {
      ok: false,
      error: formulaError("PARSE", `Unexpected character: ${ch}`),
    };
  }

  tokens.push({ kind: "eof" });
  return { ok: true, tokens };
}
