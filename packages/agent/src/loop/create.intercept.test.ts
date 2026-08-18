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
  return { controller, store };
}

describe("AgentLoop interceptors", () => {
  it("onBeforeTool returning false denies the tool; result reflects deny", async () => {
    const { controller, store } = fixture();
    const send = mockSend([
      {
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "grid_set_cell",
            input: { rowId: "r1", columnId: "name", value: "X" },
          },
        ],
        stop_reason: "tool_use",
      },
      { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" },
    ]);
    const events: string[] = [];
    const loop = createAgentLoop({
      controller,
      send,
      onBeforeTool: (call) => call.name !== "grid_set_cell",
    });
    loop.on("*", (e) => events.push(e.type));
    await loop.send("try");
    expect(store.getCell("r1", "name")).toBe("Ada"); // unchanged
    expect(events).toContain("tool.denied");
    const state = loop.getState();
    const toolMsg = state.messages.find((m) => m.role === "tool");
    if (!toolMsg || toolMsg.role !== "tool") throw new Error();
    expect(toolMsg.content[0]!.output.ok).toBe(false);
  });

  it("onBeforeTool throwing treats as deny with error message as reason", async () => {
    const { controller } = fixture();
    const send = mockSend([
      {
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "grid_set_cell",
            input: { rowId: "r1", columnId: "name", value: "X" },
          },
        ],
        stop_reason: "tool_use",
      },
      { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" },
    ]);
    const events: any[] = [];
    const loop = createAgentLoop({
      controller,
      send,
      onBeforeTool: () => {
        throw new Error("policy violation");
      },
    });
    loop.on("tool.denied", (e) => events.push(e));
    await loop.send("try");
    expect(events).toHaveLength(1);
    expect(events[0].reason).toMatch(/policy violation/);
  });

  it("onAfterTool fires with call + result", async () => {
    const { controller } = fixture();
    const send = mockSend([
      {
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "grid_set_cell",
            input: { rowId: "r1", columnId: "name", value: "New" },
          },
        ],
        stop_reason: "tool_use",
      },
      { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" },
    ]);
    const after = vi.fn();
    const loop = createAgentLoop({ controller, send, onAfterTool: after });
    await loop.send("try");
    expect(after).toHaveBeenCalledTimes(1);
    expect(after.mock.calls[0]![0]!.name).toBe("grid_set_cell");
    expect(after.mock.calls[0]![1]!.ok).toBe(true);
  });

  it("onError callback fires before 'error' event, once per error", async () => {
    const { controller } = fixture();
    const send = vi.fn(async () => {
      throw new Error("network down");
    });
    const onError = vi.fn();
    const events: any[] = [];
    const loop = createAgentLoop({ controller, send, onError });
    loop.on("error", (e) => events.push(e));
    await loop.send("hi");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(events).toHaveLength(1);
    expect(events[0].error.code).toBe("llm_error");
    expect(events[0].error.message).toContain("network down");
  });
});
