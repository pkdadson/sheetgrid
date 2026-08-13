import type { OpResult } from "../types/op-result.js";
import type { GridSchema } from "../types/controller.js";
import type { ToolDescriptor } from "../tools/index.js";

/**
 * A single message in the conversation transcript. Roles roughly mirror
 * Anthropic's message shape — user has plain text; assistant has content blocks;
 * tool carries tool_results from executing tool_use calls.
 */
export type AgentMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content: Array<
        | { type: "text"; text: string }
        | { type: "tool_use"; id: string; name: string; input: unknown }
      >;
    }
  | {
      id: string;
      role: "tool";
      content: Array<{
        type: "tool_result";
        tool_use_id: string;
        output: OpResult<unknown>;
      }>;
    };

/** A single tool call the model has requested. */
export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

/** Errors surfaced through the loop. */
export interface AgentError {
  code:
    | "llm_error"
    | "loop_limit"
    | "tool_not_found"
    | "busy"
    | "aborted"
    | "internal";
  message: string;
  cause?: unknown;
}

/** All events fired via `AgentLoop.on`. */
export type AgentEvent =
  | { type: "message.added"; message: AgentMessage }
  | { type: "tool.called"; call: ToolCall }
  | { type: "tool.result"; call: ToolCall; result: OpResult<unknown> }
  | { type: "tool.denied"; call: ToolCall; reason: string }
  | { type: "error"; error: AgentError }
  | { type: "done" }
  | { type: "cancelled" };

/** The reactive state slice returned by getState(). */
export interface AgentState {
  messages: AgentMessage[];
  thinking: boolean;
  error: AgentError | null;
}

/** Input handed to the consumer's send() callback. */
export interface SendInput {
  messages: AgentMessage[];
  tools: ToolDescriptor[];
  signal: AbortSignal;
  systemPrompt: string;
}

/** Response the consumer's send() callback must return. */
export interface SendOutput {
  content: Array<
    | { type: "text"; text: string }
    | { type: "tool_use"; id: string; name: string; input: unknown }
  >;
  stop_reason: "end_turn" | "tool_use" | string;
}

/** Options for createAgentLoop. */
export interface AgentLoopOptions {
  controller: import("../types/controller.js").GridController;

  /** REQUIRED. The one LLM-touching function the consumer supplies. */
  send(input: SendInput): Promise<SendOutput>;

  /** Called before each tool. Return false or throw to deny. */
  onBeforeTool?: (call: ToolCall) => boolean | Promise<boolean>;
  /** Called after each tool result is available. */
  onAfterTool?: (call: ToolCall, result: OpResult<unknown>) => void | Promise<void>;
  /** Called for every AgentError before the 'error' event fires. */
  onError?: (err: AgentError) => void;

  /** History cap in turns (user+assistant pairs). Older turns drop. Default 20. */
  maxHistory?: number;

  /** Tool descriptor filter. Passed through to describeGridTools. */
  toolFilter?: { include?: string[]; exclude?: string[] };

  /** Override the auto-generated system prompt. */
  systemPrompt?: (schema: GridSchema) => string;

  /** Max iterations of the send→tool loop for one user turn. Default 25. */
  maxIterations?: number;
}

/** Public shape of the loop. */
export interface AgentLoop {
  send(userText: string): Promise<void>;
  cancel(): void;
  reset(): void;
  getState(): AgentState;
  subscribe(listener: () => void): () => void;
  on<E extends AgentEvent["type"]>(
    type: E | "*",
    handler: (event: Extract<AgentEvent, { type: E }> | AgentEvent) => void,
  ): () => void;
}
