import type { AgentOp } from "./agent-op.js";

/**
 * Synchronous authorization callback. Return `true` to allow, or a string
 * (which becomes the OpResult message when the op is rejected).
 *
 * Sync only — async auth belongs at the SDK layer, not inside the controller.
 */
export type AuthorizeFn = (op: AgentOp) => true | string;
