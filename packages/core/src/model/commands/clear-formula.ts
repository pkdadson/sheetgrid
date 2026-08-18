import type { ColumnId, RowId } from "../../types.js";
import { SetFormulaCommand } from "./set-formula.js";
import type {
  Command,
  CommandResult,
  EventSource,
  InternalStore,
} from "./types.js";

export class ClearFormulaCommand implements Command {
  readonly kind = "formula.clear";
  constructor(
    public readonly rowId: RowId,
    public readonly columnId: ColumnId,
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    if (!internal.formulas.isEnabled()) {
      return { ok: false, code: "unsupported", message: "formulas disabled" };
    }
    const prevSource = internal.formulas.getRaw(this.rowId, this.columnId);
    if (prevSource === null) {
      // No-op — inverse is a no-op that puts the cleared state back.
      return {
        ok: true,
        inverse: new ClearFormulaCommand(
          this.rowId,
          this.columnId,
          this.source,
        ),
        events: [],
      };
    }
    internal.formulas.clear(this.rowId, this.columnId);
    internal.formulas.recalcAll();
    return {
      ok: true,
      inverse: new SetFormulaCommand(
        this.rowId,
        this.columnId,
        prevSource,
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
