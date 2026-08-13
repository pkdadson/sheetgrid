<script setup lang="ts">
import { ref } from "vue";
import type {
  AgentError,
  AgentLoopOptions,
  AgentMessage,
  GridController,
  OpResult,
  ToolCall,
} from "@sheetgrid/agent";
import { useAgent } from "./composables/useAgent.js";

const props = defineProps<{
  controller: GridController;
  send: AgentLoopOptions["send"];
  onBeforeTool?: AgentLoopOptions["onBeforeTool"];
  onAfterTool?: AgentLoopOptions["onAfterTool"];
  maxHistory?: AgentLoopOptions["maxHistory"];
  toolFilter?: AgentLoopOptions["toolFilter"];
  systemPrompt?: AgentLoopOptions["systemPrompt"];
  maxIterations?: AgentLoopOptions["maxIterations"];
  placeholder?: string;
}>();

const emit = defineEmits<{
  send: [text: string];
  "tool-call": [call: ToolCall];
  done: [];
  error: [error: AgentError];
}>();

defineSlots<{
  message?(props: { message: AgentMessage }): unknown;
  toolTrace?(props: { call: ToolCall; result?: OpResult<unknown> }): unknown;
  input?(props: {
    send: (text: string) => void;
    thinking: boolean;
    cancel: () => void;
  }): unknown;
  error?(props: { error: AgentError }): unknown;
  thinking?(): unknown;
  empty?(): unknown;
}>();

const agent = useAgent(props.controller, {
  send: props.send,
  onBeforeTool: props.onBeforeTool,
  onAfterTool: props.onAfterTool,
  maxHistory: props.maxHistory,
  toolFilter: props.toolFilter,
  systemPrompt: props.systemPrompt,
  maxIterations: props.maxIterations,
  onError: (err) => emit("error", err),
});

agent.on("tool.called", (e) => {
  if (e.type === "tool.called") emit("tool-call", e.call);
});
agent.on("done", () => emit("done"));

const text = ref("");

function doSend(v: string) {
  const clean = v.trim();
  if (!clean || agent.state.value.thinking) return;
  emit("send", clean);
  text.value = "";
  void agent.send(clean);
}

function onSubmit(e: Event) {
  e.preventDefault();
  doSend(text.value);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    doSend(text.value);
  }
}
</script>

<template>
  <div class="sg-agent-chat" role="log" aria-live="polite">
    <div class="sg-agent-chat__transcript">
      <slot v-if="agent.state.value.messages.length === 0" name="empty" />
      <template v-for="m in agent.state.value.messages" :key="m.id">
        <slot name="message" :message="m">
          <div
            v-if="m.role === 'user'"
            class="sg-agent-chat__msg sg-agent-chat__msg--user"
          >{{ m.content }}</div>
          <div
            v-else-if="m.role === 'assistant'"
            class="sg-agent-chat__msg sg-agent-chat__msg--assistant"
          >
            <template v-for="(b, i) in m.content" :key="i">
              <span v-if="b.type === 'text'">{{ b.text }}</span>
              <div v-else class="sg-agent-chat__tool">
                → {{ b.name }}({{ JSON.stringify(b.input) }})
              </div>
            </template>
          </div>
          <div v-else class="sg-agent-chat__tool">
            <div v-for="(r, i) in m.content" :key="i">
              ← {{ r.output.ok ? "ok" : r.output.code + ": " + r.output.message }}
            </div>
          </div>
        </slot>
      </template>
      <slot v-if="agent.state.value.thinking" name="thinking">
        <div class="sg-agent-chat__thinking">thinking…</div>
      </slot>
      <template v-if="agent.state.value.error">
        <slot name="error" :error="agent.state.value.error">
          <div class="sg-agent-chat__error">
            {{ agent.state.value.error.code }}: {{ agent.state.value.error.message }}
          </div>
        </slot>
      </template>
    </div>
    <slot
      name="input"
      :send="doSend"
      :thinking="agent.state.value.thinking"
      :cancel="agent.cancel"
    >
      <form class="sg-agent-chat__input" @submit="onSubmit">
        <textarea
          v-model="text"
          :placeholder="placeholder ?? 'Ask...'"
          @keydown="onKeydown"
        />
        <button
          type="submit"
          :disabled="agent.state.value.thinking || text.trim().length === 0"
        >Send</button>
        <button
          v-if="agent.state.value.thinking"
          type="button"
          @click="agent.cancel"
        >Cancel</button>
      </form>
    </slot>
  </div>
</template>

<style>
.sg-agent-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--sg-bg, #fff);
  color: var(--sg-text, #111);
  font: inherit;
}
.sg-agent-chat__transcript {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sg-agent-chat__msg {
  padding: 8px 12px;
  border-radius: 8px;
  max-width: 80%;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.sg-agent-chat__msg--user {
  align-self: flex-end;
  background: var(--sg-accent, #3b82f6);
  color: #fff;
}
.sg-agent-chat__msg--assistant {
  align-self: flex-start;
  background: var(--sg-surface, #f3f4f6);
}
.sg-agent-chat__tool {
  align-self: flex-start;
  font-size: 12px;
  color: var(--sg-muted, #6b7280);
  font-family: ui-monospace, monospace;
  padding: 4px 8px;
  background: transparent;
  border-left: 2px solid var(--sg-border, #e5e7eb);
}
.sg-agent-chat__error {
  align-self: stretch;
  padding: 8px 12px;
  background: var(--sg-error-bg, #fee2e2);
  color: var(--sg-error-text, #991b1b);
  border-radius: 8px;
  font-size: 13px;
}
.sg-agent-chat__thinking {
  align-self: flex-start;
  font-size: 12px;
  color: var(--sg-muted, #6b7280);
  font-style: italic;
}
.sg-agent-chat__input {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--sg-border, #e5e7eb);
}
.sg-agent-chat__input textarea {
  flex: 1;
  resize: none;
  min-height: 36px;
  max-height: 120px;
  padding: 8px;
  border: 1px solid var(--sg-border, #e5e7eb);
  border-radius: 6px;
  font: inherit;
  background: var(--sg-bg, #fff);
  color: var(--sg-text, #111);
}
.sg-agent-chat__input button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: var(--sg-accent, #3b82f6);
  color: #fff;
  font: inherit;
  cursor: pointer;
}
.sg-agent-chat__input button[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
