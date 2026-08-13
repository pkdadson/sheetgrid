import { onScopeDispose, shallowRef, triggerRef, type ShallowRef } from "vue";
import {
  createAgentLoop,
  type AgentLoop,
  type AgentLoopOptions,
  type AgentState,
  type GridController,
} from "@sheetgrid/agent";

export interface UseAgentResult {
  state: ShallowRef<AgentState>;
  send: AgentLoop["send"];
  cancel: AgentLoop["cancel"];
  reset: AgentLoop["reset"];
  on: AgentLoop["on"];
}

export function useAgent(
  controller: GridController,
  options: Omit<AgentLoopOptions, "controller">,
): UseAgentResult {
  const loop = createAgentLoop({ controller, ...options });
  const state = shallowRef<AgentState>(loop.getState());
  const unsub = loop.subscribe(() => {
    state.value = loop.getState();
    triggerRef(state);
  });

  const result: UseAgentResult = {
    state,
    send: loop.send,
    cancel: loop.cancel,
    reset: loop.reset,
    on: loop.on,
  };

  onScopeDispose(() => {
    try {
      result.cancel();
    } catch {
      // ignore
    }
    unsub();
  });

  return result;
}
