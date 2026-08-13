import { describe, expect, it, vi } from "vitest";
import { createEventBus } from "./event-bus.js";
import type { GridEvent } from "../types/grid-event.js";

const src = { kind: "system", reason: "init" } as const;

describe("EventBus", () => {
  it("dispatches typed events to typed listeners", () => {
    const bus = createEventBus();
    const cellHandler = vi.fn();
    const rowHandler = vi.fn();
    bus.on("cell.changed", cellHandler);
    bus.on("row.added", rowHandler);
    bus.emit({
      type: "cell.changed",
      rowId: "r1",
      columnId: "n",
      prev: 1,
      next: 2,
      source: src,
    } as GridEvent);
    expect(cellHandler).toHaveBeenCalledTimes(1);
    expect(rowHandler).not.toHaveBeenCalled();
  });

  it("supports wildcard subscription", () => {
    const bus = createEventBus();
    const seen: string[] = [];
    bus.on("*", (e) => seen.push(e.type));
    bus.emit({ type: "transaction.started" });
    bus.emit({ type: "controller.attached" });
    expect(seen).toEqual(["transaction.started", "controller.attached"]);
  });

  it("catches handler errors without breaking other handlers", () => {
    const bus = createEventBus();
    const good = vi.fn();
    bus.on("cell.changed", () => { throw new Error("boom"); });
    bus.on("cell.changed", good);
    // Swallow console noise
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    bus.emit({
      type: "cell.changed",
      rowId: "r1",
      columnId: "n",
      prev: 0,
      next: 1,
      source: src,
    } as GridEvent);
    expect(good).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("throws when handler tries to mutate synchronously (re-entrant guard)", () => {
    const bus = createEventBus({
      onReentrantMutation: () => {
        throw new Error("re-entrant mutation forbidden");
      },
    });
    bus.on("cell.changed", () => bus.checkReentrancy());
    expect(() =>
      bus.emit({
        type: "cell.changed",
        rowId: "r1",
        columnId: "n",
        prev: 0,
        next: 1,
        source: src,
      } as GridEvent),
    ).toThrow(/re-entrant mutation forbidden/);
  });

  it("unsubscribe removes the handler", () => {
    const bus = createEventBus();
    const h = vi.fn();
    const off = bus.on("cell.changed", h);
    off();
    bus.emit({
      type: "cell.changed",
      rowId: "r1",
      columnId: "n",
      prev: 0,
      next: 1,
      source: src,
    } as GridEvent);
    expect(h).not.toHaveBeenCalled();
  });
});
