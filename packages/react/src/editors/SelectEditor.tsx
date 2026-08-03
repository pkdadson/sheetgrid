import { useRef } from "react";
import type { EditorRenderProps } from "../cells/types.js";

export function SelectEditor({
  value,
  column,
  onChange,
  onCommit,
  onCancel,
  error,
}: EditorRenderProps) {
  const skipBlurCommit = useRef(false);
  const options = column.selectOptions ?? [];

  return (
    <select
      className="eg-editor eg-select"
      // biome-ignore lint/a11y/noAutofocus: grid editor focus
      autoFocus
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => {
        const next = e.target.value;
        onChange(next);
        skipBlurCommit.current = true;
        onCommit(next);
      }}
      onBlur={() => {
        if (skipBlurCommit.current) return;
        onCommit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          skipBlurCommit.current = true;
          onCancel();
        }
      }}
      aria-invalid={error ? true : undefined}
      title={error}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
