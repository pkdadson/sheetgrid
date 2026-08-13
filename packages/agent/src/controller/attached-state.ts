import type { GridStore } from "@sheetgrid/core";
import type { AgentOp } from "../types/agent-op.js";

export interface AttachedState {
  isAttached(): boolean;
  getStore(): GridStore | null;
  attach(store: GridStore): void;
  detach(): void;
  enqueue(op: AgentOp): void;
  drain(): AgentOp[];
  onChange(listener: (kind: "attached" | "detached") => void): () => void;
}

const QUEUE_LIMIT = 100;

export function createAttachedState(): AttachedState {
  let store: GridStore | null = null;
  let storeUnsub: (() => void) | null = null;
  const queue: AgentOp[] = [];
  const changeListeners = new Set<(k: "attached" | "detached") => void>();

  const emit = (k: "attached" | "detached") => {
    for (const l of changeListeners) l(k);
  };

  return {
    isAttached: () => store !== null,
    getStore: () => store,
    attach(next) {
      if (store !== null) {
        throw new Error(
          "GridController is already attached to a store — detach first before attaching another",
        );
      }
      store = next;
      // Keep a subscribe hook so bindings can rely on our own subscribe() to fire.
      storeUnsub = next.subscribe(() => {
        /* forwarded via event-bus in create.ts */
      });
      emit("attached");
    },
    detach() {
      if (storeUnsub) storeUnsub();
      storeUnsub = null;
      const wasAttached = store !== null;
      store = null;
      if (wasAttached) emit("detached");
    },
    enqueue(op) {
      queue.push(op);
      if (queue.length > QUEUE_LIMIT) queue.shift();
    },
    drain() {
      const out = queue.slice();
      queue.length = 0;
      return out;
    },
    onChange(listener) {
      changeListeners.add(listener);
      return () => changeListeners.delete(listener);
    },
  };
}
