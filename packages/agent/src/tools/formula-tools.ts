import type { GridController } from "../types/controller.js";
import type { OpResult } from "../types/op-result.js";
import type { ToolDescriptor } from "./index.js";

export function buildFormulaTools(c: GridController): ToolDescriptor[] {
  return [
    {
      name: "grid_set_formula",
      description:
        "Set a formula on a cell. Use A1-style refs; leading '=' is optional. Requires the grid to have been created with formulas enabled.",
      input_schema: {
        type: "object",
        required: ["rowId", "columnId", "source"],
        properties: {
          rowId: { type: "string" },
          columnId: { type: "string" },
          source: { type: "string" },
        },
        additionalProperties: false,
      },
      async execute(input) {
        const { rowId, columnId, source } = input as {
          rowId: string;
          columnId: string;
          source: string;
        };
        return c.setFormula(rowId, columnId, source) as OpResult<unknown>;
      },
    },
    {
      name: "grid_clear_formula",
      description:
        "Remove a formula from a cell; the cell keeps its last computed value as a literal.",
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
        const { rowId, columnId } = input as {
          rowId: string;
          columnId: string;
        };
        return c.clearFormula(rowId, columnId) as OpResult<unknown>;
      },
    },
  ];
}
