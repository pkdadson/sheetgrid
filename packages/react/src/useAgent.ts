import {
  type AgentLoop,
  type AgentLoopOptions,
  type AgentState,
  createAgentLoop,
} from "@sheetgrid/agent";
import type { GridController } from "@sheetgrid/agent";
import { useRef, useSyncExternalStore } from "react";

export interface UseAgentResult extends AgentState {
  send: AgentLoop["send"];
  cancel: AgentLoop["cancel"];
  reset: AgentLoop["reset"];
  on: AgentLoop["on"];
}

/**
 * Wrap loop.getState so that useSyncExternalStore receives a stable reference
 * when nothing has changed. The loop creates a fresh object on every getState
 * call, which would cause React's infinite-loop guard to fire.
 */
function makeCachedSnapshot(loop: AgentLoop): () => AgentState {
  let cached: AgentState | null = null;
  return () => {
    const next = loop.getState();
    if (
      cached !== null &&
      cached.messages === next.messages &&
      cached.thinking === next.thinking &&
      cached.error === next.error
    ) {
      return cached;
    }
    cached = next;
    return cached;
  };
}

/**
 * Create a memoized AgentLoop tied to the component's lifetime.
 *
 * Mutable callback options (send, onBeforeTool, onAfterTool, onError,
 * systemPrompt) are stored in refs and read on every invocation, so consumers
 * can swap them between renders (e.g. changing AI provider) without remounting.
 *
 * Non-callback options (controller, maxHistory, toolFilter, maxIterations) are
 * consumed only on first render — changing them requires a new component
 * instance (use a key prop).
 */
export function useAgent(
  controller: GridController,
  options: Omit<AgentLoopOptions, "controller">,
): UseAgentResult {
  // Refs for mutable callbacks — updated on every render so wrappers below
  // always invoke whatever the consumer passed most recently.
  const sendRef = useRef(options.send);
  const onBeforeToolRef = useRef(options.onBeforeTool);
  const onAfterToolRef = useRef(options.onAfterTool);
  const onErrorRef = useRef(options.onError);
  const systemPromptRef = useRef(options.systemPrompt);

  sendRef.current = options.send;
  onBeforeToolRef.current = options.onBeforeTool;
  onAfterToolRef.current = options.onAfterTool;
  onErrorRef.current = options.onError;
  systemPromptRef.current = options.systemPrompt;

  const loopRef = useRef<AgentLoop | null>(null);
  const snapshotRef = useRef<(() => AgentState) | null>(null);
  if (loopRef.current === null) {
    loopRef.current = createAgentLoop({
      controller,
      // Stable wrappers that delegate to the latest ref values.
      send: (input) => sendRef.current(input),
      onBeforeTool: (call) => onBeforeToolRef.current?.(call) ?? true,
      onAfterTool: (call, result) => onAfterToolRef.current?.(call, result),
      onError: (err) => onErrorRef.current?.(err),
      systemPrompt: systemPromptRef.current
        ? (schema) =>
            systemPromptRef.current ? systemPromptRef.current(schema) : ""
        : undefined,
      // First-render-only options — captured once.
      maxHistory: options.maxHistory,
      toolFilter: options.toolFilter,
      maxIterations: options.maxIterations,
    });
    snapshotRef.current = makeCachedSnapshot(loopRef.current);
  }
  const loop = loopRef.current;
  const getSnapshot = snapshotRef.current!;

  const state = useSyncExternalStore(loop.subscribe, getSnapshot, getSnapshot);

  return {
    messages: state.messages,
    thinking: state.thinking,
    error: state.error,
    send: loop.send,
    cancel: loop.cancel,
    reset: loop.reset,
    on: loop.on,
  };
}
