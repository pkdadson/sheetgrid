import { useCallback, useMemo, useState } from "react";
import type { SendOutput } from "@sheetgrid/agent";
import { mockSend } from "./adapters/mock.js";
import { makeAnthropicSend } from "./adapters/anthropic.js";
import { makeOpenAISend } from "./adapters/openai.js";
import { makeVercelAISend } from "./adapters/vercel.js";

export type ProviderId = "mock" | "anthropic" | "openai" | "vercel";

export interface ProviderConfig {
  provider: ProviderId;
  apiKey: string;
  model: string;
}

const DEFAULT_MODELS: Record<ProviderId, string> = {
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
      return makeVercelAISend({ apiKey: config.apiKey, model: config.model });
    }
    return mockSend;
  }, [config.provider, config.apiKey, config.model]);

  return { config, setConfig, send };
}

export { DEFAULT_MODELS };
