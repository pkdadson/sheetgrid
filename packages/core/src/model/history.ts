import type { Command, CommandResult, InternalStore } from "./commands/types.js";

export type HistoryEvent =
  | { type: "history.pushed"; kind: string }
  | { type: "history.undone"; kind: string }
  | { type: "history.redone"; kind: string };

export type HistoryListener = (event: HistoryEvent) => void;

export interface HistoryOptions {
  /** Max entries on the undo stack. Hard ceiling of 1000. Default 100. */
  limit?: number;
}

export class History {
  private undoStack: Command[] = []; // inverses; top = most recent mutation
  private redoStack: Command[] = []; // forward commands that were undone
  private readonly limit: number;
  private transactionDepth = 0;
  private transactionInverses: Command[] = [];
  private listeners = new Set<HistoryListener>();

  constructor(
    private internal: InternalStore,
    opts: HistoryOptions = {},
  ) {
    const raw = opts.limit ?? 100;
    this.limit = Math.max(1, Math.min(1000, raw | 0));
  }

  on(listener: HistoryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(e: HistoryEvent) {
    for (const l of this.listeners) l(e);
  }

  dispatch(cmd: Command): CommandResult {
    const res = cmd.apply(this.internal);
    if (!res.ok) return res;
    if (cmd.history === "skip") {
      this.internal.notify();
      return res;
    }
    if (this.transactionDepth > 0) {
      this.transactionInverses.push(res.inverse);
    } else {
      this.undoStack.push(res.inverse);
      if (this.undoStack.length > this.limit) this.undoStack.shift();
      this.redoStack = [];
      this.emit({ type: "history.pushed", kind: cmd.kind });
    }
    this.internal.notify();
    return res;
  }

  undo(): CommandResult | null {
    if (this.transactionDepth > 0) {
      throw new Error("cannot undo inside a transaction");
    }
    const inverse = this.undoStack.pop();
    if (!inverse) return null;
    const res = inverse.apply(this.internal);
    if (!res.ok) return res;
    this.redoStack.push(res.inverse);
    this.emit({ type: "history.undone", kind: inverse.kind });
    this.internal.notify();
    return res;
  }

  redo(): CommandResult | null {
    if (this.transactionDepth > 0) {
      throw new Error("cannot redo inside a transaction");
    }
    const forward = this.redoStack.pop();
    if (!forward) return null;
    const res = forward.apply(this.internal);
    if (!res.ok) return res;
    this.undoStack.push(res.inverse);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.emit({ type: "history.redone", kind: forward.kind });
    this.internal.notify();
    return res;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  beginTransaction() {
    this.transactionDepth++;
    if (this.transactionDepth === 1) this.transactionInverses = [];
  }

  /** Commit collected inverses as a single CompoundCommand entry. */
  commitTransaction(compound: (children: Command[]) => Command): void {
    if (this.transactionDepth <= 0) {
      throw new Error("commitTransaction called without matching beginTransaction");
    }
    this.transactionDepth--;
    if (this.transactionDepth === 0 && this.transactionInverses.length > 0) {
      const composite = compound([...this.transactionInverses].reverse());
      this.undoStack.push(composite);
      if (this.undoStack.length > this.limit) this.undoStack.shift();
      this.redoStack = [];
      this.emit({ type: "history.pushed", kind: composite.kind });
      this.transactionInverses = [];
    }
  }

  rollbackTransaction(): void {
    for (let i = this.transactionInverses.length - 1; i >= 0; i--) {
      this.transactionInverses[i]!.apply(this.internal);
    }
    this.transactionInverses = [];
    this.transactionDepth = Math.max(0, this.transactionDepth - 1);
    this.internal.notify();
  }
}
