import type { ColumnId, RowId } from "../../types.js";
import { ClearFormulaCommand } from "./clear-formula.js";
import type {
  Command,
  CommandResult,
  EventSource,
  InternalStore,
} from "./types.js";

export class SetFormulaCommand implements Command {
  readonly kind = "formula.set";
  constructor(
    public readonly rowId: RowId,
    public readonly columnId: ColumnId,
    public readonly source_: string,
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    if (!internal.formulas.isEnabled()) {
      return {
        ok: false,
        code: "unsupported",
        message: "formulas are not enabled on this grid",
      };
    }
    const prevSource = internal.formulas.getRaw(this.rowId, this.columnId);
    const prevLiteral = internal.getRowsRef().find((r) => r.id === this.rowId)
      ?.values[this.columnId];
    const ok = internal.formulas.set(this.rowId, this.columnId, this.source_);
    if (!ok) {
      return {
        ok: false,
        code: "not_found",
        message: `cell (${this.rowId}, ${this.columnId}) not found`,
      };
    }
    internal.formulas.recalcAll();
    const inverse: Command = prevSource
      ? new SetFormulaCommand(
          this.rowId,
          this.columnId,
          prevSource,
          this.source,
        )
      : new ClearFormulaCommandWithLiteral(
          this.rowId,
          this.columnId,
          prevLiteral,
          this.source,
        );
    return {
      ok: true,
      inverse,
      events: [
        {
          type: "formula.changed",
          rowId: this.rowId,
          columnId: this.columnId,
          prev: prevSource,
          next: this.source_.startsWith("=")
            ? this.source_
            : `=${this.source_}`,
          source: this.source,
        },
      ],
    };
  }
}

/** Inverse for SetFormula when there was no prior formula — clear + restore literal. */
class ClearFormulaCommandWithLiteral implements Command {
  readonly kind = "formula.cleared-restore-literal";
  constructor(
    public readonly rowId: RowId,
    public readonly columnId: ColumnId,
    public readonly literal: unknown,
    public readonly source: EventSource,
  ) {}
  apply(internal: InternalStore): CommandResult {
    if (!internal.formulas.isEnabled()) {
      return { ok: false, code: "unsupported", message: "formulas disabled" };
    }
    const prevSource = internal.formulas.getRaw(this.rowId, this.columnId);
    internal.formulas.clear(this.rowId, this.columnId);
    const rows = internal.getRowsRef();
    const idx = rows.findIndex((r) => r.id === this.rowId);
    if (idx >= 0) {
      const row = rows[idx]!;
      internal.setRows(
        rows.map((r, i) =>
          i === idx
            ? {
                id: r.id,
                values: { ...row.values, [this.columnId]: this.literal },
              }
            : r,
        ),
      );
    }
    internal.formulas.recalcAll();
    return {
      ok: true,
      inverse: prevSource
        ? new SetFormulaCommand(
            this.rowId,
            this.columnId,
            prevSource,
            this.source,
          )
        : new ClearFormulaCommandWithLiteral(
            this.rowId,
            this.columnId,
            rows[idx]?.values[this.columnId],
            this.source,
          ),
      events: [
        {
          type: "formula.changed",
          rowId: this.rowId,
          columnId: this.columnId,
          prev: prevSource,
          next: null,
          source: this.source,
        },
      ],
    };
  }
}
