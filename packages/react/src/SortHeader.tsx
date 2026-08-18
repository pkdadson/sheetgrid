import type { KeyboardEvent, MouseEvent } from "react";

export interface SortHeaderProps {
  label: string;
  /** null when this column is not part of the current sort. */
  direction: "asc" | "desc" | null;
  /** Priority within a multi-column sort (1-based). undefined when single-sort or unsorted. */
  priority?: number;
  /** Fired for plain click. */
  onSort: () => void;
  /** Fired for shift+click. */
  onShiftSort: () => void;
}

/**
 * A sortable column header. Rendered inside a leaf `<th>`. Wraps the label in
 * a native `<button>` so focus, Enter, and Space behave correctly and screen
 * readers announce the affordance.
 */
export function SortHeader({
  label,
  direction,
  priority,
  onSort,
  onShiftSort,
}: SortHeaderProps) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (e.shiftKey) onShiftSort();
    else onSort();
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey) onShiftSort();
    else onSort();
  };
  return (
    <button
      type="button"
      className="eg-sort-btn"
      aria-label={`Sort by ${label}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <span className="eg-sort-label">{label}</span>
      <span className="eg-sort-arrow" aria-hidden="true">
        {direction === "asc" ? "↑" : direction === "desc" ? "↓" : ""}
      </span>
      {direction !== null && priority !== undefined && (
        <span className="eg-sort-badge" aria-hidden="true">
          {priority}
        </span>
      )}
    </button>
  );
}
