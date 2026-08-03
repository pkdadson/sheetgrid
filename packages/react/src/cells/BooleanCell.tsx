import type { CellRenderProps } from "./types.js";

export function BooleanCell({ value, onCommitValue, column }: CellRenderProps) {
  const checked = Boolean(value);
  const editable =
    column.editable === undefined
      ? true
      : typeof column.editable === "function"
        ? true
        : column.editable;

  return (
    <input
      type="checkbox"
      className="eg-checkbox"
      checked={checked}
      disabled={!editable}
      onChange={(e) => {
        e.stopPropagation();
        onCommitValue(e.target.checked);
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      aria-label={column.header}
    />
  );
}
