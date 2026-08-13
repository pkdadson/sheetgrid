import type { GridController } from "../types/controller.js";
import { ok, type OpResult } from "../types/op-result.js";
import type { ToolDescriptor } from "./index.js";

export function buildHistoryTools(c: GridController): ToolDescriptor[] {
  return [
    {
      name: "grid_undo",
      description: "Reverse the last mutation. Returns not_found if the undo stack is empty.",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
      async execute() {
        return c.undo() as OpResult<unknown>;
      },
    },
    {
      name: "grid_redo",
      description: "Re-apply the most recently undone mutation.",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
      async execute() {
        return c.redo() as OpResult<unknown>;
      },
    },
    {
      name: "grid_snapshot",
      description:
        "Take an opaque snapshot of current state. Pair with grid_restore to revert. Snapshots do NOT persist undo/redo history.",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
      async execute() {
        return ok(c.snapshot()) as OpResult<unknown>;
      },
    },
    {
      name: "grid_restore",
      description: "Restore grid state from a snapshot taken via grid_snapshot. The restore is itself undoable.",
      input_schema: {
        type: "object",
        required: ["snapshot"],
        properties: { snapshot: {} },
        additionalProperties: false,
      },
      async execute(input) {
        return c.restore((input as { snapshot: any }).snapshot) as OpResult<unknown>;
      },
    },
  ];
}
