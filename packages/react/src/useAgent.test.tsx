import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createGridStore } from "@sheetgrid/core";
import { createGridController } from "@sheetgrid/agent";
import { useAgent } from "./useAgent.js";
import type { SendOutput } from "@sheetgrid/agent";

function mockSend(scripts: SendOutput[]) {
  let i = 0;
  return vi.fn(async () => {
    const out = scripts[i++];
    if (!out) throw new Error("script exhausted");
    return out;
  });
}

function fixture() {
  const store = createGridStore({
    rows: [{ id: "r1", values: { name: "Ada" } }],
    columns: [{ id: "name", header: "Name" }],
  });
  const controller = createGridController();
  controller.__attach(store);
  return controller;
}

describe("useAgent (React)", () => {
  it("returns stable loop methods across renders", () => {
    const controller = fixture();
    const send = mockSend([]);
    const { result, rerender } = renderHook(() =>
      useAgent(controller, { send }),
    );
    const first = result.current.send;
    rerender();
    expect(result.current.send).toBe(first);
  });

  it("state updates propagate through useSyncExternalStore", async () => {
    const controller = fixture();
    const send = mockSend([
      { content: [{ type: "text", text: "hi" }], stop_reason: "end_turn" },
    ]);
    const { result } = renderHook(() => useAgent(controller, { send }));
    expect(result.current.messages).toEqual([]);
    await act(async () => {
      await result.current.send("hello");
    });
    expect(result.current.messages.length).toBeGreaterThan(0);
    expect(result.current.thinking).toBe(false);
  });

  it("swapping send option between renders takes effect", async () => {
    const controller = fixture();
    const send1 = vi.fn(async () => ({
      content: [{ type: "text" as const, text: "from send1" }],
      stop_reason: "end_turn" as const,
    }));
    const send2 = vi.fn(async () => ({
      content: [{ type: "text" as const, text: "from send2" }],
      stop_reason: "end_turn" as const,
    }));

    const { result, rerender } = renderHook(
      ({ opts }: { opts: { send: any } }) => useAgent(controller, opts),
      { initialProps: { opts: { send: send1 } } },
    );

    await act(async () => {
      await result.current.send("first");
    });
    expect(send1).toHaveBeenCalledTimes(1);
    expect(send2).toHaveBeenCalledTimes(0);

    rerender({ opts: { send: send2 } });

    await act(async () => {
      await result.current.send("second");
    });
    expect(send2).toHaveBeenCalledTimes(1);
  });
});
