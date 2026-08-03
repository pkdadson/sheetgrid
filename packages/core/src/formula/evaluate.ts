import type { AstNode } from "./ast.js";
import { toBoolean, toNumber, toStringValue } from "./coerce.js";
import { formulaError, isFormulaError } from "./errors.js";
import { getFunction } from "./functions/index.js";
import type { EvalContext, FormulaValue } from "./types.js";

/** Range/cell value carrying origin metadata for OFFSET. */
export type RefBox = FormulaValue & {
  __ref?: { r1: number; c1: number; r2: number; c2: number };
};

function touch(ctx: EvalContext, n = 1): FormulaValue | null {
  ctx.budget.cellsTouched += n;
  if (ctx.budget.cellsTouched > ctx.limits.maxCellsTouched) {
    return formulaError("LIMIT", "Too many cells touched");
  }
  if (Date.now() > ctx.budget.cellDeadline) {
    return formulaError("LIMIT", "Evaluation time exceeded");
  }
  return null;
}

function withRef(
  value: FormulaValue,
  ref: { r1: number; c1: number; r2: number; c2: number },
): FormulaValue {
  if (Array.isArray(value)) {
    (value as RefBox).__ref = ref;
    return value;
  }
  // Box primitives so OFFSET can read __ref; valueOf preserves numeric use in most paths
  const box = {
    __ref: ref,
    __boxed: value,
    valueOf() {
      return value;
    },
    toString() {
      return String(value);
    },
  } as unknown as FormulaValue;
  return box;
}

function unwrap(v: FormulaValue): FormulaValue {
  if (
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    !(v instanceof Date) &&
    !isFormulaError(v) &&
    "__boxed" in v
  ) {
    return (v as { __boxed: FormulaValue }).__boxed;
  }
  return v;
}

function compare(op: string, left: FormulaValue, right: FormulaValue): FormulaValue {
  left = unwrap(left);
  right = unwrap(right);
  if (isFormulaError(left)) return left;
  if (isFormulaError(right)) return right;

  const ln = toNumber(left);
  const rn = toNumber(right);
  if (!isFormulaError(ln) && !isFormulaError(rn)) {
    switch (op) {
      case "=":
        return ln === rn;
      case "<>":
        return ln !== rn;
      case ">":
        return ln > rn;
      case ">=":
        return ln >= rn;
      case "<":
        return ln < rn;
      case "<=":
        return ln <= rn;
    }
  }

  const ls = String(
    typeof left === "string"
      ? left
      : isFormulaError(toStringValue(left))
        ? ""
        : toStringValue(left),
  ).toLowerCase();
  const rs = String(
    typeof right === "string"
      ? right
      : isFormulaError(toStringValue(right))
        ? ""
        : toStringValue(right),
  ).toLowerCase();
  switch (op) {
    case "=":
      return ls === rs;
    case "<>":
      return ls !== rs;
    case ">":
      return ls > rs;
    case ">=":
      return ls >= rs;
    case "<":
      return ls < rs;
    case "<=":
      return ls <= rs;
    default:
      return formulaError("VALUE");
  }
}

export function evaluateAst(ast: AstNode, ctx: EvalContext): FormulaValue {
  try {
    return unwrap(evalNode(ast, ctx));
  } catch {
    return formulaError("VALUE", "Evaluation failed");
  }
}

