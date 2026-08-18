import { createGridStore } from "@sheetgrid/core";
import { SetCellCommand } from "@sheetgrid/core/commands";
import { describe, expect, it, vi } from "vitest";
import { createDispatcher } from "./dispatch.js";
import { createEventBus } from "./event-bus.js";
import { agentSource } from "./write-source.js";

function fx() {
  return createGridStore({
    rows: [{ id: "r1", values: { name: "Ada" } }],
    columns: [{ id: "name", header: "Name" }],
  });
}

describe("createDispatcher", () => {
  it("dispatches through core history and returns OpResult ok", () => {
    const store = fx();
    const bus = createEventBus();
    const notify = vi.fn();
    const dispatch = createDispatcher({
      getStore: () => store,
      bus,
      notify,
      auth: () => ({ ok: true, value: undefined }),
    });
    const source = agentSource({
      type: "grid.set_cell",
      rowId: "r1",
      columnId: "name",
      value: "Ada L",
    });
    const res = dispatch(
      { type: "grid.set_cell", rowId: "r1", columnId: "name", value: "Ada L" },
      new SetCellCommand("r1", "name", "Ada L", source),
    );
    expect(res.ok).toBe(true);
    expect(store.getCell("r1", "name")).toBe("Ada L");
    expect(notify).toHaveBeenCalled();
  });

  it("returns detached when getStore returns null", () => {
    const bus = createEventBus();
    const dispatch = createDispatcher({
      getStore: () => null,
      bus,
      notify: () => {},
      auth: () => ({ ok: true, value: undefined }),
    });
    const res = dispatch(
      { type: "grid.undo" },
      new SetCellCommand("r", "c", 1, { kind: "system", reason: "init" }),
    );
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error();
    expect(res.code).toBe("detached");
  });

  it("bubbles auth failure without dispatching", () => {
    const store = fx();
    const bus = createEventBus();
    const dispatch = createDispatcher({
      getStore: () => store,
      bus,
      notify: () => {},
      auth: () => ({ ok: false, code: "read_only", message: "nope" }),
    });
    const res = dispatch(
      { type: "grid.set_cell", rowId: "r1", columnId: "name", value: "x" },
      new SetCellCommand("r1", "name", "x", { kind: "system", reason: "init" }),
    );
    expect(res.ok).toBe(false);
    // Store unchanged.
    expect(store.getCell("r1", "name")).toBe("Ada");
  });

  it("emits GridEvents on the bus for successful writes", () => {
    const store = fx();
    const bus = createEventBus();
    const seen: string[] = [];
    bus.on("*", (e) => seen.push(e.type));
    const dispatch = createDispatcher({
      getStore: () => store,
      bus,
      notify: () => {},
      auth: () => ({ ok: true, value: undefined }),
    });
    dispatch(
      { type: "grid.set_cell", rowId: "r1", columnId: "name", value: "Ada L" },
      new SetCellCommand("r1", "name", "Ada L", {
        kind: "agent",
        toolName: "grid_set_cell",
      }),
    );
    expect(seen).toContain("cell.changed");
  });

  it("checks bus reentrancy — throws if dispatch called from inside a handler", () => {
    const store = fx();
    const bus = createEventBus();
    const dispatch = createDispatcher({
      getStore: () => store,
      bus,
      notify: () => {},
      auth: () => ({ ok: true, value: undefined }),
    });
    bus.on("cell.changed", () => {
      // Attempting to re-enter dispatch inside a handler should throw.
      expect(() =>
        dispatch(
          {
            type: "grid.set_cell",
            rowId: "r1",
            columnId: "name",
            value: "loop",
          },
          new SetCellCommand("r1", "name", "loop", {
            kind: "system",
            reason: "init",
          }),
        ),
      ).toThrow(/re-entrant/i);
    });
    dispatch(
      { type: "grid.set_cell", rowId: "r1", columnId: "name", value: "first" },
      new SetCellCommand("r1", "name", "first", {
        kind: "system",
        reason: "init",
      }),
    );
  });
});
