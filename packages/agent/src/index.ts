// Runtime (M4/M5)
export {
  createGridController,
  type CreateGridControllerOptions,
} from "./controller/create.js";

// Types
export type { OpResult, OpErrorCode } from "./types/op-result.js";
export { ok, fail } from "./types/op-result.js";
export type { AgentOp } from "./types/agent-op.js";
export type { WhereClause } from "./types/where-clause.js";
export type { Snapshot } from "./types/snapshot.js";
export type {
  GridEvent,
  EventSource,
  SelectionChangedEvent,
  TransactionEvent,
  LifecycleEvent,
  HistoryEvent,
} from "./types/grid-event.js";
export type { AuthorizeFn } from "./types/authorize.js";
export type {
  GridController,
  GridSchema,
  Unsubscribe,
} from "./types/controller.js";

// Tools / describe API
export { describeGridTools } from "./tools/index.js";
export type { ToolDescriptor, DescribeToolsOptions } from "./tools/index.js";
export type { JSONSchema } from "./tools/json-schema.js";

// AgentChat loop (framework-agnostic)
export { createAgentLoop } from "./loop/create.js";
export { defaultSystemPrompt } from "./loop/system-prompt.js";
export type {
  AgentMessage,
  ToolCall,
  AgentError,
  AgentEvent,
  AgentState,
  SendInput,
  SendOutput,
  AgentLoopOptions,
  AgentLoop,
} from "./loop/types.js";
