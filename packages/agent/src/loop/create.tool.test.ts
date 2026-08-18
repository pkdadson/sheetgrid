import { createGridStore } from "@sheetgrid/core";
import { describe, expect, it, vi } from "vitest";
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
    rows: [{ id: "r1", values: { name: "Ada", age: 36 } }],
    columns: [
      { id: "name", header: "Name" },
      { id: "age", header: "Age", type: "number" },
    ],
  });
  const controller = createGridController();
  controller.__attach(store);
  return { controller, store };
}

describe("createAgentLoop — tool_use execution", () => {
  it("executes a single tool_use, appends tool_result, loops back for final text", async () => {
    const { controller, store } = fixture();
    const send = mockSend([
      {
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "grid_set_cell",
            input: { rowId: "r1", columnId: "age", value: 37 },
          },
        ],
        stop_reason: "tool_use",
      },
      {
        content: [{ type: "text", text: "Updated Ada's age to 37." }],
        stop_reason: "end_turn",
      },
    ]);
    const events: string[] = [];
    const loop = createAgentLoop({ controller, send });
    loop.on("*", (e) => events.push(e.type));
    await loop.send("bump Ada's age");
    expect(store.getCell("r1", "age")).toBe(37);
    expect(send).toHaveBeenCalledTimes(2);
    // Message shape: user, assistant(tool_use), tool(tool_result), assistant(text)
    const state = loop.getState();
    expect(state.messages.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "tool",
      "assistant",
    ]);
    expect(events).toContain("tool.called");
    expect(events).toContain("tool.result");
    expect(events).toContain("done");
  });

  it("executes multiple tool_uses in one response", async () => {
    const { controller, store } = fixture();
    const send = mockSend([
      {
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "grid_set_cell",
            input: { rowId: "r1", columnId: "name", value: "Ada L" },
          },
          {
            type: "tool_use",
            id: "t2",
            name: "grid_set_cell",
            input: { rowId: "r1", columnId: "age", value: 99 },
          },
        ],
        stop_reason: "tool_use",
      },
      { content: [{ type: "text", text: "done" }], stop_reason: "end_turn" },
    ]);
    const loop = createAgentLoop({ controller, send });
    await loop.send("update both");
    expect(store.getCell("r1", "name")).toBe("Ada L");
    expect(store.getCell("r1", "age")).toBe(99);
  });

  it("unknown tool name yields OpResult error, model can retry", async () => {
    const { controller } = fixture();
    const send = mockSend([
      {
        content: [
          { type: "tool_use", id: "t1", name: "grid_totally_fake", input: {} },
        ],
        stop_reason: "tool_use",
      },
      { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" },
    ]);
    const events: string[] = [];
    const loop = createAgentLoop({ controller, send });
    loop.on("*", (e) => events.push(e.type));
    await loop.send("do bad thing");
    // tool.result should still fire with an error OpResult
    expect(events).toContain("tool.result");
    const state = loop.getState();
    const toolMsg = state.messages.find((m) => m.role === "tool");
    if (!toolMsg || toolMsg.role !== "tool") throw new Error();
    expect(toolMsg.content[0]!.output.ok).toBe(false);
  });
});
