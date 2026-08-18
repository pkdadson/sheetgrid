import type { ColumnDef } from "../../types.js";
import { DeleteColumnCommand } from "./delete-column.js";
import type {
  Command,
  CommandResult,
  EventSource,
  InternalStore,
} from "./types.js";

export interface AddColumnOptions {
  at?: number | "end";
}

export class AddColumnCommand implements Command {
  readonly kind = "column.add";
  constructor(
    public readonly def: ColumnDef,
    public readonly opts: AddColumnOptions,
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const cols = internal.getColumnsRef();
    if (cols.some((c) => c.id === this.def.id)) {
      return {
        ok: false,
        code: "conflict",
        message: `column "${this.def.id}" already exists`,
      };
    }
    const nextCols = [...cols, { ...this.def }];
    internal.setColumns(nextCols);
    const at = this.opts.at ?? "end";
    const order = internal.getColumnOrderRef();
    const index =
      at === "end" ? order.length : Math.max(0, Math.min(order.length, at));
    const nextOrder = [...order];
    nextOrder.splice(index, 0, this.def.id);
    internal.setColumnOrder(nextOrder);
    if (internal.formulas.isEnabled()) internal.formulas.recalcAll();
    return {
      ok: true,
      inverse: new DeleteColumnCommand(this.def.id, this.source),
      events: [
        {
          type: "column.added",
          columnId: this.def.id,
          index,
          def: { ...this.def },
          source: this.source,
        },
      ],
    };
  }
}
