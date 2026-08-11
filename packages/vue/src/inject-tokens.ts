let injected = false;

const CSS = `
/* tokens */
:root, .eg-root, .eg-frame {
  --eg-row-height: 32px;
  --eg-header-height: 36px;
  --eg-font: system-ui, -apple-system, "Segoe UI", sans-serif;
  --eg-font-size: 13px;
  --eg-font-size-group: 12px;
  --eg-radius: 2px;
  --eg-transition: 150ms ease;
  --eg-border-color: #e2e8f0;
  --eg-border: 1px solid var(--eg-border-color);
  --eg-bg: #ffffff;
  --eg-bg-header: #f8fafc;
  --eg-bg-group: #e2e8f0;
  --eg-bg-group-border: #cbd5e1;
  --eg-bg-selected: #dbeafe;
  --eg-bg-active: #bfdbfe;
  --eg-bg-hover: #f1f5f9;
  --eg-bg-zebra: #f8fafc;
  --eg-text: #0f172a;
  --eg-text-muted: #64748b;
  --eg-text-header-group: #475569;
  --eg-error: #dc2626;
  --eg-error-bg: #fef2f2;
  --eg-focus-ring: 0 0 0 2px #3b82f6;
  --eg-accent: #2563eb;
  --eg-accent-soft: rgba(59, 130, 246, 0.35);
  --eg-status-bg: #f8fafc;
  --eg-status-border: #e2e8f0;
  --eg-resizer-hit: 8px;
}
.eg-root[data-density="compact"], .eg-frame[data-density="compact"] {
  --eg-row-height: 28px;
  --eg-header-height: 30px;
}
.eg-root[data-theme="dark"], .eg-frame[data-theme="dark"],
html[data-theme="dark"] .eg-root, html[data-theme="dark"] .eg-frame,
[data-theme="dark"] .eg-root, [data-theme="dark"] .eg-frame {
  --eg-border-color: #334155;
  --eg-border: 1px solid var(--eg-border-color);
  --eg-bg: #0f172a;
  --eg-bg-header: #1e293b;
  --eg-bg-group: #1e293b;
  --eg-bg-group-border: #475569;
  --eg-bg-selected: #1e3a5f;
  --eg-bg-active: #1d4ed8;
  --eg-bg-hover: #1e293b;
  --eg-bg-zebra: #111827;
  --eg-text: #f8fafc;
  --eg-text-muted: #94a3b8;
  --eg-text-header-group: #94a3b8;
  --eg-error: #f87171;
  --eg-error-bg: #450a0a;
  --eg-focus-ring: 0 0 0 2px #60a5fa;
  --eg-accent: #3b82f6;
  --eg-accent-soft: rgba(96, 165, 250, 0.4);
  --eg-status-bg: #1e293b;
  --eg-status-border: #334155;
}
@media (prefers-reduced-motion: reduce) {
  :root, .eg-root, .eg-frame { --eg-transition: 0ms; }
}

/* frame + root */
.eg-frame {
  display: flex;
  flex-direction: column;
  min-height: 120px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  font-family: var(--eg-font);
  color: var(--eg-text);
  background: var(--eg-bg);
  overflow: hidden;
}
.eg-root {
  box-sizing: border-box;
  color: var(--eg-text);
  font-family: var(--eg-font);
  background: var(--eg-bg);
  border: none;
  overflow: auto;
  position: relative;
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  /* Prevent browser scroll anchoring from fighting virtualized spacers
     (otherwise scrollTop jumps / “falls” when the window remounts rows). */
  overflow-anchor: none;
}
.eg-root:focus-visible {
  outline: none;
  box-shadow: inset var(--eg-focus-ring);
}
.eg-virt-spacer {
  overflow-anchor: none;
  flex-shrink: 0;
}
.eg-root *, .eg-root *::before, .eg-root *::after,
.eg-frame *, .eg-frame *::before, .eg-frame *::after { box-sizing: border-box; }

.eg-table { border-collapse: separate; border-spacing: 0; min-width: 100%; }
.eg-th, .eg-td {
  border-bottom: var(--eg-border);
  border-right: var(--eg-border);
  padding: 0 8px;
  height: var(--eg-row-height);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  font-size: var(--eg-font-size);
  transition: background-color var(--eg-transition);
}
/* Header stickiness is on the header <table> (see Grid). Cells are static so
   top offsets cannot slide leaf headers over the first body rows. */
.eg-th {
  position: relative;
  background: var(--eg-bg-header);
  height: var(--eg-header-height);
  font-weight: 600;
  text-align: left;
  user-select: none;
  cursor: grab;
}
.eg-th:active { cursor: grabbing; }
.eg-th-group {
  text-align: center;
  border-bottom: var(--eg-border);
  font-size: var(--eg-font-size-group);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--eg-text-header-group);
  cursor: default;
}
.eg-th-leaf { z-index: 1; }
.eg-th-required::after {
  content: " *";
  color: var(--eg-error);
  font-weight: 700;
}

.eg-frame[data-zebra="true"] tbody tr.eg-data-row:nth-child(even) .eg-td {
  background: var(--eg-bg-zebra);
}
.eg-frame[data-zebra="true"] tbody tr.eg-data-row:nth-child(even) .eg-td[aria-selected="true"],
.eg-frame[data-zebra="true"] tbody tr.eg-data-row:nth-child(even) .eg-td[data-active="true"] {
  /* selection/active win over zebra */
}

tbody tr.eg-data-row:hover .eg-td:not([aria-selected="true"]):not([data-active="true"]):not([aria-invalid="true"]) {
  background: var(--eg-bg-hover);
}

.eg-td { cursor: cell; }
.eg-td[aria-selected="true"] { background: var(--eg-bg-selected); }
.eg-td[data-active="true"] {
  outline: var(--eg-focus-ring);
  outline-offset: -2px;
  background: var(--eg-bg-active);
}
.eg-td.eg-formula-ref {
  outline: 2px solid var(--eg-accent, #2563eb);
  outline-offset: -2px;
  background: color-mix(in srgb, var(--eg-accent, #2563eb) 12%, var(--eg-bg));
}
.eg-td[aria-invalid="true"] {
  box-shadow: inset 0 0 0 2px var(--eg-error);
  background: var(--eg-error-bg);
}
.eg-td-number {
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.eg-cell-error-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-right: 4px;
  border-radius: 999px;
  background: var(--eg-error);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  flex-shrink: 0;
  vertical-align: middle;
}

.eg-td input.eg-editor,
.eg-td select.eg-editor {
  width: 100%; height: 100%; border: none; outline: none;
  background: transparent; font: inherit; color: inherit; padding: 0;
}
.eg-td input.eg-editor[aria-invalid="true"],
.eg-td select.eg-editor[aria-invalid="true"] {
  color: var(--eg-error);
  box-shadow: inset 0 0 0 1px var(--eg-error);
  border-radius: var(--eg-radius);
}

.eg-group-row td {
  background: var(--eg-bg-group);
  font-weight: 600;
  color: var(--eg-text);
  border-bottom: 1px solid var(--eg-bg-group-border);
}
/* Keep row targets below sticky header when scrollIntoView / focus scrolls them. */
.eg-group-row,
.eg-data-row {
  scroll-margin-top: var(--eg-header-band-height, calc(var(--eg-header-height) * 2));
}
.eg-group-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  min-height: 28px;
  margin-right: 4px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  vertical-align: middle;
  position: relative;
  z-index: 1;
  transition: background-color var(--eg-transition);
}
.eg-group-toggle:hover { background: var(--eg-accent-soft); }
.eg-group-toggle:focus-visible {
  outline: var(--eg-focus-ring);
  outline-offset: 1px;
}
.eg-chevron {
  width: 12px;
  height: 12px;
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.eg-col-resizer {
  position: absolute;
  top: 0;
  right: 0;
  width: var(--eg-resizer-hit);
  height: 100%;
  cursor: col-resize;
  user-select: none;
  transition: background-color var(--eg-transition);
}
.eg-col-resizer::after {
  content: "";
  position: absolute;
  top: 20%;
  bottom: 20%;
  right: 2px;
  width: 2px;
  border-radius: 1px;
  background: transparent;
  transition: background-color var(--eg-transition);
}
.eg-th-leaf:hover .eg-col-resizer::after,
.eg-col-resizer:hover::after {
  background: var(--eg-accent);
}
.eg-col-resizer:hover { background: var(--eg-accent-soft); }

/* Sort header button — override user-agent default button chrome */
.eg-sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  min-height: 24px;
  padding: 4px 6px;
  margin: 0;
  border: 0;
  border-radius: var(--eg-radius);
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  user-select: none;
  transition: background-color var(--eg-transition);
}
.eg-sort-btn:hover {
  background: var(--eg-bg-hover);
}
.eg-sort-btn:focus-visible {
  outline: none;
  box-shadow: var(--eg-focus-ring);
}
.eg-sort-label {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.eg-sort-arrow {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--eg-text-muted);
  min-width: 8px;
}
.eg-sort-badge {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--eg-accent);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.eg-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--eg-accent);
}
.eg-select {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
}
.eg-spacer {
  background: transparent !important;
  pointer-events: none;
}

.eg-toolbar { flex: 0 0 auto; }

.eg-empty,
.eg-loading {
  padding: 32px 16px;
  text-align: center;
  color: var(--eg-text-muted);
}

.eg-status {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 4px 10px;
  font-size: 12px;
  line-height: 1.3;
  color: var(--eg-text-muted);
  background: var(--eg-status-bg);
  border-top: 1px solid var(--eg-status-border);
}
.eg-status[data-has-error="true"] {
  color: var(--eg-error);
  background: var(--eg-error-bg);
}
.eg-status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: var(--eg-error);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}
`;

/** Inject SheetGrid tokens + base grid styles (idempotent; always refreshes CSS). */
export function injectTokens(): void {
  if (typeof document === "undefined") return;
  let style = document.getElementById(
    "sheetgrid-tokens",
  ) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "sheetgrid-tokens";
    document.head.appendChild(style);
  }
  style.textContent = CSS;
  injected = true;
}

export function isTokensInjected(): boolean {
  return injected;
}
