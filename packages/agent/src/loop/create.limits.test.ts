import { createGridStore } from "@sheetgrid/core";
import { describe, expect, it, vi } from "vitest";
import { createGridController } from "../controller/create.js";
import { createAgentLoop } from "./create.js";
import type { SendOutput } from "./types.js";

function mockSend(scripts: SendOutput[]) {
  let i = 0;
  return vi.fn(async () => {
    const out = scripts[i++];
    if (!out) throw new Error(`script exhausted at ${i}`);
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

describe("AgentLoop limits", () => {
  it("maxHistory bounds the message list", async () => {
    const controller = fixture();
    const script: SendOutput[] = Array.from({ length: 4 }, () => ({
      content: [{ type: "text", text: "ok" }],
      stop_reason: "end_turn",
    }));
    const loop = createAgentLoop({
      controller,
      send: mockSend(script),
      maxHistory: 2, // 2 turns = 4 messages max
    });
    await loop.send("one");
    await loop.send("two");
    await loop.send("three");
    await loop.send("four");
    expect(loop.getState().messages.length).toBeLessThanOrEqual(4);
    // Most recent user message should be "four".
    const users = loop.getState().messages.filter((m) => m.role === "user");
    expect(users[users.length - 1]!.content).toBe("four");
  });

  it("maxIterations enforces loop cap and emits loop_limit error", async () => {
    const controller = fixture();
    // Every send returns another tool_use — infinite loop without the cap.
    const send = vi.fn(async () => ({
      content: [
        { type: "tool_use", id: "t", name: "grid_get_schema", input: {} },
      ],
      stop_reason: "tool_use" as const,
    }));
    const events: any[] = [];
    const loop = createAgentLoop({ controller, send, maxIterations: 3 });
    loop.on("error", (e) => events.push(e));
    await loop.send("go");
    expect(send).toHaveBeenCalledTimes(3);
    expect(events).toHaveLength(1);
    expect(events[0].error.code).toBe("loop_limit");
  });

  it("reset clears messages and error", async () => {
    const controller = fixture();
    const send = mockSend([
      { content: [{ type: "text", text: "hi" }], stop_reason: "end_turn" },
    ]);
    const loop = createAgentLoop({ controller, send });
    await loop.send("hello");
    expect(loop.getState().messages.length).toBeGreaterThan(0);
    loop.reset();
    expect(loop.getState().messages).toEqual([]);
    expect(loop.getState().error).toBeNull();
  });

  it("toolFilter passes through to describeGridTools", async () => {
    const controller = fixture();
    const send = mockSend([
      { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" },
    ]);
    const loop = createAgentLoop({
      controller,
      send,
      toolFilter: { include: ["grid_get_schema"] },
    });
    await loop.send("hi");
    const input = send.mock.calls[0]![0]!;
    expect(input.tools).toHaveLength(1);
    expect(input.tools[0]!.name).toBe("grid_get_schema");
  });

  it("systemPrompt override replaces default", async () => {
    const controller = fixture();
    const send = mockSend([
      { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" },
    ]);
    const loop = createAgentLoop({
      controller,
      send,
      systemPrompt: () => "custom prompt",
    });
    await loop.send("hi");
    expect(send.mock.calls[0]![0]!.systemPrompt).toBe("custom prompt");
  });
});
