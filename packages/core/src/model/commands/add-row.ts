import type { ColumnId, GridRow, RowId } from "../../types.js";
import { DeleteRowCommand } from "./delete-row.js";
import type { Command, CommandResult, EventSource, InternalStore } from "./types.js";

let syntheticCounter = 0;
export function generateRowId(): RowId {
  syntheticCounter++;
  return `row-${Date.now().toString(36)}-${syntheticCounter.toString(36)}`;
}

export interface AddRowOptions {
  at?: number | "end";
  id?: RowId;
}

export class AddRowCommand implements Command {
  readonly kind = "row.add";
  constructor(
    public readonly values: Record<ColumnId, unknown>,
    public readonly opts: AddRowOptions,
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const rows = internal.getRowsRef();
    const id = this.opts.id ?? generateRowId();
    if (rows.some((r) => r.id === id)) {
      return { ok: false, code: "conflict", message: `row id "${id}" already exists` };
    }
    const at = this.opts.at ?? "end";
    const index = at === "end" ? rows.length : Math.max(0, Math.min(rows.length, at));
    const row: GridRow = { id, values: { ...this.values } };
    const next = [...rows];
    next.splice(index, 0, row);
    internal.setRows(next);
    if (internal.formulas.isEnabled()) internal.formulas.recalcAll();
    return {
      ok: true,
      inverse: new DeleteRowCommand(id, this.source),
      events: [
        {
          type: "row.added",
          rowId: id,
          index,
          values: { ...this.values },
          source: this.source,
        },
      ],
    };
  }
}
