import type { FullInternalStore } from "./internal-store.js";
import type { Snapshot } from "./commands/types.js";

export function takeSnapshot(s: FullInternalStore): Snapshot {
  return {
    v: 1,
    rows: s.getRowsRef().map((r) => ({ id: r.id, values: { ...r.values } })),
    columns: s.getColumnsRef().map((c) => ({ ...c })),
    columnOrder: [...s.getColumnOrderRef()],
    formulas: s.formulas.serialize(),
  };
}

export function applySnapshot(s: FullInternalStore, snap: Snapshot): void {
  s.setRows(snap.rows.map((r) => ({ id: r.id, values: { ...r.values } })));
  s.setColumns(snap.columns.map((c) => ({ ...c })));
  s.setColumnOrder([...snap.columnOrder]);
  s.formulas.restore(snap.formulas);
  s.notify();
}
