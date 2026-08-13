import { useRef, useSyncExternalStore } from "react";
import {
  createAgentLoop,
  type AgentLoop,
  type AgentLoopOptions,
  type AgentState,
} from "@sheetgrid/agent";
import type { GridController } from "@sheetgrid/agent";

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
 * Create a memoized AgentLoop tied to the component's lifetime. Options are
 * consumed only on first call; subsequent renders return the same loop.
 */
export function useAgent(
  controller: GridController,
  options: Omit<AgentLoopOptions, "controller">,
): UseAgentResult {
  const loopRef = useRef<AgentLoop | null>(null);
  const snapshotRef = useRef<(() => AgentState) | null>(null);
  if (loopRef.current === null) {
    loopRef.current = createAgentLoop({ controller, ...options });
    snapshotRef.current = makeCachedSnapshot(loopRef.current);
  }
  const loop = loopRef.current;
  const getSnapshot = snapshotRef.current!;

  const state = useSyncExternalStore(
    loop.subscribe,
    getSnapshot,
    getSnapshot,
  );

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
