import type { ColumnId, RowId, SelectionState } from "@sheetgrid/core";

export interface ControllerSelection {
  get(): SelectionState;
  selectCell(rowId: RowId, columnId: ColumnId): void;
  selectRange(
    start: { rowId: RowId; columnId: ColumnId },
    end: { rowId: RowId; columnId: ColumnId },
  ): void;
  clear(): void;
  subscribe(
    listener: (prev: SelectionState, next: SelectionState) => void,
  ): () => void;
}

const empty = (): SelectionState => ({
  active: null,
  ranges: [],
  rowIds: [],
  columnIds: [],
});

export function createSelectionState(): ControllerSelection {
  let state: SelectionState = empty();
  const listeners = new Set<
    (prev: SelectionState, next: SelectionState) => void
  >();

  const set = (next: SelectionState) => {
    const prev = state;
    state = next;
    for (const l of listeners) l(prev, next);
  };

  return {
    get: () => state,
    selectCell(rowId, columnId) {
      set({
        active: { rowId, columnId },
        ranges: [],
        rowIds: [],
        columnIds: [],
      });
    },
    selectRange(start, end) {
      set({
        active: start,
        ranges: [{ start, end }],
        rowIds: [],
        columnIds: [],
      });
    },
    clear() {
      set(empty());
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
