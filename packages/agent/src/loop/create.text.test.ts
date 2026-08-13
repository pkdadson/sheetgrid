import { describe, expect, it, vi } from "vitest";
import { createGridStore } from "@sheetgrid/core";
import { createGridController } from "../controller/create.js";
import { createAgentLoop } from "./create.js";
import type { SendOutput } from "./types.js";

function mockSend(scripts: SendOutput[]) {
  let i = 0;
  return vi.fn(async () => {
    const out = scripts[i++];
    if (!out) throw new Error(`send script exhausted at call ${i}`);
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

describe("createAgentLoop — text-only", () => {
  it("appends user + assistant messages, emits done", async () => {
    const controller = fixture();
    const send = mockSend([
      {
        content: [{ type: "text", text: "Hi there" }],
        stop_reason: "end_turn",
      },
    ]);
    const events: string[] = [];
    const loop = createAgentLoop({ controller, send });
    loop.on("*", (e) => events.push(e.type));
    await loop.send("hello");
    const state = loop.getState();
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0]!.role).toBe("user");
    expect(state.messages[1]!.role).toBe("assistant");
    expect(state.thinking).toBe(false);
    expect(events).toContain("message.added");
    expect(events).toContain("done");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("subscribe notifies on every state change", async () => {
    const controller = fixture();
    const send = mockSend([
      { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" },
    ]);
    const listener = vi.fn();
    const loop = createAgentLoop({ controller, send });
    loop.subscribe(listener);
    await loop.send("hi");
    // At minimum: thinking=true, user added, thinking=false + assistant added.
    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("send builds SendInput with messages, tools, signal, systemPrompt", async () => {
    const controller = fixture();
    const send = mockSend([
      { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" },
    ]);
    const loop = createAgentLoop({ controller, send });
    await loop.send("hi");
    const input = send.mock.calls[0]![0]!;
    expect(input.messages.length).toBeGreaterThan(0);
    expect(Array.isArray(input.tools)).toBe(true);
    expect(input.tools.length).toBeGreaterThan(20); // all grid tools
    expect(input.signal).toBeInstanceOf(AbortSignal);
    expect(input.systemPrompt).toContain("SheetGrid");
  });

  it("concurrent send throws busy", async () => {
    const controller = fixture();
    let resolve: (v: SendOutput) => void;
    const send = vi.fn(
      () =>
        new Promise<SendOutput>((r) => {
          resolve = r;
        }),
    );
    const loop = createAgentLoop({ controller, send });
    const first = loop.send("hi");
    await expect(loop.send("also")).rejects.toThrow(/busy/i);
    resolve!({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" });
    await first;
  });
});
