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

// Note: Vue's setup() runs once per component instance, so options passed to
// useAgent are frozen for that instance's lifetime. Consumers wanting a
// "swap LLM provider mid-session" flow should use a `key` prop on the component
// using useAgent to force remount, or wrap their `send` function in a stable
// wrapper that closes over reactive state (e.g. a computed that reads from
// reactive config).
//
// The ref pattern below is included for symmetry with the React implementation
// and for consumers who manually call updateOptions-style helpers. For most Vue
// use-cases, remounting via :key is the idiomatic solution.

export function useAgent(
  controller: GridController,
  options: Omit<AgentLoopOptions, "controller">,
): UseAgentResult {
  // Plain object refs — updated if the composable is somehow re-invoked (e.g.
  // via a wrapper utility). In the common Vue pattern (setup runs once), these
  // capture the values at setup time.
  const sendRef = { current: options.send };
  const onBeforeToolRef = { current: options.onBeforeTool };
  const onAfterToolRef = { current: options.onAfterTool };
  const onErrorRef = { current: options.onError };
  const systemPromptRef = { current: options.systemPrompt };

  const loop = createAgentLoop({
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
