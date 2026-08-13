import { describeGridTools } from "../tools/index.js";
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
        console.error(`AgentLoop: wildcard handler threw for "${event.type}"`, err);
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
      throw new Error("AgentLoop is busy — cancel or await the prior send first");
    }
    setError(null);

    const userMsg: AgentMessage = { id: nextId("m"), role: "user", content: userText };
    addMessage(userMsg);

    setThinking(true);
    currentAbort = new AbortController();
    try {
      const schema = opts.controller.getSchema();
      const systemPrompt = promptFn(schema);
      const tools = describeGridTools(opts.controller, opts.toolFilter);
      const output = await opts.send({
        messages,
        tools,
        signal: currentAbort.signal,
        systemPrompt,
      });

      // Text-only path — Task 4 extends this with tool_use handling.
      const textBlocks = output.content.filter((b) => b.type === "text");
      if (textBlocks.length > 0) {
        addMessage({
          id: nextId("m"),
          role: "assistant",
          content: textBlocks.map((b) => ({ type: "text", text: b.type === "text" ? b.text : "" })),
        });
      }
      emit({ type: "done" });
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
