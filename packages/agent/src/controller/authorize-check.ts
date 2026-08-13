import type { ColumnDef, ColumnId } from "@sheetgrid/core";
import type { AgentOp } from "../types/agent-op.js";
import type { AuthorizeFn } from "../types/authorize.js";
import { fail, ok, type OpResult } from "../types/op-result.js";

const READ_OPS = new Set([
  "grid.get_schema",
  "grid.get_data",
  "grid.get_cell",
  "grid.query_rows",
  "grid.get_selection",
]);

const STRUCTURAL_OPS = new Set([
  "grid.add_row",
  "grid.delete_row",
  "grid.move_row",
  "grid.add_column",
  "grid.delete_column",
  "grid.move_column",
  "grid.update_column",
  "grid.set_sort",
  "grid.clear_sort",
  "grid.set_filter",
  "grid.select",
  "grid.undo",
  "grid.redo",
  "grid.snapshot",
  "grid.restore",
  "grid.batch",
]);

export interface AuthOptions {
  readOnly?: boolean;
  authorize?: AuthorizeFn;
}

/** Returns true if the column can be written to by an agent. */
export function isColumnAgentWritable(col: ColumnDef | undefined): boolean {
  if (!col) return false;
  const explicit = (col as ColumnDef & { agentWritable?: boolean }).agentWritable;
  if (explicit === false) return false;
  if (explicit === true) return true;
  // Legacy: fall back to `editable === false` as read-only.
  if (col.editable === false) return false;
  return true;
}

function nonWritableColumns(op: AgentOp, cols: ColumnDef[]): ColumnId[] {
  const byId = new Map(cols.map((c) => [c.id, c]));
  const bad: ColumnId[] = [];
  const check = (columnId: ColumnId) => {
    if (!isColumnAgentWritable(byId.get(columnId))) bad.push(columnId);
  };
  switch (op.type) {
    case "grid.set_cell":
      check(op.columnId);
      break;
    case "grid.set_cells":
      for (const p of op.patches) check(p.columnId);
      break;
    case "grid.update_row":
      for (const k of Object.keys(op.patch)) check(k);
      break;
    case "grid.set_formula":
    case "grid.clear_formula":
      check(op.columnId);
      break;
    default:
      break;
  }
  return [...new Set(bad)];
}

export function runAuthCheck(
  op: AgentOp,
  columns: ColumnDef[],
  opts: AuthOptions,
): OpResult {
  if (READ_OPS.has(op.type)) return ok(undefined);

  // 1. Grid-level readOnly.
  if (opts.readOnly === true) {
    return fail("read_only", "grid is read-only");
  }

  // 2. Per-column writable check (only for cell-write ops; structural ops skip).
  if (!STRUCTURAL_OPS.has(op.type)) {
    const bad = nonWritableColumns(op, columns);
    if (bad.length > 0) {
      // For ops that target multiple patches (set_cells), always use plural form.
      const multiPatch = op.type === "grid.set_cells";
      const msg =
        bad.length === 1
          ? `column "${bad[0]}" is not agent-writable`
          : `columns [${bad.join(", ")}] are not agent-writable`;
      return {
        ok: false,
        code: "read_only",
        message: msg,
        details:
          multiPatch || bad.length > 1
            ? { columnIds: bad }
            : { columnId: bad[0] },
      };
    }
  }

  // 3. Consumer authorize() hook.
  if (opts.authorize) {
    const decision = opts.authorize(op);
    if (decision !== true) {
      return fail("read_only", decision);
    }
  }

  return ok(undefined);
}
