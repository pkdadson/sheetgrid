import type { EditorRenderProps } from "../cells/types.js";

export function SelectEditor({
  value,
  column,
  onChange,
  onCommit,
  onCancel,
  error,
}: EditorRenderProps) {
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
        onCommit(next);
      }}
      onBlur={() => onCommit()}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
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
