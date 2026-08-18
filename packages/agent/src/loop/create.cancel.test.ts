import { createGridStore } from "@sheetgrid/core";
import { describe, expect, it, vi } from "vitest";
import { createGridController } from "../controller/create.js";
import { createAgentLoop } from "./create.js";
import type { SendInput, SendOutput } from "./types.js";

function fixture() {
  const store = createGridStore({
    rows: [{ id: "r1", values: { n: 1 } }],
    columns: [{ id: "n", header: "N", type: "number" }],
  });
  const controller = createGridController();
  controller.__attach(store);
  return controller;
}

describe("createAgentLoop — cancel", () => {
  it("cancel() aborts in-flight send and fires cancelled event", async () => {
    const controller = fixture();
    let capturedSignal: AbortSignal | null = null;
    const send = vi.fn(
      (input: SendInput) =>
        new Promise<SendOutput>((_resolve, reject) => {
          capturedSignal = input.signal;
          input.signal.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    const events: string[] = [];
    const loop = createAgentLoop({ controller, send });
    loop.on("*", (e) => events.push(e.type));
    const p = loop.send("hi");
    // Wait a tick for send() to start.
    await new Promise((r) => setTimeout(r, 0));
    loop.cancel();
    await p;
    expect(capturedSignal?.aborted).toBe(true);
    expect(events).toContain("cancelled");
    expect(loop.getState().thinking).toBe(false);
  });

  it("cancel() with no send in-flight is a no-op", () => {
    const controller = fixture();
    const loop = createAgentLoop({
      controller,
      send: async () => ({ content: [], stop_reason: "end_turn" }),
    });
    expect(() => loop.cancel()).not.toThrow();
  });
});
