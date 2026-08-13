import { swapItems } from "../../layout/reorder.js";
import type { ColumnId } from "../../types.js";
import type { Command, CommandResult, EventSource, InternalStore } from "./types.js";

export class SwapColumnsCommand implements Command {
  readonly kind = "columns.swapped";
  constructor(
    public readonly a: ColumnId,
    public readonly b: ColumnId,
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const order = internal.getColumnOrderRef();
    const ai = order.indexOf(this.a);
    const bi = order.indexOf(this.b);
    if (ai < 0 || bi < 0) {
      return { ok: false, code: "not_found", message: "column(s) not found" };
    }
    internal.setColumnOrder(swapItems(order, this.a, this.b));
    if (internal.formulas.isEnabled()) internal.formulas.recalcAll();
    return {
      ok: true,
      inverse: new SwapColumnsCommand(this.a, this.b, this.source),
      events: [
        { type: "column.moved", columnId: this.a, from: ai, to: bi, source: this.source },
        { type: "column.moved", columnId: this.b, from: bi, to: ai, source: this.source },
      ],
    };
  }
}
