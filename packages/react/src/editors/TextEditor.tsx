import type { EditorRenderProps } from "../cells/types.js";

export function TextEditor({
  value,
  onChange,
  onCommit,
  onCancel,
  error,
}: EditorRenderProps) {
  return (
    <input
      className="eg-editor"
      // biome-ignore lint/a11y/noAutofocus: grid editor focus
      autoFocus
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => onChange(e.target.value)}
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
