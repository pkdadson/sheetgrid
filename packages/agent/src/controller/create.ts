import type {
  ColumnDef,
  ColumnId,
  FilterClause,
  GridStore,
  RowId,
  SortSpec,
} from "@sheetgrid/core";
import {
  CompoundCommand,
  SetCellCommand,
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
    } else if (storeSubUnsub) {
      storeSubUnsub();
      storeSubUnsub = null;
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
      const auth = authOrFail({ type: "grid.add_row", values, opts: ropts });
      if (!auth.ok) return auth as OpResult<{ rowId: RowId }>;
      return unsupported("addRow") as OpResult<{ rowId: RowId }>;
    },
    updateRow(rowId, patch) {
      const auth = authOrFail({ type: "grid.update_row", rowId, patch });
      if (!auth.ok) return auth;
      return unsupported("updateRow");
    },
    deleteRow(rowId) {
      const auth = authOrFail({ type: "grid.delete_row", rowId });
      if (!auth.ok) return auth;
      return unsupported("deleteRow");
    },
    moveRow(rowId, toIndex) {
      const auth = authOrFail({ type: "grid.move_row", rowId, toIndex });
      if (!auth.ok) return auth;
      return unsupported("moveRow");
    },
    addColumn(def, copts) {
      const auth = authOrFail({ type: "grid.add_column", def, opts: copts });
      if (!auth.ok) return auth;
      return unsupported("addColumn");
    },
    deleteColumn(columnId) {
      const auth = authOrFail({ type: "grid.delete_column", columnId });
      if (!auth.ok) return auth;
      return unsupported("deleteColumn");
    },
    moveColumn(columnId, toIndex) {
      const auth = authOrFail({ type: "grid.move_column", columnId, toIndex });
      if (!auth.ok) return auth;
      return unsupported("moveColumn");
    },
    updateColumn(columnId, patch) {
      const auth = authOrFail({ type: "grid.update_column", columnId, patch });
      if (!auth.ok) return auth;
      return unsupported("updateColumn");
    },
    setSort(specs) {
      const auth = authOrFail({ type: "grid.set_sort", specs });
      if (!auth.ok) return auth;
      return unsupported("setSort");
    },
    clearSort() {
      const auth = authOrFail({ type: "grid.clear_sort" });
      if (!auth.ok) return auth;
      return unsupported("clearSort");
    },
    setFilter(filter) {
      const auth = authOrFail({ type: "grid.set_filter", filter });
      if (!auth.ok) return auth;
      return unsupported("setFilter");
    },
    select(target) {
      const auth = authOrFail({ type: "grid.select", target });
      if (!auth.ok) return auth;
      if ("range" in target) selection.selectRange(target.range.start, target.range.end);
      else selection.selectCell(target.rowId, target.columnId);
      return ok(undefined);
    },
    setFormula(rowId, columnId, source) {
      const auth = authOrFail({ type: "grid.set_formula", rowId, columnId, source });
      if (!auth.ok) return auth;
      return unsupported("setFormula");
    },
    clearFormula(rowId, columnId) {
      const auth = authOrFail({ type: "grid.clear_formula", rowId, columnId });
      if (!auth.ok) return auth;
      return unsupported("clearFormula");
    },

    // ── Transactions (M5) ──
    async batch<T>(_fn: (tx: GridController) => T | Promise<T>) {
      return Promise.resolve(unsupported("batch") as OpResult<T>);
    },

    // ── History (M5) ──
    undo() {
      const auth = authOrFail({ type: "grid.undo" });
      if (!auth.ok) return auth as OpResult<{ op: AgentOp }>;
      return unsupported("undo") as OpResult<{ op: AgentOp }>;
    },
    redo() {
      const auth = authOrFail({ type: "grid.redo" });
      if (!auth.ok) return auth as OpResult<{ op: AgentOp }>;
      return unsupported("redo") as OpResult<{ op: AgentOp }>;
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
    restore(_snap) {
      const auth = authOrFail({ type: "grid.restore", snapshot: _snap });
      if (!auth.ok) return auth;
      return unsupported("restore");
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
