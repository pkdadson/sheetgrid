import { describe, expect, it, vi } from "vitest";
import { createSelectionState } from "./selection-state.js";

describe("SelectionState (controller-side)", () => {
  it("starts empty", () => {
    const sel = createSelectionState();
    expect(sel.get()).toEqual({
      active: null,
      ranges: [],
      rowIds: [],
      columnIds: [],
    });
  });

  it("selectCell sets active and emits changed", () => {
    const sel = createSelectionState();
    const spy = vi.fn();
    sel.subscribe(spy);
    sel.selectCell("r1", "c1");
    expect(sel.get().active).toEqual({ rowId: "r1", columnId: "c1" });
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ active: null }),
      expect.objectContaining({ active: { rowId: "r1", columnId: "c1" } }),
    );
  });

  it("selectRange sets ranges", () => {
    const sel = createSelectionState();
    sel.selectRange(
      { rowId: "r1", columnId: "c1" },
      { rowId: "r2", columnId: "c3" },
    );
    expect(sel.get().ranges).toEqual([
      {
        start: { rowId: "r1", columnId: "c1" },
        end: { rowId: "r2", columnId: "c3" },
      },
    ]);
  });

  it("clear resets everything", () => {
    const sel = createSelectionState();
    sel.selectCell("r1", "c1");
    sel.clear();
    expect(sel.get()).toEqual({
      active: null,
      ranges: [],
      rowIds: [],
      columnIds: [],
    });
  });
});
