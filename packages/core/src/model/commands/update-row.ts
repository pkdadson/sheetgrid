import type { ColumnId, RowId } from "../../types.js";
import type {
  Command,
  CommandResult,
  EventSource,
  InternalStore,
} from "./types.js";

export class UpdateRowCommand implements Command {
  readonly kind = "row.update";
  constructor(
    public readonly rowId: RowId,
    public readonly patch: Record<ColumnId, unknown>,
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const rows = internal.getRowsRef();
    const idx = rows.findIndex((r) => r.id === this.rowId);
    if (idx < 0) {
      return { ok: false, code: "not_found", message: `row "${this.rowId}"` };
    }
    const row = rows[idx]!;
    const prev: Record<ColumnId, unknown> = {};
    let changed = false;
    for (const [k, v] of Object.entries(this.patch)) {
      prev[k] = row.values[k];
      if (!Object.is(prev[k], v)) changed = true;
    }
    if (!changed) {
      return {
        ok: true,
        inverse: new UpdateRowCommand(this.rowId, prev, this.source),
        events: [],
      };
    }
    const nextValues = { ...row.values, ...this.patch };
    internal.setRows(
      rows.map((r, i) => (i === idx ? { id: r.id, values: nextValues } : r)),
    );
    if (internal.formulas.isEnabled()) {
      for (const key of Object.keys(this.patch)) {
        // A direct value patch invalidates any formula on that cell.
        if (internal.formulas.getRaw(this.rowId, key) !== null) {
          internal.formulas.clear(this.rowId, key);
        }
      }
      internal.formulas.recalcAll();
    }
    return {
      ok: true,
      inverse: new UpdateRowCommand(this.rowId, prev, this.source),
      events: [
        {
          type: "row.updated",
          rowId: this.rowId,
          patch: { ...this.patch },
          prev,
          source: this.source,
        },
      ],
    };
  }
}
