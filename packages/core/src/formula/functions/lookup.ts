import { flattenValues, toNumber, toStringValue } from "../coerce.js";
import { formulaError, isFormulaError } from "../errors.js";
import { colIndexToLetters, parseA1, parseA1Range } from "../refs.js";
import type { FormulaValue } from "../types.js";
import type { FormulaFnDef } from "./types.js";

function asMatrix(v: FormulaValue): FormulaValue[][] {
  if (!Array.isArray(v)) return [[v]];
  if (v.length === 0) return [];
  if (Array.isArray(v[0])) return v as FormulaValue[][];
  return (v as FormulaValue[]).map((x) => [x]);
}

export const lookupFunctions: FormulaFnDef[] = [
  {
    name: "INDEX",
    minArgs: 1,
    maxArgs: 3,
    impl: (args) => {
      const mat = asMatrix(args[0]!);
      const row = args[1] !== undefined ? toNumber(args[1]) : 1;
      const col = args[2] !== undefined ? toNumber(args[2]) : 1;
      if (isFormulaError(row)) return row;
      if (isFormulaError(col)) return col;
      const r = Math.trunc(row) - 1;
      const c = Math.trunc(col) - 1;
      if (r < 0 || c < 0 || r >= mat.length || c >= (mat[0]?.length ?? 0)) {
        return formulaError("REF");
      }
      return mat[r]![c]!;
    },
  },
  {
    name: "MATCH",
    minArgs: 2,
    maxArgs: 3,
    impl: (args) => {
      const lookup = args[0]!;
      const range = flattenValues(args[1]!);
      const type = args[2] !== undefined ? toNumber(args[2]) : 1;
      if (isFormulaError(type)) return type;
      const t = Math.trunc(type);
      if (t === 0) {
        for (let i = 0; i < range.length; i++) {
          if (String(range[i]) === String(lookup)) return i + 1;
        }
        return formulaError("NA");
      }
      // approximate: exact only for v1 simplicity when type !== 0
      for (let i = 0; i < range.length; i++) {
        if (String(range[i]) === String(lookup)) return i + 1;
      }
      return formulaError("NA");
    },
  },
  {
    name: "VLOOKUP",
    minArgs: 3,
    maxArgs: 4,
    impl: (args) => {
      const lookup = args[0]!;
      const mat = asMatrix(args[1]!);
      const colIdx = toNumber(args[2]!);
      if (isFormulaError(colIdx)) return colIdx;
      const exact = args[3] === false || args[3] === 0;
      const c = Math.trunc(colIdx) - 1;
      if (c < 0) return formulaError("VALUE");
      for (const row of mat) {
        if (String(row[0]) === String(lookup) || (!exact && row[0] === lookup)) {
          if (c >= row.length) return formulaError("REF");
          return row[c]!;
        }
      }
      // approximate: last where first col <= lookup if numbers
      if (!exact) {
        const ln = toNumber(lookup);
        if (!isFormulaError(ln)) {
          let best: FormulaValue | null = null;
          for (const row of mat) {
            const key = toNumber(row[0]!);
            if (!isFormulaError(key) && key <= ln) {
              best = c < row.length ? row[c]! : formulaError("REF");
            }
          }
          if (best !== null) return best;
        }
      }
      return formulaError("NA");
    },
  },
  {
    name: "HLOOKUP",
    minArgs: 3,
    maxArgs: 4,
    impl: (args) => {
      const lookup = args[0]!;
      const mat = asMatrix(args[1]!);
      const rowIdx = toNumber(args[2]!);
      if (isFormulaError(rowIdx)) return rowIdx;
      const r = Math.trunc(rowIdx) - 1;
      if (r < 0 || mat.length === 0) return formulaError("VALUE");
      const width = mat[0]!.length;
      for (let c = 0; c < width; c++) {
        if (String(mat[0]![c]) === String(lookup)) {
          if (r >= mat.length) return formulaError("REF");
          return mat[r]![c]!;
        }
      }
      return formulaError("NA");
    },
  },
  {
    name: "XLOOKUP",
    minArgs: 3,
    maxArgs: 6,
    impl: (args) => {
      const lookup = args[0]!;
      const lookupRange = flattenValues(args[1]!);
      const returnRange = flattenValues(args[2]!);
      const ifNotFound = args[3];
      for (let i = 0; i < lookupRange.length; i++) {
        if (String(lookupRange[i]) === String(lookup)) {
          return returnRange[i] ?? null;
        }
      }
      return ifNotFound !== undefined ? ifNotFound : formulaError("NA");
    },
  },
  {
    name: "LOOKUP",
    minArgs: 2,
    maxArgs: 3,
    impl: (args) => {
      const lookup = args[0]!;
      if (args.length === 2) {
        // vector form not fully supported for 2D — treat as VLOOKUP col 2
        return formulaError("NA");
      }
      const lookupRange = flattenValues(args[1]!);
      const resultRange = flattenValues(args[2]!);
      for (let i = 0; i < lookupRange.length; i++) {
        if (String(lookupRange[i]) === String(lookup)) {
          return resultRange[i] ?? null;
        }
      }
      return formulaError("NA");
    },
  },
  {
    name: "CHOOSE",
    minArgs: 2,
    maxArgs: Infinity,
    impl: (args) => {
      const idx = toNumber(args[0]!);
      if (isFormulaError(idx)) return idx;
      const i = Math.trunc(idx);
      if (i < 1 || i >= args.length) return formulaError("VALUE");
      return args[i]!;
    },
  },
  {
    name: "ROW",
    minArgs: 0,
    maxArgs: 1,
    impl: (args) => {
      if (args.length === 0) return 1;
      const v = args[0]!;
      // if range/cell was passed as evaluated value we lose coords — require ref-only via special case
      // When evaluate passes range as matrix, ROW returns first row index is unknown.
      // Spec: ROW(ref) — evaluator should pass a marker. For v1, if number matrix from range, return 1.
      if (typeof v === "object" && v && "row" in (v as object)) {
        return (v as { row: number }).row + 1;
      }
      return 1;
    },
  },
  {
    name: "COLUMN",
    minArgs: 0,
    maxArgs: 1,
    impl: () => 1,
  },
  {
    name: "ROWS",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const mat = asMatrix(args[0]!);
      return mat.length;
    },
  },
  {
    name: "COLUMNS",
    minArgs: 1,
    maxArgs: 1,
    impl: (args) => {
      const mat = asMatrix(args[0]!);
      return mat[0]?.length ?? 0;
    },
  },
  {
    name: "ADDRESS",
    minArgs: 2,
    maxArgs: 5,
    impl: (args) => {
      const row = toNumber(args[0]!);
      const col = toNumber(args[1]!);
      if (isFormulaError(row) || isFormulaError(col)) {
        return isFormulaError(row) ? row : col;
      }
      const abs = args[2] !== undefined ? toNumber(args[2]) : 1;
      if (isFormulaError(abs)) return abs;
      const r = Math.trunc(row);
      const c = Math.trunc(col);
      if (r < 1 || c < 1) return formulaError("VALUE");
      const letters = colIndexToLetters(c - 1);
      const a = Math.trunc(abs);
      if (a === 1) return `$${letters}$${r}`;
      if (a === 2) return `${letters}$${r}`;
      if (a === 3) return `$${letters}${r}`;
      return `${letters}${r}`;
    },
  },
  {
    name: "OFFSET",
    minArgs: 3,
    maxArgs: 5,
    impl: (args, ctx) => {
      // OFFSET requires ref; when given a scalar we cannot offset. Use range matrix origin 0,0 if single cell value.
      // For proper OFFSET, evaluate.ts should pass range meta. Simplified: treat first arg as range matrix at unknown origin — not enough info.
      // Better approach: if arg is range-shaped array, use size only with rows/cols offset from top-left of getRange via special values.
      // Implementation: first arg must be range from evaluate — we store as matrix; OFFSET from A1 only is wrong.
      // Store ref coords in a weak map? Simpler: re-parse not available.
      // Practical v1: OFFSET only works when first argument is a range/cell and evaluate passes RefValue.
      const ref = args[0] as FormulaValue & {
        __ref?: { r1: number; c1: number; r2: number; c2: number };
      };
      const rows = toNumber(args[1]!);
      const cols = toNumber(args[2]!);
      if (isFormulaError(rows) || isFormulaError(cols)) {
        return isFormulaError(rows) ? rows : cols;
      }
      const height =
        args[3] !== undefined ? toNumber(args[3]) : ref.__ref
          ? ref.__ref.r2 - ref.__ref.r1 + 1
          : 1;
      const width =
        args[4] !== undefined ? toNumber(args[4]) : ref.__ref
          ? ref.__ref.c2 - ref.__ref.c1 + 1
          : 1;
      if (isFormulaError(height) || isFormulaError(width)) {
        return isFormulaError(height) ? height : width;
      }
      const h = Math.trunc(height as number);
      const w = Math.trunc(width as number);
      if (Math.abs(h) > ctx.limits.maxOffsetSize || Math.abs(w) > ctx.limits.maxOffsetSize) {
        return formulaError("LIMIT", "OFFSET too large");
      }
      const base = ref.__ref ?? { r1: 0, c1: 0, r2: 0, c2: 0 };
      const r1 = base.r1 + Math.trunc(rows as number);
      const c1 = base.c1 + Math.trunc(cols as number);
      const r2 = r1 + h - 1;
      const c2 = c1 + w - 1;
      if (r1 < 0 || c1 < 0 || r2 >= ctx.rowCount || c2 >= ctx.colCount) {
        return formulaError("REF");
      }
      return ctx.getRange(r1, c1, r2, c2);
    },
  },
  {
    name: "INDIRECT",
    minArgs: 1,
    maxArgs: 2,
    impl: (args, ctx) => {
      if (!ctx.allowIndirect) return formulaError("REF", "INDIRECT disabled");
      const s = toStringValue(args[0]!);
      if (isFormulaError(s)) return s;
      if (s.includes("!")) return formulaError("REF");
      const range = parseA1Range(s);
      if (!range) {
        const cell = parseA1(s);
        if (!cell) return formulaError("REF");
        if (
          cell.row < 0 ||
          cell.col < 0 ||
          cell.row >= ctx.rowCount ||
          cell.col >= ctx.colCount
        ) {
          return formulaError("REF");
        }
        return ctx.getCellValue(cell.row, cell.col);
      }
      const cells =
        (range.r2 - range.r1 + 1) * (range.c2 - range.c1 + 1);
      if (cells > ctx.limits.maxRangeCells) return formulaError("LIMIT");
      // L1: apply the same four-way bounds check as the cell-ref path above
      if (
        range.r1 < 0 ||
        range.c1 < 0 ||
        range.r2 >= ctx.rowCount ||
        range.c2 >= ctx.colCount ||
        range.r1 > range.r2 ||
        range.c1 > range.c2
      ) {
        return formulaError("REF", "INDIRECT range out of bounds");
      }
      return ctx.getRange(range.r1, range.c1, range.r2, range.c2);
    },
  },
];
