import type { ColumnId, GridRow, RowId } from "../../types.js";
import { AddRowCommand } from "./add-row.js";
import type { Command, CommandResult, EventSource, InternalStore } from "./types.js";

/**
 * Compound inverse: re-insert the row at original index AND restore formulas.
 * We can't use AddRowCommand directly because formulas need re-hydration.
 */
class ReinsertRowCommand implements Command {
  readonly kind = "row.reinsert";
  constructor(
    public readonly row: GridRow,
    public readonly index: number,
    public readonly formulas: Array<[ColumnId, string]>,
    public readonly source: EventSource,
  ) {}
  apply(internal: InternalStore): CommandResult {
    const rows = internal.getRowsRef();
    if (rows.some((r) => r.id === this.row.id)) {
      return { ok: false, code: "conflict", message: `row id "${this.row.id}" already exists` };
    }
    const next = [...rows];
    next.splice(this.index, 0, { id: this.row.id, values: { ...this.row.values } });
    internal.setRows(next);
    if (internal.formulas.isEnabled()) {
      for (const [columnId, source] of this.formulas) {
        internal.formulas.set(this.row.id, columnId, source);
      }
      internal.formulas.recalcAll();
    }
    return {
      ok: true,
      inverse: new DeleteRowCommand(this.row.id, this.source),
      events: [
        {
          type: "row.added",
          rowId: this.row.id,
          index: this.index,
          values: { ...this.row.values },
          source: this.source,
        },
      ],
    };
  }
}

export class DeleteRowCommand implements Command {
  readonly kind = "row.delete";
  constructor(
    public readonly rowId: RowId,
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const rows = internal.getRowsRef();
    const index = rows.findIndex((r) => r.id === this.rowId);
    if (index < 0) {
      return { ok: false, code: "not_found", message: `row "${this.rowId}"` };
    }
    const removed = rows[index]!;

    // Capture formulas on this row before removal.
    const formulas: Array<[ColumnId, string]> = [];
    if (internal.formulas.isEnabled()) {
      for (const [rowId, columnId, source] of internal.formulas.serialize()) {
        if (rowId === this.rowId) {
          formulas.push([columnId, source]);
          internal.formulas.clear(rowId, columnId);
        }
      }
    }

    const next = [...rows];
    next.splice(index, 1);
    internal.setRows(next);
    if (internal.formulas.isEnabled()) internal.formulas.recalcAll();

    return {
      ok: true,
      inverse: new ReinsertRowCommand(
        { id: removed.id, values: { ...removed.values } },
        index,
        formulas,
        this.source,
      ),
      events: [
        {
          type: "row.removed",
          rowId: this.rowId,
          index,
          values: { ...removed.values },
          source: this.source,
        },
      ],
    };
  }
}
