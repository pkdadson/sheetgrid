import type { GridSchema } from "../types/controller.js";

export function defaultSystemPrompt(schema: GridSchema): string {
  const cols = schema.columns
    .map((c) => {
      const type = c.type ?? "any";
      const writable = c.agentWritable ? "" : " (read-only)";
      const desc = c.description ? ` — ${c.description}` : "";
      return `- ${c.id} (${type})${writable}${desc}`;
    })
    .join("\n");

  const sort =
    schema.sort.length === 0
      ? "none"
      : schema.sort.map((s) => `${s.columnId} ${s.direction}`).join(", ");
  const filter = schema.filter === null ? "none" : "active";

  return `You are an assistant with access to a SheetGrid (mode: ${schema.mode}, ${schema.rowCount} rows).

Columns:
${cols}

Current sort: ${sort}
Current filter: ${filter}

To read or modify the grid, call the provided grid_* tools. Prefer grid_query_rows or grid_get_data with rowIds/columnIds/range for large datasets — do not dump the entire grid. Every tool returns { ok: true, value } or { ok: false, code, message }; correct and retry on validation errors. Ids for rows and columns are stable strings.`;
}
