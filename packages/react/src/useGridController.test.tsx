import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useGridController } from "./useGridController.js";

describe("useGridController (React)", () => {
  it("returns a stable controller across renders", () => {
    const { result, rerender } = renderHook(() => useGridController());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("passes options through to createGridController on first render", () => {
    const { result } = renderHook(() =>
      useGridController({ readOnly: true }),
    );
    expect(result.current.isAttached()).toBe(false);
    // A write should fail with read_only because the controller was created with readOnly=true.
    const res = result.current.setCell("r", "c", 1);
    expect(res.ok).toBe(false);
  });

  it("ignores options changes after first render (stability > reactivity)", () => {
    let opts: { readOnly?: boolean } = { readOnly: false };
    const { result, rerender } = renderHook(() => useGridController(opts));
    const before = result.current;
    opts = { readOnly: true };
    rerender();
    expect(result.current).toBe(before);
  });
});
