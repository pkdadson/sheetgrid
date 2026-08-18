import { cellKey } from "../../data/cell-key.js";
import type { CellError, ColumnId, RowId } from "../../types.js";
import type {
  Command,
  CommandResult,
  EventSource,
  InternalStore,
} from "./types.js";

export class SetErrorCommand implements Command {
  readonly kind = "error.set";
  readonly history = "skip" as const;
  constructor(
    public readonly rowId: RowId,
    public readonly columnId: ColumnId,
    public readonly error: CellError | null,
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const prev =
      internal.errors.getMap().get(cellKey(this.rowId, this.columnId)) ?? null;
    internal.errors.set(this.rowId, this.columnId, this.error);
    return {
      ok: true,
      inverse: new SetErrorCommand(
        this.rowId,
        this.columnId,
        prev,
        this.source,
      ),
      events: [
        {
          type: "error.changed",
          rowId: this.rowId,
          columnId: this.columnId,
          prev,
          next: this.error,
          source: this.source,
        },
      ],
    };
  }
}
