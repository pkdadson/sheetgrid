import type { GridStore } from "@sheetgrid/core";
import { isColumnAgentWritable } from "./authorize-check.js";
import type { GridSchema } from "../types/controller.js";

export function buildSchema(
  store: GridStore,
  mode: "objects" | "matrix",
): GridSchema {
  const cols = store.getOrderedColumns();
  return {
    columns: cols.map((c) => ({
      id: c.id,
      header: c.header,
      type: c.type,
      agentWritable: isColumnAgentWritable(c),
      description: (c as { description?: string }).description,
    })),
    rowIdField: "id",
    rowCount: store.getRows().length,
    mode,
    sort: store.getSort(),
    filter: store.getFilter(),
  };
}
