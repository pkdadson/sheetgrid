import type { ColumnDef, ColumnId } from "../../types.js";
import type {
  Command,
  CommandResult,
  EventSource,
  InternalStore,
} from "./types.js";

export class UpdateColumnCommand implements Command {
  readonly kind = "column.update";
  constructor(
    public readonly columnId: ColumnId,
    public readonly patch: Partial<ColumnDef>,
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    if ("id" in this.patch) {
      return {
        ok: false,
        code: "invalid_argument",
        message: "column id cannot be changed via updateColumn",
      };
    }
    const cols = internal.getColumnsRef();
    const idx = cols.findIndex((c) => c.id === this.columnId);
    if (idx < 0) {
      return {
        ok: false,
        code: "not_found",
        message: `column "${this.columnId}"`,
      };
    }
    const prev = { ...cols[idx]! };
    const prevPatch: Partial<ColumnDef> = {};
    for (const k of Object.keys(this.patch) as Array<keyof ColumnDef>) {
      (prevPatch as Record<string, unknown>)[k] = prev[k];
    }
    const nextDef = { ...prev, ...this.patch };
    internal.setColumns(cols.map((c, i) => (i === idx ? nextDef : c)));
    return {
      ok: true,
      inverse: new UpdateColumnCommand(this.columnId, prevPatch, this.source),
      events: [
        {
          type: "column.updated",
          columnId: this.columnId,
          patch: { ...this.patch },
          prev,
          source: this.source,
        },
      ],
    };
  }
}
