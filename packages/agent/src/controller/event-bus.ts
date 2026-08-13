import type { GridEvent } from "../types/grid-event.js";

type Handler = (event: GridEvent) => void;

export interface EventBus {
  on<T extends GridEvent["type"]>(
    type: T | "*",
    handler: (event: Extract<GridEvent, { type: T }> | GridEvent) => void,
  ): () => void;
  emit(event: GridEvent): void;
  /** Called by controller writes to check nothing is currently emitting. */
  checkReentrancy(): void;
}

export interface EventBusOptions {
  onReentrantMutation?: () => void;
}

/** Sentinel so re-entrancy errors bypass the safe-catch in emit. */
class ReentrantError extends Error {
  override readonly name = "ReentrantError";
}

function callSafely(h: Handler, event: GridEvent, label: string): void {
  try {
    h(event);
  } catch (err) {
    if (err instanceof ReentrantError) throw err;
    console.error(`GridController: ${label} threw`, err);
  }
}

export function createEventBus(opts: EventBusOptions = {}): EventBus {
  const byType = new Map<string, Set<Handler>>();
  const wildcards = new Set<Handler>();
  let emitting = false;

  return {
    on(type, handler) {
      const set = type === "*" ? wildcards : (byType.get(type) ?? new Set());
      if (type !== "*" && !byType.has(type)) byType.set(type, set);
      set.add(handler as Handler);
      return () => {
        set.delete(handler as Handler);
      };
    },
    emit(event) {
      emitting = true;
      try {
        const forType = byType.get(event.type);
        if (forType) {
          for (const h of forType) {
            callSafely(h, event, `event handler for "${event.type}"`);
          }
        }
        for (const h of wildcards) {
          callSafely(h, event, `wildcard event handler for "${event.type}"`);
        }
      } finally {
        emitting = false;
      }
    },
    checkReentrancy() {
      if (emitting) {
        if (opts.onReentrantMutation) {
          // Wrap the user callback's throw in a ReentrantError so emit propagates it.
          try {
            opts.onReentrantMutation();
          } catch (err) {
            throw new ReentrantError(
              err instanceof Error ? err.message : String(err),
            );
          }
        } else {
          throw new ReentrantError(
            "GridController: re-entrant mutation forbidden",
          );
        }
      }
    },
  };
}
