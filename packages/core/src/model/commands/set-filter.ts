import type { FilterClause } from "../../types.js";
import type {
  Command,
  CommandResult,
  EventSource,
  InternalStore,
} from "./types.js";

function collectColumnIds(clause: FilterClause, out: Set<string>): void {
  if ("and" in clause) {
    for (const c of clause.and) collectColumnIds(c, out);
    return;
  }
  if ("or" in clause) {
    for (const c of clause.or) collectColumnIds(c, out);
    return;
  }
  if ("not" in clause) {
    collectColumnIds(clause.not, out);
    return;
  }
  out.add(clause.column);
}

export class SetFilterCommand implements Command {
  readonly kind = "filter.set";
  constructor(
    public readonly filter: FilterClause | null,
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    if (this.filter !== null) {
      const referenced = new Set<string>();
      collectColumnIds(this.filter, referenced);
      const known = new Set(internal.getColumnsRef().map((c) => c.id));
      for (const c of referenced) {
        if (!known.has(c)) {
          return {
            ok: false,
            code: "invalid_argument",
            message: `filter references unknown column "${c}"`,
          };
        }
      }
    }
    const prev = internal.getFilterRef();
    internal.setFilter(this.filter);
    return {
      ok: true,
      inverse: new SetFilterCommand(prev, this.source),
      events: [
        {
          type: "filter.changed",
          prev,
          next: this.filter,
          source: this.source,
        },
      ],
    };
  }
}
