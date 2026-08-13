import type { ColumnDef, ColumnId, RowId } from "../../types.js";
import { AddColumnCommand } from "./add-column.js";
import type { Command, CommandResult, EventSource, InternalStore } from "./types.js";

/** Restore removed column + reinsert into columnOrder at original index + rehydrate formulas. */
class RestoreColumnCommand implements Command {
  readonly kind = "column.restore";
  constructor(
    public readonly def: ColumnDef,
    public readonly index: number,
    public readonly formulas: Array<[RowId, string]>,
    public readonly source: EventSource,
    public readonly defIndex: number = -1,
  ) {}
  apply(internal: InternalStore): CommandResult {
    const cols = internal.getColumnsRef();
    if (cols.some((c) => c.id === this.def.id)) {
      return { ok: false, code: "conflict", message: `column "${this.def.id}" exists` };
    }
    const nextCols = [...cols];
    const insertAt = this.defIndex >= 0 && this.defIndex <= nextCols.length ? this.defIndex : nextCols.length;
    nextCols.splice(insertAt, 0, { ...this.def });
    internal.setColumns(nextCols);
    const order = internal.getColumnOrderRef();
    const nextOrder = [...order];
    nextOrder.splice(this.index, 0, this.def.id);
    internal.setColumnOrder(nextOrder);
    if (internal.formulas.isEnabled()) {
      for (const [rowId, source] of this.formulas) {
        internal.formulas.set(rowId, this.def.id, source);
      }
      internal.formulas.recalcAll();
    }
    return {
      ok: true,
      inverse: new DeleteColumnCommand(this.def.id, this.source),
      events: [
        {
          type: "column.added",
          columnId: this.def.id,
          index: this.index,
          def: { ...this.def },
          source: this.source,
        },
      ],
    };
  }
}

export class DeleteColumnCommand implements Command {
  readonly kind = "column.delete";
  constructor(
    public readonly columnId: ColumnId,
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const cols = internal.getColumnsRef();
    const idxInCols = cols.findIndex((c) => c.id === this.columnId);
    if (idxInCols < 0) {
      return { ok: false, code: "not_found", message: `column "${this.columnId}"` };
    }
    const def = { ...cols[idxInCols]! };
    const order = internal.getColumnOrderRef();
    const idxInOrder = order.indexOf(this.columnId);

    // Capture formulas on this column across all rows.
    const formulas: Array<[RowId, string]> = [];
    if (internal.formulas.isEnabled()) {
      for (const [rowId, columnId, source] of internal.formulas.serialize()) {
        if (columnId === this.columnId) {
          formulas.push([rowId, source]);
          internal.formulas.clear(rowId, columnId);
        }
      }
    }

    internal.setColumns(cols.filter((c) => c.id !== this.columnId));
    internal.setColumnOrder(order.filter((id) => id !== this.columnId));
    if (internal.formulas.isEnabled()) internal.formulas.recalcAll();

    return {
      ok: true,
      inverse: new RestoreColumnCommand(def, idxInOrder, formulas, this.source, idxInCols),
      events: [
        {
          type: "column.removed",
          columnId: this.columnId,
          index: idxInOrder,
          def,
          source: this.source,
        },
      ],
    };
  }
}
