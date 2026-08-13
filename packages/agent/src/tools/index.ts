import type { GridController } from "../types/controller.js";
import type { OpResult } from "../types/op-result.js";
import type { JSONSchema } from "./json-schema.js";
import { buildColumnTools } from "./column-tools.js";
import { buildFormulaTools } from "./formula-tools.js";
import { buildHistoryTools } from "./history-tools.js";
import { buildReadTools } from "./read-tools.js";
import { buildRowTools } from "./row-tools.js";
import { buildViewTools } from "./view-tools.js";
import { buildWriteCellTools } from "./write-cell-tools.js";

export interface ToolDescriptor {
  name: string;
  description: string;
  input_schema: JSONSchema;
  execute(input: unknown): Promise<OpResult<unknown>>;
}

export interface DescribeToolsOptions {
  include?: string[];
  exclude?: string[];
  /**
   * When true, generates schemas keyed by current column defs (dynamic per call).
   * Default true. Set false to freeze at describe-time (advanced/tests).
   */
  dynamic?: boolean;
}

export function describeGridTools(
  controller: GridController,
  options: DescribeToolsOptions = {},
): ToolDescriptor[] {
  const all: ToolDescriptor[] = [
    ...buildReadTools(controller),
    ...buildWriteCellTools(controller),
    ...buildRowTools(controller),
    ...buildColumnTools(controller),
    ...buildViewTools(controller),
    ...buildFormulaTools(controller),
    ...buildHistoryTools(controller),
  ];

  return applyFilters(all, options);
}

function applyFilters(
  tools: ToolDescriptor[],
  { include, exclude }: DescribeToolsOptions,
): ToolDescriptor[] {
  let out = tools;
  if (include) out = out.filter((t) => include.includes(t.name));
  if (exclude) out = out.filter((t) => !exclude.includes(t.name));
  return out;
}
