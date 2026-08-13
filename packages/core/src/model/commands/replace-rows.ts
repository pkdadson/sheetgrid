import type { GridRow } from "../../types.js";
import { cloneRow } from "./base.js";
import type { Command, CommandResult, EventSource, InternalStore } from "./types.js";

export class ReplaceRowsCommand implements Command {
  readonly kind = "rows.replaced";
  constructor(
    public readonly rows: GridRow[],
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const prev = internal.getRowsRef().map(cloneRow);
    internal.setRows(this.rows.map(cloneRow));
    if (internal.formulas.isEnabled()) internal.formulas.recalcAll();
    return {
      ok: true,
      inverse: new ReplaceRowsCommand(prev, this.source),
      events: [
        {
          type: "rows.replaced",
          prev,
          next: internal.getRowsRef().map(cloneRow),
          source: this.source,
        },
      ],
    };
  }
}
