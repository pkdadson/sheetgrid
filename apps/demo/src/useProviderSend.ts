import type { SendOutput } from "@sheetgrid/agent";
import { useCallback, useMemo, useState } from "react";
import { makeAnthropicSend } from "./adapters/anthropic.js";
import { makeGeminiSend } from "./adapters/gemini.js";
import { mockSend } from "./adapters/mock.js";
import { makeOpenAICompatibleSend } from "./adapters/openai-compatible.js";
import { makeOpenAISend } from "./adapters/openai.js";
import { makeVercelAISend } from "./adapters/vercel.js";
import type { VercelSubProvider } from "./adapters/vercel.js";

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

const DEFAULT_MODELS: Record<ProviderId, string> = {
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
  const [config, setConfigState] = useState<ProviderConfig>(() => readConfig());

  const setConfig = useCallback((next: Partial<ProviderConfig>) => {
    setConfigState((prev) => {
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
      writeConfig(merged);
      return merged;
    });
  }, []);

  const send = useMemo(() => {
    if (config.provider === "mock") return mockSend;
    if (!config.apiKey) {
      // No key → return a helpful mock that reminds the dev to add one.
      return async (): Promise<SendOutput> => ({
        content: [
          {
            type: "text",
            text: `Missing API key for ${config.provider}. Paste your key in the config strip above, or switch to Mock provider.`,
          },
        ],
        stop_reason: "end_turn",
      });
    }
    if (config.provider === "anthropic") {
      return makeAnthropicSend({ apiKey: config.apiKey, model: config.model });
    }
    if (config.provider === "openai") {
      return makeOpenAISend({ apiKey: config.apiKey, model: config.model });
    }
    if (config.provider === "vercel") {
      return makeVercelAISend({
        apiKey: config.apiKey,
        model: config.model,
        subProvider: config.vercelSubProvider ?? "openai",
      });
    }
    if (config.provider === "openai-compatible") {
      if (!config.baseURL) {
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
        apiKey: config.apiKey,
        model: config.model,
        baseURL: config.baseURL,
      });
    }
    if (config.provider === "gemini") {
      return makeGeminiSend({ apiKey: config.apiKey, model: config.model });
    }
    return mockSend;
  }, [
    config.provider,
    config.apiKey,
    config.model,
    config.baseURL,
    config.vercelSubProvider,
  ]);

  return { config, setConfig, send };
}

export { DEFAULT_MODELS };
