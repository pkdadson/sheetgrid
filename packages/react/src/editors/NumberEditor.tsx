import type { EditorRenderProps } from "../cells/types.js";

export function NumberEditor({
  value,
  onChange,
  onCommit,
  onCancel,
  error,
}: EditorRenderProps) {
  const display =
    value === null || value === undefined ? "" : String(value);

  return (
    <input
      className="eg-editor"
      type="number"
      // biome-ignore lint/a11y/noAutofocus: grid editor focus
      autoFocus
      value={display}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") {
          onChange(null);
          return;
        }
        const n = Number(raw);
        onChange(Number.isNaN(n) ? raw : n);
      }}
      onBlur={() => onCommit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      aria-invalid={error ? true : undefined}
      title={error}
    />
  );
}
