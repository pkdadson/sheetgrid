import type { SortSpec } from "../../types.js";
import type {
  Command,
  CommandResult,
  EventSource,
  InternalStore,
} from "./types.js";

export class SetSortCommand implements Command {
  readonly kind = "sort.set";
  constructor(
    public readonly specs: SortSpec[],
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const cols = internal.getColumnsRef();
    const known = new Set(cols.map((c) => c.id));
    for (const s of this.specs) {
      if (!known.has(s.columnId)) {
        return {
          ok: false,
          code: "invalid_argument",
          message: `unknown column "${s.columnId}" in sort spec`,
        };
      }
    }
    const prev = [...internal.getSortRef()];
    internal.setSort(this.specs.map((s) => ({ ...s })));
    return {
      ok: true,
      inverse: new SetSortCommand(prev, this.source),
      events: [
        {
          type: "sort.changed",
          prev,
          next: this.specs.map((s) => ({ ...s })),
          source: this.source,
        },
      ],
    };
  }
}
