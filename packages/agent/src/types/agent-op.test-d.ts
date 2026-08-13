import { expectTypeOf, test } from "vitest";
import type { AgentOp } from "./agent-op.js";

test("AgentOp covers all mutation ops with typed payloads", () => {
  const setCell: AgentOp = {
    type: "grid.set_cell",
    rowId: "r1",
    columnId: "n",
    value: 42,
  };
  expectTypeOf(setCell).toMatchTypeOf<AgentOp>();

  const addRow: AgentOp = {
    type: "grid.add_row",
    values: { name: "Ada" },
    opts: { at: "end" },
  };
  expectTypeOf(addRow).toMatchTypeOf<AgentOp>();

  const setFilter: AgentOp = {
    type: "grid.set_filter",
    filter: { column: "status", op: "eq", value: "open" },
  };
  expectTypeOf(setFilter).toMatchTypeOf<AgentOp>();

  const undo: AgentOp = { type: "grid.undo" };
  expectTypeOf(undo).toMatchTypeOf<AgentOp>();
});
