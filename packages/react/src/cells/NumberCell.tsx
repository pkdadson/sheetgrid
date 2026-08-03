import type { CellRenderProps } from "./types.js";

export function NumberCell({ value }: CellRenderProps) {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  // Parent cell applies tabular-nums; keep plain text for a11y name.
  return String(n);
}
