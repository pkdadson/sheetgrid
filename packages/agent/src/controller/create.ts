import type {
  ColumnDef,
  ColumnId,
  FilterClause,
  GridStore,
  RowId,
  SortSpec,
} from "@sheetgrid/core";
import {
  AddColumnCommand,
  AddRowCommand,
  ClearFormulaCommand,
  CompoundCommand,
  DeleteColumnCommand,
  DeleteRowCommand,
  MoveColumnCommand,
  MoveRowCommand,
  RestoreCommand,
  SetCellCommand,
  SetFilterCommand,
  SetFormulaCommand,
  SetSortCommand,
  UpdateColumnCommand,
  UpdateRowCommand,
} from "@sheetgrid/core/commands";
import { fail, ok, type OpResult } from "../types/op-result.js";
import type {
  GridController,
  GridSchema,
  Unsubscribe,
} from "../types/controller.js";
import type { AgentOp } from "../types/agent-op.js";
import type { AuthorizeFn } from "../types/authorize.js";
import type { GridEvent } from "../types/grid-event.js";
import type { Snapshot } from "../types/snapshot.js";
import type { WhereClause } from "../types/where-clause.js";
import { createAttachedState } from "./attached-state.js";
import { replayOp } from "./queue-drain.js";
import { runAuthCheck } from "./authorize-check.js";
import { createEventBus } from "./event-bus.js";
import { createSelectionState } from "./selection-state.js";
import { buildSchema } from "./schema.js";
import { doGetData, doGetCell, doQueryRows, doDescribe } from "./reads.js";
import { createDispatcher } from "./dispatch.js";
import { agentSource } from "./write-source.js";

export interface CreateGridControllerOptions {
  readOnly?: boolean;
  authorize?: AuthorizeFn;
  /**
   * Explicit hint for grid mode. If omitted, defaults to "objects".
   */
  mode?: "objects" | "matrix";
}

