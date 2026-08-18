import type { ColumnDef } from "../../types.js";
import type {
  Command,
  CommandResult,
  EventSource,
  InternalStore,
} from "./types.js";

export class ReplaceColumnsCommand implements Command {
  readonly kind = "columns.replaced";
  constructor(
    public readonly columns: ColumnDef[],
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const prevCols = internal.getColumnsRef().map((c) => ({ ...c }));
    const prevOrder = [...internal.getColumnOrderRef()];
    const next = this.columns.map((c) => ({ ...c }));
    internal.setColumns(next);
    const ids = new Set(next.map((c) => c.id));
    const order = prevOrder.filter((id) => ids.has(id));
    for (const c of next) if (!order.includes(c.id)) order.push(c.id);
    internal.setColumnOrder(order);
    if (internal.formulas.isEnabled()) internal.formulas.recalcAll();
    return {
      ok: true,
      inverse: new ReplaceColumnsAndOrderCommand(
        prevCols,
        prevOrder,
        this.source,
      ),
      events: [
        { type: "columns.replaced", prev: prevCols, next, source: this.source },
      ],
    };
  }
}

/** Inverse-only helper: sets both columns and order back to captured pre-state. */
class ReplaceColumnsAndOrderCommand implements Command {
  readonly kind = "columns-and-order.replaced";
  constructor(
    public readonly columns: ColumnDef[],
    public readonly order: string[],
    public readonly source: EventSource,
  ) {}
  apply(internal: InternalStore): CommandResult {
    const prevCols = internal.getColumnsRef().map((c) => ({ ...c }));
    const prevOrder = [...internal.getColumnOrderRef()];
    internal.setColumns(this.columns.map((c) => ({ ...c })));
    internal.setColumnOrder([...this.order]);
    if (internal.formulas.isEnabled()) internal.formulas.recalcAll();
    return {
      ok: true,
      inverse: new ReplaceColumnsAndOrderCommand(
        prevCols,
        prevOrder,
        this.source,
      ),
      events: [
        {
          type: "columns.replaced",
          prev: prevCols,
          next: this.columns,
          source: this.source,
        },
      ],
    };
  }
}
