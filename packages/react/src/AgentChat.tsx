import type {
  AgentError,
  AgentLoopOptions,
  AgentMessage,
  GridController,
  ToolCall,
} from "@sheetgrid/agent";
import type { OpResult } from "@sheetgrid/agent";
import { type CSSProperties, type ReactNode, useState } from "react";
import { useAgent } from "./useAgent.js";
import "./AgentChat.css";

export interface AgentChatProps {
  controller: GridController;
  send: AgentLoopOptions["send"];

  // Passthrough to useAgent
  onBeforeTool?: AgentLoopOptions["onBeforeTool"];
  onAfterTool?: AgentLoopOptions["onAfterTool"];
  maxHistory?: AgentLoopOptions["maxHistory"];
  toolFilter?: AgentLoopOptions["toolFilter"];
  systemPrompt?: AgentLoopOptions["systemPrompt"];
  maxIterations?: AgentLoopOptions["maxIterations"];

  // Styling
  className?: string;
  style?: CSSProperties;

  // Render-prop slots
  renderMessage?: (msg: AgentMessage) => ReactNode;
  renderToolTrace?: (call: ToolCall, result?: OpResult<unknown>) => ReactNode;
  renderInput?: (ctx: {
    send: (text: string) => void;
    thinking: boolean;
    cancel: () => void;
  }) => ReactNode;
  renderError?: (err: AgentError) => ReactNode;
  renderThinking?: () => ReactNode;

  // Event callbacks
  onSend?: (text: string) => void;
  onToolCall?: (call: ToolCall) => void;
  onDone?: () => void;
  onError?: (err: AgentError) => void;

  // Copy
  placeholder?: string;
  emptyState?: ReactNode;
}

function defaultRenderMessage(msg: AgentMessage): ReactNode {
  if (msg.role === "user") {
    return (
      <div key={msg.id} className="sg-agent-chat__msg sg-agent-chat__msg--user">
        {msg.content}
      </div>
    );
  }
  if (msg.role === "assistant") {
    return (
      <div
        key={msg.id}
        className="sg-agent-chat__msg sg-agent-chat__msg--assistant"
      >
        {msg.content.map((b, i) => {
          if (b.type === "text") return <span key={i}>{b.text}</span>;
          return (
            <div key={i} className="sg-agent-chat__tool">
              → {b.name}({JSON.stringify(b.input)})
            </div>
          );
        })}
      </div>
    );
  }
  // tool role
  return (
    <div key={msg.id} className="sg-agent-chat__tool">
      {msg.content.map((r, i) => (
        <div key={i}>
          ← {r.output.ok ? "ok" : `${r.output.code}: ${r.output.message}`}
        </div>
      ))}
    </div>
  );
}

export function AgentChat(props: AgentChatProps): JSX.Element {
  const {
    controller,
    send,
    onBeforeTool,
    onAfterTool,
    maxHistory,
    toolFilter,
    systemPrompt,
    maxIterations,
    className,
    style,
    renderMessage,
    renderInput,
    renderError,
    renderThinking,
    onSend,
    onToolCall,
    onDone,
    onError,
    placeholder = "Ask...",
    emptyState,
  } = props;

  const agent = useAgent(controller, {
    send,
    onBeforeTool,
    onAfterTool,
    maxHistory,
    toolFilter,
    systemPrompt,
    maxIterations,
    onError: (err) => {
      onError?.(err);
    },
  });

  const [text, setText] = useState("");

  // Wire event callbacks lazily on first render.
  const [wired, setWired] = useState(false);
  if (!wired) {
    if (onToolCall)
      agent.on(
        "tool.called",
        (e) => e.type === "tool.called" && onToolCall(e.call),
      );
    if (onDone) agent.on("done", () => onDone());
    setWired(true);
  }

  const doSend = (v: string) => {
    const clean = v.trim();
    if (!clean || agent.thinking) return;
    onSend?.(clean);
    setText("");
    void agent.send(clean);
  };

  return (
    <div
      className={`sg-agent-chat${className ? ` ${className}` : ""}`}
      style={style}
      role="log"
      aria-live="polite"
    >
      <div className="sg-agent-chat__transcript">
        {agent.messages.length === 0 && emptyState}
        {agent.messages.map((m) => (renderMessage ?? defaultRenderMessage)(m))}
        {agent.thinking &&
          (renderThinking ? (
            renderThinking()
          ) : (
            <div className="sg-agent-chat__thinking">thinking…</div>
          ))}
        {agent.error &&
          (renderError ? (
            renderError(agent.error)
          ) : (
            <div className="sg-agent-chat__error">
              {agent.error.code}: {agent.error.message}
            </div>
          ))}
      </div>
      {renderInput ? (
        renderInput({
          send: doSend,
          thinking: agent.thinking,
          cancel: agent.cancel,
        })
      ) : (
        <form
          className="sg-agent-chat__input"
          onSubmit={(e) => {
            e.preventDefault();
            doSend(text);
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                doSend(text);
              }
            }}
          />
          <button
            type="submit"
            disabled={agent.thinking || text.trim().length === 0}
          >
            Send
          </button>
          {agent.thinking && (
            <button type="button" onClick={agent.cancel}>
              Cancel
            </button>
          )}
        </form>
      )}
    </div>
  );
}
