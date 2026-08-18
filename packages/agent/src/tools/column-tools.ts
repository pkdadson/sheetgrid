import type { GridController } from "../types/controller.js";
import type { OpResult } from "../types/op-result.js";
import type { ToolDescriptor } from "./index.js";

export function buildColumnTools(c: GridController): ToolDescriptor[] {
  return [
    {
      name: "grid_add_column",
      description:
        "Add a new column. def contains id, header, and optional type/agentWritable/description.",
      input_schema: {
        type: "object",
        required: ["def"],
        properties: {
          def: {
            type: "object",
            required: ["id", "header"],
            properties: {
              id: { type: "string" },
              header: { type: "string" },
              type: { type: "string" },
              agentWritable: { type: "boolean" },
              description: { type: "string" },
            },
          },
          opts: {
            type: "object",
            properties: {
              at: {
                oneOf: [{ type: "integer", minimum: 0 }, { const: "end" }],
              },
            },
          },
        },
        additionalProperties: false,
      },
      async execute(input) {
        const { def, opts } = input as { def: any; opts?: any };
        return c.addColumn(def, opts) as OpResult<unknown>;
      },
    },
    {
      name: "grid_update_column",
      description:
        "Patch a column def (header, type, etc.). column id cannot be changed.",
      input_schema: {
        type: "object",
        required: ["columnId", "patch"],
        properties: {
          columnId: { type: "string" },
          patch: { type: "object", additionalProperties: true },
        },
        additionalProperties: false,
      },
      async execute(input) {
        const { columnId, patch } = input as { columnId: string; patch: any };
        return c.updateColumn(columnId, patch) as OpResult<unknown>;
      },
    },
    {
      name: "grid_delete_column",
      description:
        "Delete a column and its column-order entry. Row values for the deleted column are preserved and restored on undo.",
      input_schema: {
        type: "object",
        required: ["columnId"],
        properties: { columnId: { type: "string" } },
        additionalProperties: false,
      },
      async execute(input) {
        return c.deleteColumn(
          (input as { columnId: string }).columnId,
        ) as OpResult<unknown>;
      },
    },
    {
      name: "grid_move_column",
      description: "Move a column to a new 0-based index in columnOrder.",
      input_schema: {
        type: "object",
        required: ["columnId", "toIndex"],
        properties: {
          columnId: { type: "string" },
          toIndex: { type: "integer", minimum: 0 },
        },
        additionalProperties: false,
      },
      async execute(input) {
        const { columnId, toIndex } = input as {
          columnId: string;
          toIndex: number;
        };
        return c.moveColumn(columnId, toIndex) as OpResult<unknown>;
      },
    },
  ];
}
