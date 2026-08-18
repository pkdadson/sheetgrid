import type { SendOutput } from "@sheetgrid/agent";
import { computed, ref } from "vue";
import { makeAnthropicSend } from "../adapters/anthropic.js";
import { makeGeminiSend } from "../adapters/gemini.js";
import { mockSend } from "../adapters/mock.js";
import { makeOpenAICompatibleSend } from "../adapters/openai-compatible.js";
import { makeOpenAISend } from "../adapters/openai.js";
import { makeVercelAISend } from "../adapters/vercel.js";
import type { VercelSubProvider } from "../adapters/vercel.js";

export type ProviderId =
  | "mock"
  | "anthropic"
  | "openai"
  | "openai-compatible"
  | "gemini"
  | "vercel";
export type { VercelSubProvider };

export interface ProviderConfig {
  provider: ProviderId;
  apiKey: string;
  model: string;
  baseURL?: string;
  vercelSubProvider?: VercelSubProvider;
}

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  mock: "",
  anthropic: "claude-opus-4-7",
  openai: "gpt-4o",
  "openai-compatible": "gpt-4o",
  gemini: "gemini-2.0-flash",
  vercel: "gpt-4o",
};

export const DEFAULT_VERCEL_MODELS: Record<VercelSubProvider, string> = {
  openai: "gpt-4o",
  anthropic: "claude-opus-4-7",
  google: "gemini-2.0-flash",
  mistral: "mistral-large-latest",
  xai: "grok-2-latest",
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
      model: String(
        parsed.model ?? DEFAULT_MODELS[parsed.provider ?? "mock"] ?? "",
      ),
      baseURL: parsed.baseURL ? String(parsed.baseURL) : undefined,
      vercelSubProvider: parsed.vercelSubProvider as
        | VercelSubProvider
        | undefined,
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
    // Auto-fill model when provider changes and model isn't customized.
    if (
      next.provider !== undefined &&
      next.provider !== prev.provider &&
      (merged.model === "" || merged.model === DEFAULT_MODELS[prev.provider])
    ) {
      merged.model = DEFAULT_MODELS[merged.provider];
    }
    // Default vercelSubProvider when switching to vercel.
    if (next.provider === "vercel" && !merged.vercelSubProvider) {
      merged.vercelSubProvider = "openai";
      if (!merged.model) merged.model = DEFAULT_VERCEL_MODELS.openai;
    }
    // Auto-fill model when vercel + sub-provider changes.
    if (
      (next.provider === "vercel" && merged.vercelSubProvider) ||
      (next.vercelSubProvider !== undefined && merged.provider === "vercel")
    ) {
      const sub = merged.vercelSubProvider ?? "openai";
      const currentIsDefault =
        merged.model === "" ||
        Object.values(DEFAULT_VERCEL_MODELS).includes(merged.model);
      if (currentIsDefault) merged.model = DEFAULT_VERCEL_MODELS[sub];
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
      return makeVercelAISend({
        apiKey: c.apiKey,
        model: c.model,
        subProvider: c.vercelSubProvider ?? "openai",
      });
    }
    if (c.provider === "openai-compatible") {
      if (!c.baseURL) {
        return async (): Promise<SendOutput> => ({
          content: [
            {
              type: "text",
              text: "Missing baseURL for openai-compatible provider (e.g. https://api.groq.com/openai/v1). Fill it in above.",
            },
          ],
          stop_reason: "end_turn",
        });
      }
      return makeOpenAICompatibleSend({
        apiKey: c.apiKey,
        model: c.model,
        baseURL: c.baseURL,
      });
    }
    if (c.provider === "gemini") {
      return makeGeminiSend({ apiKey: c.apiKey, model: c.model });
    }
    return mockSend;
  });

  return { config, setConfig, send };
}
