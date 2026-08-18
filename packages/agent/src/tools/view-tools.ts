import type { GridController } from "../types/controller.js";
import type { OpResult } from "../types/op-result.js";
import type { ToolDescriptor } from "./index.js";
import { filterClauseSchema, sortSpecSchema } from "./json-schema.js";

export function buildViewTools(c: GridController): ToolDescriptor[] {
  return [
    {
      name: "grid_set_sort",
      description: "Set the sort order. Empty specs array clears sort.",
      input_schema: {
        type: "object",
        required: ["specs"],
        properties: { specs: sortSpecSchema() },
        additionalProperties: false,
      },
      async execute(input) {
        return c.setSort((input as { specs: any }).specs) as OpResult<unknown>;
      },
    },
    {
      name: "grid_clear_sort",
      description: "Remove sort.",
      input_schema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      async execute() {
        return c.clearSort() as OpResult<unknown>;
      },
    },
    {
      name: "grid_set_filter",
      description: "Set the visible-row filter. Pass null to clear.",
      input_schema: {
        type: "object",
        required: ["filter"],
        properties: {
          filter: { oneOf: [filterClauseSchema(), { type: "null" }] },
        },
        additionalProperties: false,
      },
      async execute(input) {
        return c.setFilter(
          (input as { filter: any }).filter,
        ) as OpResult<unknown>;
      },
    },
    {
      name: "grid_select",
      description: "Move selection to a cell or range.",
      input_schema: {
        type: "object",
        required: ["target"],
        properties: {
          target: {
            oneOf: [
              {
                type: "object",
                required: ["rowId", "columnId"],
                properties: {
                  rowId: { type: "string" },
                  columnId: { type: "string" },
                },
              },
              {
                type: "object",
                required: ["range"],
                properties: {
                  range: {
                    type: "object",
                    required: ["start", "end"],
                    properties: {
                      start: {
                        type: "object",
                        required: ["rowId", "columnId"],
                        properties: {
                          rowId: { type: "string" },
                          columnId: { type: "string" },
                        },
                      },
                      end: {
                        type: "object",
                        required: ["rowId", "columnId"],
                        properties: {
                          rowId: { type: "string" },
                          columnId: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        additionalProperties: false,
      },
      async execute(input) {
        return c.select((input as any).target) as OpResult<unknown>;
      },
    },
  ];
}
