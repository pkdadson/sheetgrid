import { useRef } from "react";
import type { EditorRenderProps } from "../cells/types.js";

export function NumberEditor({
  value,
  onChange,
  onCommit,
  onCancel,
  error,
}: EditorRenderProps) {
  const skipBlurCommit = useRef(false);
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
      onBlur={() => {
        if (skipBlurCommit.current) return;
        onCommit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          skipBlurCommit.current = true;
          onCommit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          skipBlurCommit.current = true;
          onCancel();
        }
      }}
      aria-invalid={error ? true : undefined}
      title={error}
    />
  );
}
