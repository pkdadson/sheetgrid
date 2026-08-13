import type { ColumnId, RowId } from "../../types.js";
import { findRowIndex } from "./base.js";
import type {
  Command,
  CommandResult,
  EventSource,
  InternalStore,
} from "./types.js";

export class SetCellCommand implements Command {
  readonly kind = "cell.set";
  constructor(
    public readonly rowId: RowId,
    public readonly columnId: ColumnId,
    public readonly value: unknown,
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const rows = internal.getRowsRef();
    const idx = findRowIndex(rows, this.rowId);
    if (idx < 0) {
      return {
        ok: false,
        code: "not_found",
        message: `row "${this.rowId}" not found`,
      };
    }
    const prevRow = rows[idx]!;
    const prev = prevRow.values[this.columnId];
    const next = this.value;

    if (Object.is(prev, next)) {
      // No-op. Inverse is a no-op that yields the same command as inverse.
      return {
        ok: true,
        inverse: new SetCellCommand(this.rowId, this.columnId, prev, this.source),
        events: [],
      };
    }

    const nextValues = { ...prevRow.values, [this.columnId]: next };
    const nextRows = rows.map((r, i) =>
      i === idx ? { id: r.id, values: nextValues } : r,
    );
    internal.setRows(nextRows);

    // Setting a literal value invalidates any formula on this cell.
    if (internal.formulas.isEnabled()) {
      const raw = internal.formulas.getRaw(this.rowId, this.columnId);
      if (raw !== null) internal.formulas.clear(this.rowId, this.columnId);
      internal.formulas.recalcAll();
    }

    return {
      ok: true,
      inverse: new SetCellCommand(this.rowId, this.columnId, prev, this.source),
      events: [
        {
          type: "cell.changed",
          rowId: this.rowId,
          columnId: this.columnId,
          prev,
          next,
          source: this.source,
        },
      ],
    };
  }
}
