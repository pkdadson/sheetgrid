import type { ColumnId } from "../../types.js";
import type { Command, CommandResult, EventSource, InternalStore } from "./types.js";

export class SetColumnOrderCommand implements Command {
  readonly kind = "column-order.set";
  constructor(
    public readonly order: ColumnId[],
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const cols = internal.getColumnsRef();
    const known = new Set(cols.map((c) => c.id));
    for (const id of this.order) {
      if (!known.has(id)) {
        return {
          ok: false,
          code: "invalid_argument",
          message: `unknown column id "${id}"`,
        };
      }
    }
    if (this.order.length !== cols.length) {
      return {
        ok: false,
        code: "invalid_argument",
        message: `order length ${this.order.length} does not match column count ${cols.length}`,
      };
    }
    if (new Set(this.order).size !== this.order.length) {
      return {
        ok: false,
        code: "invalid_argument",
        message: "order contains duplicate column ids",
      };
    }
    const prev = [...internal.getColumnOrderRef()];
    internal.setColumnOrder([...this.order]);
    if (internal.formulas.isEnabled()) internal.formulas.recalcAll();
    return {
      ok: true,
      inverse: new SetColumnOrderCommand(prev, this.source),
      events: [
        {
          type: "column-order.changed",
          prev,
          next: [...this.order],
          source: this.source,
        },
      ],
    };
  }
}
