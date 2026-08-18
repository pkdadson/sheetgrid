import { expectTypeOf, test } from "vitest";
import type {
  AgentError,
  AgentEvent,
  AgentLoop,
  AgentLoopOptions,
  AgentMessage,
  AgentState,
  SendInput,
  SendOutput,
  ToolCall,
} from "./types.js";

test("AgentMessage discriminates by role", () => {
  const user: AgentMessage = { id: "m1", role: "user", content: "hello" };
  const assistant: AgentMessage = {
    id: "m2",
    role: "assistant",
    content: [{ type: "text", text: "hi" }],
  };
  const tool: AgentMessage = {
    id: "m3",
    role: "tool",
    content: [
      {
        type: "tool_result",
        tool_use_id: "t1",
        output: { ok: true, value: null },
      },
    ],
  };
  expectTypeOf(user).toMatchTypeOf<AgentMessage>();
  expectTypeOf(assistant).toMatchTypeOf<AgentMessage>();
  expectTypeOf(tool).toMatchTypeOf<AgentMessage>();
});

test("SendInput carries messages, tools, signal", () => {
  type S = SendInput;
  expectTypeOf<S["messages"]>().toMatchTypeOf<AgentMessage[]>();
  expectTypeOf<S["signal"]>().toMatchTypeOf<AbortSignal>();
});

test("SendOutput content is text or tool_use blocks", () => {
  const out: SendOutput = {
    content: [
      { type: "text", text: "sure" },
      {
        type: "tool_use",
        id: "t1",
        name: "grid_set_cell",
        input: { rowId: "r1" },
      },
    ],
    stop_reason: "tool_use",
  };
  expectTypeOf(out).toMatchTypeOf<SendOutput>();
});

test("AgentEvent covers message/tool/error/done/cancelled", () => {
  const events: AgentEvent["type"][] = [
    "message.added",
    "tool.called",
    "tool.result",
    "tool.denied",
    "error",
    "done",
    "cancelled",
  ];
  expectTypeOf(events).toMatchTypeOf<AgentEvent["type"][]>();
});

test("AgentLoop returns void from send, has cancel/reset/on", () => {
  type L = AgentLoop;
  expectTypeOf<L["send"]>().returns.toMatchTypeOf<Promise<void>>();
  expectTypeOf<L["cancel"]>().returns.toEqualTypeOf<void>();
  expectTypeOf<L["reset"]>().returns.toEqualTypeOf<void>();
  expectTypeOf<L["getState"]>().returns.toMatchTypeOf<AgentState>();
});
