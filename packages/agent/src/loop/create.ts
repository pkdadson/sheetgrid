import { describeGridTools } from "../tools/index.js";
import type { OpResult } from "../types/op-result.js";
import { defaultSystemPrompt } from "./system-prompt.js";
import type {
  AgentEvent,
  AgentLoop,
  AgentLoopOptions,
  AgentMessage,
  AgentState,
} from "./types.js";

const DEFAULT_MAX_HISTORY = 20;
const DEFAULT_MAX_ITERATIONS = 25;

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter++;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function createAgentLoop(opts: AgentLoopOptions): AgentLoop {
  const maxHistory = opts.maxHistory ?? DEFAULT_MAX_HISTORY;
  const promptFn = opts.systemPrompt ?? defaultSystemPrompt;

  let messages: AgentMessage[] = [];
  let thinking = false;
  let error: AgentState["error"] = null;
  let currentAbort: AbortController | null = null;

  const subscribers = new Set<() => void>();
  const eventListeners = new Map<string, Set<(e: AgentEvent) => void>>();
  const wildcardListeners = new Set<(e: AgentEvent) => void>();

  const notify = () => {
    for (const s of subscribers) s();
  };

  const emit = (event: AgentEvent) => {
    const typed = eventListeners.get(event.type);
    if (typed) {
      for (const h of typed) {
        try {
          h(event);
        } catch (err) {
          console.error(`AgentLoop: handler for "${event.type}" threw`, err);
        }
      }
    }
    for (const h of wildcardListeners) {
      try {
        h(event);
      } catch (err) {
        console.error(
          `AgentLoop: wildcard handler threw for "${event.type}"`,
          err,
        );
      }
    }
  };

  const trimHistory = () => {
    const turnCap = maxHistory * 2;
    if (messages.length > turnCap) {
      messages = messages.slice(messages.length - turnCap);
    }
  };

  const addMessage = (m: AgentMessage) => {
    messages = [...messages, m];
    trimHistory();
    emit({ type: "message.added", message: m });
    notify();
  };

  const setThinking = (v: boolean) => {
    if (thinking === v) return;
    thinking = v;
    notify();
  };

  const setError = (e: AgentState["error"]) => {
    error = e;
    notify();
  };

  const send: AgentLoop["send"] = async (userText) => {
    if (thinking) {
      throw new Error(
        "AgentLoop is busy — cancel or await the prior send first",
      );
    }
    setError(null);

    const userMsg: AgentMessage = {
      id: nextId("m"),
      role: "user",
      content: userText,
    };
    addMessage(userMsg);

    setThinking(true);
    currentAbort = new AbortController();
    const maxIter = opts.maxIterations ?? DEFAULT_MAX_ITERATIONS;

    try {
      for (let iter = 0; iter < maxIter; iter++) {
        const schema = opts.controller.getSchema();
        const systemPrompt = promptFn(schema);
        const tools = describeGridTools(opts.controller, opts.toolFilter);
        const output = await opts.send({
          messages,
          tools,
          signal: currentAbort.signal,
          systemPrompt,
        });

        // Append any assistant content (text + tool_use blocks) as one message.
        const assistantContent = output.content.map((b) => {
          if (b.type === "text") return { type: "text" as const, text: b.text };
          return {
            type: "tool_use" as const,
            id: b.id,
            name: b.name,
            input: b.input,
          };
        });
        if (assistantContent.length > 0) {
          addMessage({
            id: nextId("m"),
            role: "assistant",
            content: assistantContent,
          });
        }

        // Collect tool_use blocks; execute in declaration order.
        const toolUses = output.content.filter(
          (b): b is Extract<typeof b, { type: "tool_use" }> =>
            b.type === "tool_use",
        );

        if (toolUses.length === 0 || output.stop_reason !== "tool_use") {
          emit({ type: "done" });
          return;
        }

        const toolResults = [];
        for (const use of toolUses) {
          const call = { id: use.id, name: use.name, input: use.input };
          emit({ type: "tool.called", call });

          // Interceptor: onBeforeTool.
          if (opts.onBeforeTool) {
            let allowed = false;
            let denyReason = "denied by onBeforeTool";
            try {
              const decision = await opts.onBeforeTool(call);
              allowed = decision !== false;
              if (!allowed) denyReason = "denied by onBeforeTool";
            } catch (err) {
              allowed = false;
              denyReason = err instanceof Error ? err.message : String(err);
            }
            if (!allowed) {
              const denyResult = {
                ok: false as const,
                code: "read_only" as const,
                message: denyReason,
              };
              toolResults.push({
                type: "tool_result" as const,
                tool_use_id: use.id,
                output: denyResult,
              });
              emit({ type: "tool.denied", call, reason: denyReason });
              continue;
            }
          }

          // Execute.
          const tool = tools.find((t) => t.name === call.name);
          let result: OpResult<unknown>;
          if (!tool) {
            result = {
              ok: false as const,
              code: "not_found" as const,
              message: `unknown tool "${call.name}"`,
            };
          } else {
            try {
              result = await tool.execute(call.input);
            } catch (err) {
              result = {
                ok: false as const,
                code: "internal" as const,
                message: err instanceof Error ? err.message : String(err),
              };
            }
          }
          toolResults.push({
            type: "tool_result" as const,
            tool_use_id: use.id,
            output: result,
          });

          // Interceptor: onAfterTool.
          if (opts.onAfterTool) {
            try {
              await opts.onAfterTool(call, result);
            } catch (err) {
              console.error("AgentLoop: onAfterTool threw", err);
            }
          }

          emit({ type: "tool.result", call, result });
        }

        addMessage({
          id: nextId("m"),
          role: "tool",
          content: toolResults,
        });
        // Loop back — the assistant sees the tool_results and continues.
      }

      // Iteration cap exceeded.
      const wrapped = {
        code: "loop_limit" as const,
        message: `agent loop exceeded ${maxIter} iterations`,
      };
      opts.onError?.(wrapped);
      setError(wrapped);
      emit({ type: "error", error: wrapped });
    } catch (err) {
      const wrapped = {
        code: "llm_error" as const,
        message: err instanceof Error ? err.message : String(err),
        cause: err,
      };
      opts.onError?.(wrapped);
      setError(wrapped);
      emit({ type: "error", error: wrapped });
    } finally {
      currentAbort = null;
      setThinking(false);
    }
  };

  const cancel: AgentLoop["cancel"] = () => {
    if (!currentAbort) return;
    currentAbort.abort();
    emit({ type: "cancelled" });
  };

  const reset: AgentLoop["reset"] = () => {
    messages = [];
    error = null;
    notify();
  };

  const getState: AgentLoop["getState"] = () => ({ messages, thinking, error });

  const subscribe: AgentLoop["subscribe"] = (listener) => {
    subscribers.add(listener);
    return () => subscribers.delete(listener);
  };

  const on: AgentLoop["on"] = (type, handler) => {
    if (type === "*") {
      wildcardListeners.add(handler as (e: AgentEvent) => void);
      return () => wildcardListeners.delete(handler as (e: AgentEvent) => void);
    }
    const set = eventListeners.get(type) ?? new Set();
    if (!eventListeners.has(type)) eventListeners.set(type, set);
    set.add(handler as (e: AgentEvent) => void);
    return () => set.delete(handler as (e: AgentEvent) => void);
  };

  return { send, cancel, reset, getState, subscribe, on };
}
