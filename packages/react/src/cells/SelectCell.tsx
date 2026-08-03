import type { CellRenderProps } from "./types.js";

export function SelectCell({ value, column }: CellRenderProps) {
  const options = column.selectOptions ?? [];
  const match = options.find((o) => o.value === value || o.value === String(value));
  if (match) return match.label;
  if (value === null || value === undefined) return "";
  return String(value);
}
