import { expectTypeOf, test } from "vitest";
import type { EventSource, GridEvent } from "./grid-event.js";

test("GridEvent covers all core events + transaction wrappers + selection", () => {
  const cell: GridEvent = {
    type: "cell.changed",
    rowId: "r1",
    columnId: "n",
    prev: 1,
    next: 2,
    source: { kind: "agent", toolName: "grid_set_cell" },
  };
  expectTypeOf(cell).toMatchTypeOf<GridEvent>();

  const tx: GridEvent = { type: "transaction.started" };
  expectTypeOf(tx).toMatchTypeOf<GridEvent>();

  const commit: GridEvent = { type: "transaction.committed", ops: [] };
  expectTypeOf(commit).toMatchTypeOf<GridEvent>();

  const rb: GridEvent = {
    type: "transaction.rolledback",
    reason: "auth denied",
  };
  expectTypeOf(rb).toMatchTypeOf<GridEvent>();

  const detached: GridEvent = { type: "controller.detached" };
  expectTypeOf(detached).toMatchTypeOf<GridEvent>();

  const selChanged: GridEvent = {
    type: "selection.changed",
    prev: null,
    next: { active: null, ranges: [], rowIds: [], columnIds: [] },
    source: { kind: "user", interaction: "ui" },
  };
  expectTypeOf(selChanged).toMatchTypeOf<GridEvent>();
});

test("EventSource is re-exported from core", () => {
  const s: EventSource = { kind: "agent", toolName: "x", correlationId: "c1" };
  expectTypeOf(s).toMatchTypeOf<EventSource>();
});
