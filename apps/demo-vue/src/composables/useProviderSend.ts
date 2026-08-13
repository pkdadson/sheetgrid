import { computed, ref } from "vue";
import type { SendOutput } from "@sheetgrid/agent";
import { mockSend } from "../adapters/mock.js";
import { makeAnthropicSend } from "../adapters/anthropic.js";
import { makeOpenAISend } from "../adapters/openai.js";
import { makeVercelAISend } from "../adapters/vercel.js";

export type ProviderId = "mock" | "anthropic" | "openai" | "vercel";

export interface ProviderConfig {
  provider: ProviderId;
  apiKey: string;
  model: string;
}

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  mock: "",
  anthropic: "claude-opus-4-7",
  openai: "gpt-4o",
  vercel: "gpt-4o",
};

const STORAGE_KEY = "sheetgrid-demo-provider-config";

function readConfig(): ProviderConfig {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { provider: "mock", apiKey: "", model: "" };
    const parsed = JSON.parse(raw);
    return {
      provider: (parsed.provider ?? "mock") as ProviderId,
      apiKey: String(parsed.apiKey ?? ""),
      model: String(parsed.model ?? DEFAULT_MODELS[parsed.provider ?? "mock"] ?? ""),
    };
  } catch {
    return { provider: "mock", apiKey: "", model: "" };
  }
}

function writeConfig(cfg: ProviderConfig): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export function useProviderSend() {
  const config = ref<ProviderConfig>(readConfig());

  function setConfig(next: Partial<ProviderConfig>) {
    const prev = config.value;
    const merged = { ...prev, ...next };
    if (
      next.provider !== undefined &&
      next.provider !== prev.provider &&
      (merged.model === "" || merged.model === DEFAULT_MODELS[prev.provider])
    ) {
      merged.model = DEFAULT_MODELS[merged.provider];
    }
    config.value = merged;
    writeConfig(merged);
  }

  const send = computed(() => {
    const c = config.value;
    if (c.provider === "mock") return mockSend;
    if (!c.apiKey) {
      return async (): Promise<SendOutput> => ({
        content: [
          {
            type: "text",
            text: `Missing API key for ${c.provider}. Paste your key in the config strip above, or switch to Mock provider.`,
          },
        ],
        stop_reason: "end_turn",
      });
    }
    if (c.provider === "anthropic") {
      return makeAnthropicSend({ apiKey: c.apiKey, model: c.model });
    }
    if (c.provider === "openai") {
      return makeOpenAISend({ apiKey: c.apiKey, model: c.model });
    }
    if (c.provider === "vercel") {
      return makeVercelAISend({ apiKey: c.apiKey, model: c.model });
    }
    return mockSend;
  });

  return { config, setConfig, send };
}
