import { moveItem } from "../../layout/reorder.js";
import type { ColumnId } from "../../types.js";
import type {
  Command,
  CommandResult,
  EventSource,
  InternalStore,
} from "./types.js";

export class MoveColumnCommand implements Command {
  readonly kind = "column.moved";
  constructor(
    public readonly columnId: ColumnId,
    public readonly toIndex: number,
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const order = internal.getColumnOrderRef();
    const from = order.indexOf(this.columnId);
    if (from < 0) {
      return {
        ok: false,
        code: "not_found",
        message: `column "${this.columnId}"`,
      };
    }
    if (from === this.toIndex) {
      return {
        ok: true,
        inverse: new MoveColumnCommand(this.columnId, from, this.source),
        events: [],
      };
    }
    const next = moveItem(order, this.columnId, this.toIndex);
    internal.setColumnOrder(next);
    if (internal.formulas.isEnabled()) internal.formulas.recalcAll();
    return {
      ok: true,
      inverse: new MoveColumnCommand(this.columnId, from, this.source),
      events: [
        {
          type: "column.moved",
          columnId: this.columnId,
          from,
          to: this.toIndex,
          source: this.source,
        },
      ],
    };
  }
}
