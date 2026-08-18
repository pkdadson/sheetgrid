import type { GridController } from "../types/controller.js";
import type { OpResult } from "../types/op-result.js";
import type { ToolDescriptor } from "./index.js";

export function buildRowTools(c: GridController): ToolDescriptor[] {
  return [
    {
      name: "grid_add_row",
      description:
        "Add a new row. Values maps column id → value. opts.at is a 0-based index or 'end'. opts.id provides a stable row id (auto-generated if omitted).",
      input_schema: {
        type: "object",
        required: ["values"],
        properties: {
          values: { type: "object", additionalProperties: true },
          opts: {
            type: "object",
            properties: {
              at: {
                oneOf: [{ type: "integer", minimum: 0 }, { const: "end" }],
              },
              id: { type: "string" },
            },
          },
        },
        additionalProperties: false,
      },
      async execute(input) {
        const { values, opts } = input as {
          values: Record<string, unknown>;
          opts?: { at?: number | "end"; id?: string };
        };
        return c.addRow(values, opts) as OpResult<unknown>;
      },
    },
    {
      name: "grid_update_row",
      description:
        "Patch specific cells on a row. patch maps column id → new value. Missing columns are untouched.",
      input_schema: {
        type: "object",
        required: ["rowId", "patch"],
        properties: {
          rowId: { type: "string" },
          patch: { type: "object", additionalProperties: true },
        },
        additionalProperties: false,
      },
      async execute(input) {
        const { rowId, patch } = input as {
          rowId: string;
          patch: Record<string, unknown>;
        };
        return c.updateRow(rowId, patch) as OpResult<unknown>;
      },
    },
    {
      name: "grid_delete_row",
      description: "Delete a row. Undoable via grid_undo.",
      input_schema: {
        type: "object",
        required: ["rowId"],
        properties: { rowId: { type: "string" } },
        additionalProperties: false,
      },
      async execute(input) {
        return c.deleteRow(
          (input as { rowId: string }).rowId,
        ) as OpResult<unknown>;
      },
    },
    {
      name: "grid_move_row",
      description: "Move a row to a new 0-based index.",
      input_schema: {
        type: "object",
        required: ["rowId", "toIndex"],
        properties: {
          rowId: { type: "string" },
          toIndex: { type: "integer", minimum: 0 },
        },
        additionalProperties: false,
      },
      async execute(input) {
        const { rowId, toIndex } = input as { rowId: string; toIndex: number };
        return c.moveRow(rowId, toIndex) as OpResult<unknown>;
      },
    },
  ];
}
