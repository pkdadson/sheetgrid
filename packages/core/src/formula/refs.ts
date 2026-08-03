export interface A1Cell {
  /** 0-based */
  row: number;
  col: number;
  rowAbs: boolean;
  colAbs: boolean;
}

export interface A1Range {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

const CELL_RE = /^(\$?)([A-Za-z]+)(\$?)([1-9][0-9]*)$/;

export function lettersToColIndex(letters: string): number {
  let n = 0;
  const s = letters.toUpperCase();
  for (let i = 0; i < s.length; i++) {
    n = n * 26 + (s.charCodeAt(i) - 64);
  }
  return n - 1;
}

export function colIndexToLetters(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function parseA1(text: string): A1Cell | null {
  if (text.includes("!")) return null;
  const m = CELL_RE.exec(text.trim());
  if (!m) return null;
  const col = lettersToColIndex(m[2]!);
  const row = Number(m[4]) - 1;
  if (!Number.isFinite(row) || row < 0 || col < 0) return null;
  return {
    row,
    col,
    colAbs: m[1] === "$",
    rowAbs: m[3] === "$",
  };
}

export function parseA1Range(text: string): A1Range | null {
  if (text.includes("!")) return null;
  const parts = text.split(":");
  if (parts.length === 1) {
    const cell = parseA1(parts[0]!);
    if (!cell) return null;
    return { r1: cell.row, c1: cell.col, r2: cell.row, c2: cell.col };
  }
  if (parts.length !== 2) return null;
  const a = parseA1(parts[0]!);
  const b = parseA1(parts[1]!);
  if (!a || !b) return null;
  return {
    r1: Math.min(a.row, b.row),
    c1: Math.min(a.col, b.col),
    r2: Math.max(a.row, b.row),
    c2: Math.max(a.col, b.col),
  };
}

export function cellRefKey(row: number, col: number): string {
  return `${row}:${col}`;
}

/** Format 0-based indices as A1 (relative). */
export function formatA1(row: number, col: number): string {
  return `${colIndexToLetters(col)}${row + 1}`;
}

/** Format inclusive 0-based range as A1 or A1:B2. */
export function formatA1Range(
  r1: number,
  c1: number,
  r2: number,
  c2: number,
): string {
  const a = formatA1(r1, c1);
  const b = formatA1(r2, c2);
  return a === b ? a : `${a}:${b}`;
}
