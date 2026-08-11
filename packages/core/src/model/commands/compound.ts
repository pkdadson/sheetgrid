import type { Command, CommandResult, EventSource, GridEvent, InternalStore } from "./types.js";

export class CompoundCommand implements Command {
  readonly kind = "compound";
  constructor(
    public readonly children: Command[],
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const applied: Command[] = []; // inverses in application order
    const events: GridEvent[] = [];
    for (const child of this.children) {
      const res = child.apply(internal);
      if (!res.ok) {
        // Rollback: apply inverses of already-applied children in reverse.
        for (let i = applied.length - 1; i >= 0; i--) {
          applied[i]!.apply(internal);
        }
        return res;
      }
      applied.push(res.inverse);
      events.push(...res.events);
    }
    // Inverse compound = reversed inverses.
    return {
      ok: true,
      inverse: new CompoundCommand([...applied].reverse(), this.source),
      events,
    };
  }
}
