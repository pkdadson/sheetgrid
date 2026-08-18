import type { AstNode } from "./ast.js";
import { collectDeps } from "./deps.js";
import { formulaError, isFormulaError } from "./errors.js";
import { evaluateAst } from "./evaluate.js";
import { mergeFormulaLimits } from "./limits.js";
import { parseFormula } from "./parser.js";
import { cellRefKey } from "./refs.js";
import type {
  EvalContext,
  FormulaEngineOptions,
  FormulaValue,
} from "./types.js";

export interface FormulaCellState {
  source: string;
  ast?: AstNode;
  deps: string[];
  volatile: boolean;
  result: FormulaValue;
}

export interface RecalcInput {
  formulas: Map<string, FormulaCellState>;
  getLiteral(row: number, col: number): FormulaValue;
  setResult(row: number, col: number, value: FormulaValue): void;
  rowCount: number;
  colCount: number;
  dirty: string[];
  options?: FormulaEngineOptions;
}

function parseKey(key: string): { row: number; col: number } {
  const [r, c] = key.split(":").map(Number);
  return { row: r!, col: c! };
}

export function recalcFormulas(input: RecalcInput): void {
  const limits = mergeFormulaLimits(input.options?.limits);
  const allowIndirect = input.options?.allowIndirect ?? false;
  const allowVolatile = input.options?.allowVolatile ?? true;
  const batchStart = Date.now();
  const batchDeadline = batchStart + limits.maxEvalMsPerBatch;

  // Ensure ASTs and deps
  for (const [key, cell] of input.formulas) {
    if (!cell.ast) {
      const parsed = parseFormula(cell.source, limits);
      if (!parsed.ok) {
        cell.result = parsed.error;
        cell.deps = [];
        cell.volatile = false;
        const { row, col } = parseKey(key);
        input.setResult(row, col, parsed.error);
        continue;
      }
      cell.ast = parsed.ast;
      const info = collectDeps(parsed.ast, limits.maxRangeCells);
      cell.deps = info.deps;
      cell.volatile = info.volatile;
    }
  }

  // reverse dependents: dep -> formulas that use it
  const dependents = new Map<string, Set<string>>();
  for (const [key, cell] of input.formulas) {
    for (const d of cell.deps) {
      let set = dependents.get(d);
      if (!set) {
        set = new Set();
        dependents.set(d, set);
      }
      set.add(key);
    }
  }

  const dirty = new Set<string>(input.dirty);
  for (const [key, cell] of input.formulas) {
    if (cell.volatile) dirty.add(key);
  }

  // expand transitive dependents
  const queue = [...dirty];
  while (queue.length) {
    const k = queue.pop()!;
    const deps = dependents.get(k);
    if (!deps) continue;
    for (const d of deps) {
      if (!dirty.has(d)) {
        dirty.add(d);
        queue.push(d);
      }
    }
  }

  // Only formula cells in dirty set
  const nodes = [...dirty].filter((k) => input.formulas.has(k));

  // Build subgraph edges: formula -> formula deps only
  const inDegree = new Map<string, number>();
  const edges = new Map<string, string[]>();
  for (const k of nodes) {
    inDegree.set(k, 0);
    edges.set(k, []);
  }
  for (const k of nodes) {
    const cell = input.formulas.get(k)!;
    for (const d of cell.deps) {
      if (input.formulas.has(d) && nodes.includes(d)) {
        // k depends on d => edge d -> k
        edges.get(d)!.push(k);
        inDegree.set(k, (inDegree.get(k) ?? 0) + 1);
      }
    }
  }

  const order: string[] = [];
  const ready = nodes.filter((k) => (inDegree.get(k) ?? 0) === 0);
  while (ready.length) {
    const k = ready.pop()!;
    order.push(k);
    for (const next of edges.get(k) ?? []) {
      const deg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, deg);
      if (deg === 0) ready.push(next);
    }
  }

  const cyclic = new Set(nodes.filter((k) => !order.includes(k)));
  for (const k of cyclic) {
    const cell = input.formulas.get(k)!;
    cell.result = formulaError("CYCLE");
    const { row, col } = parseKey(k);
    input.setResult(row, col, cell.result);
  }

  const results = new Map<string, FormulaValue>();
  // seed non-dirty formula results
  for (const [key, cell] of input.formulas) {
    if (!dirty.has(key) && !isFormulaError(cell.result)) {
      results.set(key, cell.result);
    }
  }

  // L2: makeCtx() is called once per formula cell, so `budget.cellsTouched`
  // resets to 0 for every cell — the `maxCellsTouched` limit is per-formula
  // evaluation, not cumulative per recalc-batch. For batch-cumulative limits
  // use the deadline via `maxEvalMsPerBatch`.
  const makeCtx = (): EvalContext => ({
    rowCount: input.rowCount,
    colCount: input.colCount,
    limits,
    budget: {
      cellsTouched: 0,
      startedAt: Date.now(),
      cellDeadline: Math.min(
        Date.now() + limits.maxEvalMsPerCell,
        batchDeadline,
      ),
    },
    allowIndirect,
    allowVolatile,
    now: () => new Date(),
    rng: () => Math.random(),
    getCellValue(r, c) {
      const key = cellRefKey(r, c);
      if (results.has(key)) return results.get(key)!;
      const f = input.formulas.get(key);
      if (f && dirty.has(key) && cyclic.has(key)) {
        return formulaError("CYCLE");
      }
      if (f && !dirty.has(key)) return f.result;
      // literal or not-yet-evaluated formula in order
      if (f && results.has(key)) return results.get(key)!;
      if (f) {
        // dependency not yet computed — use last result or blank
        return f.result;
      }
      return input.getLiteral(r, c);
    },
    getRange(r1, c1, r2, c2) {
      const out: FormulaValue[][] = [];
      for (let r = r1; r <= r2; r++) {
        const row: FormulaValue[] = [];
        for (let c = c1; c <= c2; c++) {
          row.push(this.getCellValue(r, c));
        }
        out.push(row);
      }
      return out;
    },
  });

  for (const k of order) {
    if (Date.now() > batchDeadline) {
      const cell = input.formulas.get(k)!;
      cell.result = formulaError("LIMIT", "Batch time exceeded");
      const { row, col } = parseKey(k);
      input.setResult(row, col, cell.result);
      results.set(k, cell.result);
      continue;
    }
    const cell = input.formulas.get(k)!;
    if (!cell.ast) {
      cell.result = formulaError("PARSE");
    } else {
      cell.result = evaluateAst(cell.ast, makeCtx());
    }
    results.set(k, cell.result);
    const { row, col } = parseKey(k);
    input.setResult(row, col, cell.result);
  }
}
