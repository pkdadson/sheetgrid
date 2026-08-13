import { moveItem } from "../../layout/reorder.js";
import type { RowId } from "../../types.js";
import type { Command, CommandResult, EventSource, InternalStore } from "./types.js";

export class MoveRowCommand implements Command {
  readonly kind = "row.moved";
  constructor(
    public readonly rowId: RowId,
    public readonly toIndex: number,
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const rows = internal.getRowsRef();
    const from = rows.findIndex((r) => r.id === this.rowId);
    if (from < 0) {
      return { ok: false, code: "not_found", message: `row "${this.rowId}"` };
    }
    if (from === this.toIndex) {
      return {
        ok: true,
        inverse: new MoveRowCommand(this.rowId, from, this.source),
        events: [],
      };
    }
    const ids = rows.map((r) => r.id);
    const nextIds = moveItem(ids, this.rowId, this.toIndex);
    const byId = new Map(rows.map((r) => [r.id, r]));
    internal.setRows(
      nextIds.map((id) => byId.get(id)!).filter((r) => r !== undefined),
    );
    if (internal.formulas.isEnabled()) internal.formulas.recalcAll();
    return {
      ok: true,
      inverse: new MoveRowCommand(this.rowId, from, this.source),
      events: [
        {
          type: "row.moved",
          rowId: this.rowId,
          from,
          to: this.toIndex,
          source: this.source,
        },
      ],
    };
  }
}
