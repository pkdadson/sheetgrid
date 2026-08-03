import type { CellRenderProps } from "./types.js";

export function TextCell({ value }: CellRenderProps) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