export function createGridController(
  opts: CreateGridControllerOptions = {},
): GridController {
  const attached = createAttachedState();
  const bus = createEventBus();
  const selection = createSelectionState();
  const subscribers = new Set<() => void>();

  const notify = () => {
    for (const s of subscribers) s();
  };

  // Lifecycle events → event bus.
  attached.onChange((kind) => {
    if (kind === "attached") bus.emit({ type: "controller.attached" });
    else bus.emit({ type: "controller.detached" });
    notify();
  });

  // Selection listener → event bus + subscribers.
  selection.subscribe((prev, next) => {
    bus.emit({
      type: "selection.changed",
      prev,
      next,
      source: { kind: "agent", toolName: "grid_select" },
    });
    notify();
  });

  // Forward store events by subscribing after every attach.
  let storeSubUnsub: (() => void) | null = null;
  attached.onChange((kind) => {
    if (kind === "attached") {
      const store = attached.getStore();
      if (!store) return;
      storeSubUnsub = store.subscribe(() => {
        // Store subscription doesn't include event payloads. We emit a coarse
        // cell.changed event so controller listeners see store mutations.
        // Note: getLastReason() may reflect the previous commit at this point
        // because dispatchAndTrack sets lastReason after history.dispatch
        // (which already called notify). We emit unconditionally so the event
        // always fires, using the prior reason as a best-effort source hint.
        const reason = store.getLastReason();
        bus.emit({
          type: "cell.changed",
          rowId: "",
          columnId: "",
          prev: null,
          next: null,
          source: reasonToSource(reason ?? "api"),
        } as GridEvent);
        notify();
      });
      // Drain any ops enqueued while detached.
      const pending = attached.drain();
      for (const op of pending) replayOp(controller, op);
    } else if (storeSubUnsub) {
      storeSubUnsub();
      storeSubUnsub = null;
    }
  });

  // Forward core-history events onto the controller bus.
  let historyUnsub: (() => void) | null = null;
  attached.onChange((kind) => {
    if (kind === "attached") {
      const s = attached.getStore();
      if (!s) return;
      historyUnsub = s.__history.on((e) => {
        // Translate core kind into an AgentOp for the event payload.
        // Minimal shape — richer op reconstruction not needed here.
        const op = { type: `grid.${e.kind.replace(/\./g, "_")}` } as AgentOp;
        if (e.type === "history.pushed") bus.emit({ type: "history.pushed", op });
        else if (e.type === "history.undone") bus.emit({ type: "history.undone", op });
        else if (e.type === "history.redone") bus.emit({ type: "history.redone", op });
      });
    } else if (historyUnsub) {
      historyUnsub();
      historyUnsub = null;
    }
  });

  const requireStore = (): GridStore | null => attached.getStore();

  const authOrFail = (op: AgentOp): OpResult => {
    const s = requireStore();
    if (!s) return fail("detached", "GridController is not attached to a grid");
    const cols = s.getColumns();
    return runAuthCheck(op, cols, opts);
  };

  const unsupported = (label: string): OpResult => {
    return fail("unsupported", `${label} is not implemented until M5`);
  };

  const dispatch = createDispatcher({
    getStore: requireStore,
    bus,
    notify,
    auth: (op) => {
      const s = requireStore();
      if (!s) return fail("detached", "detached");
      return runAuthCheck(op, s.getColumns(), opts);
    },
  });

  const controller: GridController = {
    // ── Reads ──
    getSchema(): GridSchema {
      const s = requireStore();
      if (!s) {
        return {
          columns: [],
          rowIdField: "id",
          rowCount: 0,
          mode: opts.mode ?? "objects",
          sort: [],
          filter: null,
        };
      }
      return buildSchema(s, opts.mode ?? "objects");
    },
    getData(dopts) {
      const s = requireStore();
      if (!s) return { rows: [], total: 0 };
      return doGetData(s, opts.mode ?? "objects", dopts ?? {});
    },
    getCell(rowId, columnId) {
      const s = requireStore();
      if (!s) return fail("detached", "GridController is not attached to a grid");
      return doGetCell(s, rowId, columnId);
    },
    queryRows(where) {
      const s = requireStore();
      if (!s) return fail("detached", "GridController is not attached to a grid");
      return doQueryRows(s, where);
    },
    getSelection() {
      return selection.get();
    },
    describe() {
      const s = requireStore();
      if (!s) return "SheetGrid: detached.";
      return doDescribe(s, opts.mode ?? "objects");
    },

    // ── Writes (M5) ──
    setCell(rowId, columnId, value) {
      const op: AgentOp = { type: "grid.set_cell", rowId, columnId, value };
      const s = requireStore();
      if (!s) return fail("detached", "detached");
      const col = s.getColumns().find((c) => c.id === columnId);
      if (col?.validate) {
        const rows = s.getRows();
        const row = rows.find((r) => r.id === rowId) ?? { id: rowId, values: {} };
        const r = col.validate(value, { rowId, columnId, row, rows });
        if (r instanceof Promise) {
          return fail(
            "invalid_argument",
            `column "${columnId}" has an async validator; run validation upstream before controller.setCell`,
          );
        }
        if (!r.ok) return fail("validation_failed", r.message, { code: r.code });
      }
      return dispatch(op, new SetCellCommand(rowId, columnId, value, agentSource(op)));
    },
    setCells(patches) {
      const op: AgentOp = { type: "grid.set_cells", patches };
      const auth = authOrFail(op);
      if (!auth.ok) return auth as OpResult<{ applied: number; rejected: Array<{ rowId: RowId; columnId: ColumnId; code: string; message: string }> }>;
      const s = requireStore();
      if (!s) return fail("detached", "detached") as OpResult<{ applied: number; rejected: Array<{ rowId: RowId; columnId: ColumnId; code: string; message: string }> }>;
      const rejected: Array<{ rowId: RowId; columnId: ColumnId; code: string; message: string }> = [];
      const commands: SetCellCommand[] = [];
      let applied = 0;
      for (const p of patches) {
        const col = s.getColumns().find((c) => c.id === p.columnId);
        if (!col) {
          rejected.push({ rowId: p.rowId, columnId: p.columnId, code: "not_found", message: `column "${p.columnId}"` });
          continue;
        }
        const row = s.getRows().find((r) => r.id === p.rowId);
        if (!row) {
          rejected.push({ rowId: p.rowId, columnId: p.columnId, code: "not_found", message: `row "${p.rowId}"` });
          continue;
        }
        if (col.validate) {
          const r = col.validate(p.value, { rowId: p.rowId, columnId: p.columnId, row, rows: s.getRows() });
          if (r instanceof Promise) {
            rejected.push({ rowId: p.rowId, columnId: p.columnId, code: "invalid_argument", message: "async validators not supported on controller writes" });
            continue;
          }
          if (!r.ok) {
            rejected.push({ rowId: p.rowId, columnId: p.columnId, code: "validation_failed", message: r.message });
            continue;
          }
        }
        commands.push(new SetCellCommand(p.rowId, p.columnId, p.value, agentSource(op)));
        applied++;
      }
      if (commands.length > 0) {
        const compound = new CompoundCommand(commands, agentSource(op));
        const dres = dispatch(op, compound);
        if (!dres.ok) return dres as OpResult<{ applied: number; rejected: Array<{ rowId: RowId; columnId: ColumnId; code: string; message: string }> }>;
      }
      return { ok: true, value: { applied, rejected } };
    },
    addRow(values, ropts) {
      const op: AgentOp = { type: "grid.add_row", values, opts: ropts };
      const id = ropts?.id ?? `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const cmd = new AddRowCommand(values, { ...ropts, id }, agentSource(op));
      const res = dispatch(op, cmd);
      if (!res.ok) return res as OpResult<{ rowId: RowId }>;
      return { ok: true, value: { rowId: id } };
    },
    updateRow(rowId, patch) {
      const op: AgentOp = { type: "grid.update_row", rowId, patch };
      return dispatch(op, new UpdateRowCommand(rowId, patch, agentSource(op)));
    },
    deleteRow(rowId) {
      const op: AgentOp = { type: "grid.delete_row", rowId };
      return dispatch(op, new DeleteRowCommand(rowId, agentSource(op)));
    },
    moveRow(rowId, toIndex) {
      const op: AgentOp = { type: "grid.move_row", rowId, toIndex };
      return dispatch(op, new MoveRowCommand(rowId, toIndex, agentSource(op)));
    },
    addColumn(def, copts) {
      const op: AgentOp = { type: "grid.add_column", def, opts: copts };
      return dispatch(op, new AddColumnCommand(def, copts ?? {}, agentSource(op)));
    },
    deleteColumn(columnId) {
      const op: AgentOp = { type: "grid.delete_column", columnId };
      return dispatch(op, new DeleteColumnCommand(columnId, agentSource(op)));
    },
    moveColumn(columnId, toIndex) {
      const op: AgentOp = { type: "grid.move_column", columnId, toIndex };
      return dispatch(op, new MoveColumnCommand(columnId, toIndex, agentSource(op)));
    },
    updateColumn(columnId, patch) {
      const op: AgentOp = { type: "grid.update_column", columnId, patch };
      return dispatch(op, new UpdateColumnCommand(columnId, patch, agentSource(op)));
    },
    setSort(specs) {
      const op: AgentOp = { type: "grid.set_sort", specs };
      return dispatch(op, new SetSortCommand(specs, agentSource(op)));
    },
    clearSort() {
      const op: AgentOp = { type: "grid.clear_sort" };
      return dispatch(op, new SetSortCommand([], agentSource(op)));
    },
    setFilter(filter) {
      const op: AgentOp = { type: "grid.set_filter", filter };
      return dispatch(op, new SetFilterCommand(filter, agentSource(op)));
    },
    select(target) {
      const auth = authOrFail({ type: "grid.select", target });
      if (!auth.ok) return auth;
      if ("range" in target) selection.selectRange(target.range.start, target.range.end);
      else selection.selectCell(target.rowId, target.columnId);
      return ok(undefined);
    },
    setFormula(rowId, columnId, source) {
      const op: AgentOp = { type: "grid.set_formula", rowId, columnId, source };
      return dispatch(op, new SetFormulaCommand(rowId, columnId, source, agentSource(op)));
    },
    clearFormula(rowId, columnId) {
      const op: AgentOp = { type: "grid.clear_formula", rowId, columnId };
      return dispatch(op, new ClearFormulaCommand(rowId, columnId, agentSource(op)));
    },

    // ── Transactions (M5) ──
    async batch<T>(fn: (tx: GridController) => T | Promise<T>): Promise<OpResult<T>> {
      const authRes = authOrFail({ type: "grid.batch", ops: [] });
      if (!authRes.ok) return authRes as OpResult<T>;
      const s = requireStore();
      if (!s) return fail("detached", "detached") as OpResult<T>;
      bus.emit({ type: "transaction.started" });
      const snap = s.__takeSnapshot();
      s.__history.beginTransaction();
      try {
        const value = await fn(controller);
        s.__history.commitTransaction(
          (children) => new CompoundCommand(children, agentSource({ type: "grid.batch", ops: [] })),
        );
        bus.emit({ type: "transaction.committed", ops: [] });
        notify();
        return { ok: true, value };
      } catch (err) {
        // Roll back to snapshot for full atomicity.
        s.__history.rollbackTransaction();
        s.__restore(snap);
        // The __restore push adds a history entry — pop it so undo doesn't reveal a phantom "restore" step.
        s.__history.undo();
        s.__history.clear();
        bus.emit({
          type: "transaction.rolledback",
          reason: err instanceof Error ? err.message : String(err),
        });
        notify();
        return fail("internal", err instanceof Error ? err.message : String(err)) as OpResult<T>;
      }
    },

    // ── History (M5) ──
    undo() {
      const op: AgentOp = { type: "grid.undo" };
      const auth = authOrFail(op);
      if (!auth.ok) return auth as OpResult<{ op: AgentOp }>;
      bus.checkReentrancy();
      const s = requireStore();
      if (!s) return fail("detached", "detached") as OpResult<{ op: AgentOp }>;
      const res = s.__history.undo();
      if (res === null) return fail("not_found", "nothing to undo") as OpResult<{ op: AgentOp }>;
      if (!res.ok) return { ok: false, code: res.code as any, message: res.message } as OpResult<{ op: AgentOp }>;
      notify();
      return { ok: true, value: { op } };
    },
    redo() {
      const op: AgentOp = { type: "grid.redo" };
      const auth = authOrFail(op);
      if (!auth.ok) return auth as OpResult<{ op: AgentOp }>;
      bus.checkReentrancy();
      const s = requireStore();
      if (!s) return fail("detached", "detached") as OpResult<{ op: AgentOp }>;
      const res = s.__history.redo();
      if (res === null) return fail("not_found", "nothing to redo") as OpResult<{ op: AgentOp }>;
      if (!res.ok) return { ok: false, code: res.code as any, message: res.message } as OpResult<{ op: AgentOp }>;
      notify();
      return { ok: true, value: { op } };
    },
    canUndo() {
      const s = requireStore();
      return s ? s.__history.canUndo() : false;
    },
    canRedo() {
      const s = requireStore();
      return s ? s.__history.canRedo() : false;
    },
    snapshot(): Snapshot {
      const s = requireStore();
      if (!s) {
        return {
          v: 1,
          rows: [],
          columns: [],
          columnOrder: [],
          formulas: [],
          sort: [],
          filter: null,
        };
      }
      return s.__takeSnapshot();
    },
    restore(snap) {
      const op: AgentOp = { type: "grid.restore", snapshot: snap };
      return dispatch(op, new RestoreCommand(snap, agentSource(op)));
    },

    // ── Events ──
    on(type, handler) {
      return bus.on(type, handler as never) as Unsubscribe;
    },

    // ── Lifecycle ──
    __attach(store) {
      attached.attach(store as GridStore);
    },
    __detach() {
      attached.detach();
    },
    isAttached() {
      return attached.isAttached();
    },
    __enqueue(op: AgentOp) {
      attached.enqueue(op);
    },

    // ── Framework reactivity ──
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  };

  return controller;
}

function reasonToSource(reason: string) {
  if (reason === "edit") return { kind: "user", interaction: "edit" } as const;
  if (reason === "paste") return { kind: "user", interaction: "paste" } as const;
  if (reason === "cut") return { kind: "user", interaction: "edit" } as const;
  if (reason === "reorder") return { kind: "user", interaction: "ui" } as const;
  return { kind: "system", reason: "init" } as const;
}