/** Like evaluateAst but preserves RefBox for nested calls (OFFSET). */
function evalNode(ast: AstNode, ctx: EvalContext): FormulaValue {
  const limit = touch(ctx, 0);
  if (limit) return limit;

  switch (ast.type) {
    case "number":
      return ast.value;
    case "string":
      return ast.value;
    case "bool":
      return ast.value;
    case "cell": {
      const t = touch(ctx, 1);
      if (t) return t;
      if (
        ast.row < 0 ||
        ast.col < 0 ||
        ast.row >= ctx.rowCount ||
        ast.col >= ctx.colCount
      ) {
        return formulaError("REF");
      }
      const v = ctx.getCellValue(ast.row, ast.col);
      return withRef(v, {
        r1: ast.row,
        c1: ast.col,
        r2: ast.row,
        c2: ast.col,
      });
    }
    case "range": {
      const cells = (ast.r2 - ast.r1 + 1) * (ast.c2 - ast.c1 + 1);
      if (cells > ctx.limits.maxRangeCells) {
        return formulaError("LIMIT", "Range too large");
      }
      const t = touch(ctx, cells);
      if (t) return t;
      if (
        ast.r1 < 0 ||
        ast.c1 < 0 ||
        ast.r2 >= ctx.rowCount ||
        ast.c2 >= ctx.colCount
      ) {
        return formulaError("REF");
      }
      const mat = ctx.getRange(ast.r1, ast.c1, ast.r2, ast.c2);
      return withRef(mat as unknown as FormulaValue, {
        r1: ast.r1,
        c1: ast.c1,
        r2: ast.r2,
        c2: ast.c2,
      });
    }
    case "unary": {
      const arg = unwrap(evalNode(ast.arg, ctx));
      if (isFormulaError(arg)) return arg;
      const n = toNumber(arg);
      if (isFormulaError(n)) return n;
      return ast.op === "-" ? -n : n;
    }
    case "percent": {
      const arg = unwrap(evalNode(ast.arg, ctx));
      if (isFormulaError(arg)) return arg;
      const n = toNumber(arg);
      if (isFormulaError(n)) return n;
      return n / 100;
    }
    case "binary": {
      if (ast.op === "&") {
        const l = unwrap(evalNode(ast.left, ctx));
        const r = unwrap(evalNode(ast.right, ctx));
        if (isFormulaError(l)) return l;
        if (isFormulaError(r)) return r;
        const ls = toStringValue(l);
        const rs = toStringValue(r);
        if (isFormulaError(ls)) return ls;
        if (isFormulaError(rs)) return rs;
        const out = ls + rs;
        if (out.length > ctx.limits.maxStringLength) {
          return formulaError("LIMIT", "String too long");
        }
        return out;
      }
      if (
        ast.op === "=" ||
        ast.op === "<>" ||
        ast.op === ">" ||
        ast.op === ">=" ||
        ast.op === "<" ||
        ast.op === "<="
      ) {
        return compare(
          ast.op,
          evalNode(ast.left, ctx),
          evalNode(ast.right, ctx),
        );
      }
      const l = unwrap(evalNode(ast.left, ctx));
      const r = unwrap(evalNode(ast.right, ctx));
      if (isFormulaError(l)) return l;
      if (isFormulaError(r)) return r;
      const ln = toNumber(l);
      const rn = toNumber(r);
      if (isFormulaError(ln)) return ln;
      if (isFormulaError(rn)) return rn;
      switch (ast.op) {
        case "+":
          return ln + rn;
        case "-":
          return ln - rn;
        case "*":
          return ln * rn;
        case "/":
          if (rn === 0) return formulaError("DIV0");
          return ln / rn;
        case "^": {
          const p = ln ** rn;
          if (!Number.isFinite(p)) return formulaError("NUM");
          return p;
        }
        default:
          return formulaError("VALUE");
      }
    }
    case "call": {
      const def = getFunction(ast.name);
      if (!def) return formulaError("NAME", `Unknown function: ${ast.name}`);
      if (def.volatile && !ctx.allowVolatile) {
        return formulaError("NAME", "Volatile functions disabled");
      }

      if (ast.name === "IF" && ast.args.length >= 2) {
        const cond = unwrap(evalNode(ast.args[0]!, ctx));
        const b = toBoolean(cond);
        if (isFormulaError(b)) return b;
        if (b) return unwrap(evalNode(ast.args[1]!, ctx));
        if (ast.args[2]) return unwrap(evalNode(ast.args[2], ctx));
        return false;
      }
      if (ast.name === "IFERROR" && ast.args.length >= 2) {
        const v = unwrap(evalNode(ast.args[0]!, ctx));
        if (isFormulaError(v)) return unwrap(evalNode(ast.args[1]!, ctx));
        return v;
      }

      const args: FormulaValue[] = [];
      for (const a of ast.args) {
        // Keep RefBox for OFFSET/INDIRECT consumers
        args.push(evalNode(a, ctx));
      }
      if (args.length < def.minArgs || args.length > def.maxArgs) {
        return formulaError("VALUE", "Wrong number of arguments");
      }
      // Functions that need numbers should unwrap; coerce.toNumber already handles most.
      // Pass args with unwrap for non-lookup, but OFFSET needs __ref on args[0].
      const result = def.impl(
        args.map((a, i) => {
          if (ast.name === "OFFSET" && i === 0) return a;
          if (ast.name === "INDIRECT") return unwrap(a);
          // Prefer unwrapped for math; keep arrays as-is
          if (Array.isArray(a)) return a;
          return unwrap(a);
        }),
        ctx,
      );
      return result;
    }
    default:
      return formulaError("VALUE");
  }
}
