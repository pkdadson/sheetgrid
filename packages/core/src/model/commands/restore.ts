import type { FullInternalStore } from "../internal-store.js";
import { applySnapshot, takeSnapshot } from "../snapshot.js";
import type { Command, CommandResult, EventSource, InternalStore, Snapshot } from "./types.js";

export class RestoreCommand implements Command {
  readonly kind = "restore";
  constructor(
    public readonly target: Snapshot,
    public readonly source: EventSource,
  ) {}

  apply(internal: InternalStore): CommandResult {
    const full = internal as FullInternalStore; // dispatch always passes FullInternalStore
    const prev = takeSnapshot(full);
    applySnapshot(full, this.target);
    return {
      ok: true,
      inverse: new RestoreCommand(prev, this.source),
      events: [], // consumers derive events from the store subscription after restore
    };
  }
}
