<script setup lang="ts">
import { ref, computed } from "vue";
import type { ProviderConfig, ProviderId } from "./composables/useProviderSend.js";

const props = defineProps<{
  config: ProviderConfig;
}>();

const emit = defineEmits<{
  change: [patch: Partial<ProviderConfig>];
}>();

const collapsed = ref<boolean>(true);

const statusLabel = computed(() => {
  if (props.config.provider === "mock") return "Mock (scripted responses)";
  if (props.config.provider === "openai-compatible") {
    const key = props.config.apiKey ? `••••${props.config.apiKey.slice(-4)}` : "missing";
    const url = props.config.baseURL || "(no url)";
    return `openai-compatible: ${props.config.model || "(no model)"} @ ${url} · key ${key}`;
  }
  const key = props.config.apiKey ? `••••${props.config.apiKey.slice(-4)}` : "missing";
  return `${props.config.provider}: ${props.config.model || "(no model)"} · key ${key}`;
});

function onProviderChange(e: Event) {
  emit("change", { provider: (e.target as HTMLSelectElement).value as ProviderId });
}
function onModelChange(e: Event) {
  emit("change", { model: (e.target as HTMLInputElement).value });
}
function onKeyChange(e: Event) {
  emit("change", { apiKey: (e.target as HTMLInputElement).value });
}
function onBaseURLChange(e: Event) {
  emit("change", { baseURL: (e.target as HTMLInputElement).value });
}
</script>

<template>
  <div v-if="collapsed" class="sg-provider-strip sg-provider-strip--collapsed">
    <span class="sg-provider-strip__label">Provider:</span>
    <strong class="sg-provider-strip__status">{{ statusLabel }}</strong>
    <button type="button" class="sg-provider-strip__toggle" @click="collapsed = false">
      Change
    </button>
  </div>
  <div v-else class="sg-provider-strip sg-provider-strip--expanded">
    <div class="sg-provider-strip__row">
      <label class="sg-provider-strip__field">
        Provider
        <select :value="config.provider" @change="onProviderChange">
          <option value="mock">Mock (scripted)</option>
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
          <option value="openai-compatible">OpenAI-compatible endpoint</option>
          <option value="gemini">Google Gemini</option>
          <option value="vercel">Vercel AI SDK</option>
        </select>
      </label>
      <label class="sg-provider-strip__field sg-provider-strip__field--grow">
        Model
        <input
          type="text"
          :value="config.model"
          @input="onModelChange"
          :placeholder="config.provider === 'mock' ? '(unused)' : 'model name'"
          :disabled="config.provider === 'mock'"
        />
      </label>
      <label v-if="config.provider === 'openai-compatible'" class="sg-provider-strip__field sg-provider-strip__field--grow-2">
        baseURL
        <input
          type="text"
          :value="config.baseURL ?? ''"
          @input="onBaseURLChange"
          placeholder="https://api.groq.com/openai/v1"
        />
      </label>
      <label class="sg-provider-strip__field sg-provider-strip__field--grow-2">
        API key
        <input
          type="password"
          :value="config.apiKey"
          @input="onKeyChange"
          :placeholder="config.provider === 'mock' ? '(unused)' : 'sk-...'"
          :disabled="config.provider === 'mock'"
          autocomplete="off"
        />
      </label>
      <button type="button" class="sg-provider-strip__done" @click="collapsed = true">
        Done
      </button>
    </div>
    <div v-if="config.provider !== 'mock'" class="sg-provider-strip__notice">
      🔒 <strong>Dev testing only.</strong> Your key stays in <code>sessionStorage</code>
      and is sent directly from your browser to the provider.
      <strong>Production apps must proxy through a backend</strong> — never ship a key in your bundle.
    </div>
  </div>
</template>

<style scoped>
.sg-provider-strip {
  padding: 12px;
  background: var(--sg-surface, #f3f4f6);
  border-radius: 6px;
  border: 1px solid var(--sg-border, #e5e7eb);
  font-size: 12px;
}

.sg-provider-strip--collapsed {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
}

.sg-provider-strip--expanded {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sg-provider-strip__label {
  color: var(--sg-muted, #6b7280);
}

.sg-provider-strip__status {
  font-family: ui-monospace, monospace;
}

.sg-provider-strip__toggle,
.sg-provider-strip__done {
  padding: 4px 10px;
  font-size: 12px;
  background: transparent;
  border: 1px solid var(--sg-border, #e5e7eb);
  border-radius: 4px;
  cursor: pointer;
}

.sg-provider-strip__toggle {
  margin-left: auto;
  padding: 2px 8px;
}

.sg-provider-strip__row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sg-provider-strip__field {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sg-provider-strip__field--grow {
  flex: 1;
}

.sg-provider-strip__field--grow-2 {
  flex: 2;
}

.sg-provider-strip__field select,
.sg-provider-strip__field input {
  padding: 4px 6px;
  font-size: 12px;
}

.sg-provider-strip__field--grow input,
.sg-provider-strip__field--grow-2 input {
  flex: 1;
}

.sg-provider-strip__notice {
  font-size: 11px;
  color: var(--sg-muted, #6b7280);
  line-height: 1.4;
}
</style>
