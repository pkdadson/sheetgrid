/**
 * Helpers for Excel-like formula point mode: click/drag cells to insert A1 refs
 * while the in-cell editor draft starts with `=`.
 */

export function isFormulaDraft(draft: unknown): boolean {
  return typeof draft === "string" && draft.trimStart().startsWith("=");
}

/**
 * Insert or replace the active point-mode token in the formula draft.
 * `pickStart` is the index where the current click/drag token begins.
 */
export function applyFormulaPick(
  draft: string,
  token: string,
  pickStart: number | null,
): { draft: string; pickStart: number } {
  if (pickStart != null && pickStart >= 0 && pickStart <= draft.length) {
    return {
      draft: draft.slice(0, pickStart) + token,
      pickStart,
    };
  }
  // Append; if draft ends with a letter/digit (incomplete typing), still append —
  // user is expected to type operators between picks.
  const start = draft.length;
  return { draft: draft + token, pickStart: start };
}

export interface FormulaPickRange {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

export function expandPickRange(
  anchorRow: number,
  anchorCol: number,
  row: number,
  col: number,
): FormulaPickRange {
  return {
    r1: Math.min(anchorRow, row),
    c1: Math.min(anchorCol, col),
    r2: Math.max(anchorRow, row),
    c2: Math.max(anchorCol, col),
  };
}

export function cellInPickRange(
  row: number,
  col: number,
  range: FormulaPickRange | null,
): boolean {
  if (!range) return false;
  return (
    row >= range.r1 &&
    row <= range.r2 &&
    col >= range.c1 &&
    col <= range.c2
  );
}
