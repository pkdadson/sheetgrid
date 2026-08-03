import { useRef } from "react";
import type { EditorRenderProps } from "../cells/types.js";

export function TextEditor({
  value,
  onChange,
  onCommit,
  onCancel,
  error,
}: EditorRenderProps) {
  // Escape unmounts the input, which fires blur — skip commit in that case.
  const skipBlurCommit = useRef(false);

  return (
    <input
      className="eg-editor"
      // biome-ignore lint/a11y/noAutofocus: grid editor focus
      autoFocus
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => onChange(e.target.value)}
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
