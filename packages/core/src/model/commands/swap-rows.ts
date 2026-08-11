import { swapItems } from "../../layout/reorder.js";
import type { RowId } from "../../types.js";
import type { Command, CommandResult, EventSource, InternalStore } from "./types.js";

export class SwapRowsCommand implements Command {
  readonly kind = "rows.swapped";
  constructor(
    public readonly a: RowId,
    public readonly b: RowId,
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const rows = internal.getRowsRef();
    const ai = rows.findIndex((r) => r.id === this.a);
    const bi = rows.findIndex((r) => r.id === this.b);
    if (ai < 0 || bi < 0) {
      return { ok: false, code: "not_found", message: "row(s) not found" };
    }
    const ids = rows.map((r) => r.id);
    const nextIds = swapItems(ids, this.a, this.b);
    const byId = new Map(rows.map((r) => [r.id, r]));
    internal.setRows(
      nextIds.map((id) => byId.get(id)!).filter((r) => r !== undefined),
    );
    if (internal.formulas.isEnabled()) internal.formulas.recalcAll();
    // Swap is its own inverse.
    return {
      ok: true,
      inverse: new SwapRowsCommand(this.a, this.b, this.source),
      events: [
        {
          type: "row.moved",
          rowId: this.a,
          from: ai,
          to: bi,
          source: this.source,
        },
        {
          type: "row.moved",
          rowId: this.b,
          from: bi,
          to: ai,
          source: this.source,
        },
      ],
    };
  }
}
