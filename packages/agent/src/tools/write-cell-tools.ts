import type { GridController } from "../types/controller.js";
import type { OpResult } from "../types/op-result.js";
import type { ToolDescriptor } from "./index.js";

function columnListSummary(c: GridController): string {
  const cols = c.getSchema().columns.filter((c) => c.agentWritable);
  return cols
    .map(
      (c) =>
        `${c.id} (${c.type ?? "any"}${c.description ? `: ${c.description}` : ""})`,
    )
    .join(", ");
}

export function buildWriteCellTools(c: GridController): ToolDescriptor[] {
  return [
    {
      name: "grid_set_cell",
      description: `Write a single cell. Writable columns: ${columnListSummary(c)}. Reads return validation errors as { ok: false, code: 'validation_failed' }; correct the value and retry.`,
      input_schema: {
        type: "object",
        required: ["rowId", "columnId", "value"],
        properties: {
          rowId: { type: "string" },
          columnId: { type: "string" },
          value: {},
        },
        additionalProperties: false,
      },
      async execute(input) {
        const { rowId, columnId, value } = input as {
          rowId: string;
          columnId: string;
          value: unknown;
        };
        return c.setCell(rowId, columnId, value) as OpResult<unknown>;
      },
    },
    {
      name: "grid_set_cells",
      description: `Batch write multiple cells. Partial success is reported per-patch. Writable columns: ${columnListSummary(c)}.`,
      input_schema: {
        type: "object",
        required: ["patches"],
        properties: {
          patches: {
            type: "array",
            items: {
              type: "object",
              required: ["rowId", "columnId", "value"],
              properties: {
                rowId: { type: "string" },
                columnId: { type: "string" },
                value: {},
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
      async execute(input) {
        const { patches } = input as {
          patches: Array<{ rowId: string; columnId: string; value: unknown }>;
        };
        return c.setCells(patches) as OpResult<unknown>;
      },
    },
  ];
}
