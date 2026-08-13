import type { GridController } from "../types/controller.js";
import { ok, type OpResult } from "../types/op-result.js";
import type { ToolDescriptor } from "./index.js";
import { whereClauseSchema } from "./json-schema.js";

export function buildReadTools(c: GridController): ToolDescriptor[] {
  return [
    {
      name: "grid_get_schema",
      description:
        "Return the grid schema: column ids, headers, types, agent-writable flags, current sort and filter. Call this first to understand the data layout.",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
      async execute() {
        return ok(c.getSchema()) as OpResult<unknown>;
      },
    },
    {
      name: "grid_get_data",
      description:
        "Read rows. Pass rowIds to fetch specific rows (bypasses sort/filter). Pass range { fromRow, toRow } to page through visible rows (post sort/filter). Pass columnIds to restrict returned fields. includeFormulaSources adds formula strings alongside computed values.",
      input_schema: {
        type: "object",
        properties: {
          rowIds: { type: "array", items: { type: "string" } },
          columnIds: { type: "array", items: { type: "string" } },
          range: {
            type: "object",
            properties: {
              fromRow: { type: "integer", minimum: 0 },
              toRow: { type: "integer", minimum: 0 },
            },
            required: ["fromRow", "toRow"],
          },
          includeFormulaSources: { type: "boolean" },
        },
        additionalProperties: false,
      },
      async execute(input) {
        return ok(c.getData(input as any)) as OpResult<unknown>;
      },
    },
    {
      name: "grid_get_cell",
      description: "Return a single cell's value, formula source (if any), and error (if any).",
      input_schema: {
        type: "object",
        required: ["rowId", "columnId"],
        properties: {
          rowId: { type: "string" },
          columnId: { type: "string" },
        },
        additionalProperties: false,
      },
      async execute(input) {
        const { rowId, columnId } = input as { rowId: string; columnId: string };
        return c.getCell(rowId, columnId) as OpResult<unknown>;
      },
    },
    {
      name: "grid_query_rows",
      description:
        "Return row ids matching a where clause. Use this instead of get_data when you only need to select rows for further operations.",
      input_schema: {
        type: "object",
        required: ["where"],
        properties: { where: whereClauseSchema() },
        additionalProperties: false,
      },
      async execute(input) {
        return c.queryRows((input as { where: unknown }).where as never) as OpResult<unknown>;
      },
    },
    {
      name: "grid_get_selection",
      description: "Return the current cell/range/row/column selection.",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
      async execute() {
        return ok(c.getSelection()) as OpResult<unknown>;
      },
    },
    {
      name: "grid_describe",
      description:
        "Return a compact human-readable summary of the grid (columns, types, row count, current sort/filter). Include this in the system prompt so the model knows the shape without dumping raw data.",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
      async execute() {
        return ok(c.describe()) as OpResult<unknown>;
      },
    },
  ];
}
