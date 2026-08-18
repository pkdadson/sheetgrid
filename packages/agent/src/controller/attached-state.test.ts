import { describe, expect, it, vi } from "vitest";
import { createAttachedState } from "./attached-state.js";

describe("AttachedState", () => {
  it("is detached by default", () => {
    const st = createAttachedState();
    expect(st.isAttached()).toBe(false);
    expect(st.getStore()).toBeNull();
  });

  it("attach stores the reference and returns unsubscribe", () => {
    const st = createAttachedState();
    const store = { subscribe: vi.fn(() => vi.fn()) } as any;
    st.attach(store);
    expect(st.isAttached()).toBe(true);
    expect(st.getStore()).toBe(store);
  });

  it("attaching a second store while attached throws conflict", () => {
    const st = createAttachedState();
    const s1 = { subscribe: () => () => {} } as any;
    const s2 = { subscribe: () => () => {} } as any;
    st.attach(s1);
    expect(() => st.attach(s2)).toThrow(/already attached/i);
  });

  it("detach clears store and calls the store unsubscribe", () => {
    const unsub = vi.fn();
    const store = { subscribe: () => unsub } as any;
    const st = createAttachedState();
    st.attach(store);
    st.detach();
    expect(st.isAttached()).toBe(false);
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it("queue holds up to 100 pending ops when detached", () => {
    const st = createAttachedState();
    for (let i = 0; i < 100; i++)
      st.enqueue({
        type: "grid.set_cell",
        rowId: "r",
        columnId: "c",
        value: i,
      } as any);
    // The 101st push evicts the oldest.
    st.enqueue({
      type: "grid.set_cell",
      rowId: "r",
      columnId: "c",
      value: 999,
    } as any);
    const drained = st.drain();
    expect(drained).toHaveLength(100);
    expect((drained[99] as any).value).toBe(999);
  });

  it("drain returns and clears the queue", () => {
    const st = createAttachedState();
    st.enqueue({ type: "grid.undo" } as any);
    const drained = st.drain();
    expect(drained).toHaveLength(1);
    expect(st.drain()).toEqual([]);
  });
});
