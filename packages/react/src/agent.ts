/**
 * Agent-dependent API, published as the `@sheetgrid/react/agent` subpath.
 *
 * Everything here requires the optional `@sheetgrid/agent` peer at runtime.
 * It lives in its own entry so the main `@sheetgrid/react` entry never
 * imports the peer: consumers that only render <Grid> can omit
 * `@sheetgrid/agent` entirely and their bundler will not try to resolve it.
 */
export { useGridController } from "./useGridController.js";
export { useAgent } from "./useAgent.js";
export type { UseAgentResult } from "./useAgent.js";
export { AgentChat } from "./AgentChat.js";
export type { AgentChatProps } from "./AgentChat.js";
