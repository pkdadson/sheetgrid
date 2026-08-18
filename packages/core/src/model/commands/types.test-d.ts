import { expectTypeOf, test } from "vitest";
import type { Command, CommandResult, EventSource, Snapshot } from "./types.js";
import type { GridEvent } from "./types.js";

test("EventSource discriminated union", () => {
  const s: EventSource = { kind: "agent", toolName: "grid_set_cell" };
  expectTypeOf(s).toMatchTypeOf<EventSource>();
  const u: EventSource = { kind: "user", interaction: "edit" };
  expectTypeOf(u).toMatchTypeOf<EventSource>();
  const sys: EventSource = { kind: "system", reason: "restore" };
  expectTypeOf(sys).toMatchTypeOf<EventSource>();
});

test("Command.apply returns CommandResult with inverse Command", () => {
  type Apply = Command["apply"];
  expectTypeOf<ReturnType<Apply>>().toMatchTypeOf<CommandResult>();
  expectTypeOf<
    Extract<CommandResult, { ok: true }>["inverse"]
  >().toMatchTypeOf<Command>();
});

test("Snapshot is opaque JSON-serializable", () => {
  const snap: Snapshot = {
    v: 1,
    rows: [],
    columns: [],
    columnOrder: [],
    formulas: [],
  };
  expectTypeOf(snap).toMatchTypeOf<Snapshot>();
});
