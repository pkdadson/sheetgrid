<script setup lang="ts">
import "./AgentChat.css";
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
