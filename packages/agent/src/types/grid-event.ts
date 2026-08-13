import type {
  GridEvent as CoreGridEvent,
  EventSource,
  SelectionState,
} from "@sheetgrid/core";
import type { AgentOp } from "./agent-op.js";

export type { EventSource } from "@sheetgrid/core";

/** Selection change (composed by the controller, not the core store). */
export interface SelectionChangedEvent {
  type: "selection.changed";
  prev: SelectionState | null;
  next: SelectionState;
  source: EventSource;
}

/** Emitted around agent/controller batch() calls. */
export type TransactionEvent =
  | { type: "transaction.started" }
  | { type: "transaction.committed"; ops: AgentOp[] }
  | { type: "transaction.rolledback"; reason: string };

/** Emitted when the controller detaches from its mounted store. */
export type LifecycleEvent =
  | { type: "controller.attached" }
  | { type: "controller.detached" };

/** History events, forwarded from the core History. */
export type HistoryEvent =
  | { type: "history.pushed"; op: AgentOp }
  | { type: "history.undone"; op: AgentOp }
  | { type: "history.redone"; op: AgentOp };

/** The unified event stream exposed by GridController.on. */
export type GridEvent =
  | CoreGridEvent
  | SelectionChangedEvent
  | TransactionEvent
  | LifecycleEvent
  | HistoryEvent;
