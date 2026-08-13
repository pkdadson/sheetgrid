import { useState } from "react";
import type { ProviderConfig, ProviderId, VercelSubProvider } from "./useProviderSend.js";

interface ProviderConfigProps {
  config: ProviderConfig;
  onChange: (patch: Partial<ProviderConfig>) => void;
}

export function ProviderConfigStrip({ config, onChange }: ProviderConfigProps) {
  const [collapsed, setCollapsed] = useState<boolean>(true);

  const statusLabel =
    config.provider === "mock"
      ? "Mock (scripted responses)"
      : config.provider === "openai-compatible"
        ? `openai-compatible: ${config.model || "(no model)"} @ ${config.baseURL || "(no url)"} · key ${config.apiKey ? `••••${config.apiKey.slice(-4)}` : "missing"}`
        : config.provider === "vercel"
          ? `vercel (${config.vercelSubProvider ?? "openai"}): ${config.model || "(no model)"} · key ${config.apiKey ? `••••${config.apiKey.slice(-4)}` : "missing"}`
          : `${config.provider}: ${config.model || "(no model)"} · key ${config.apiKey ? `••••${config.apiKey.slice(-4)}` : "missing"}`;

  if (collapsed) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          fontSize: 12,
          background: "var(--sg-surface, #f3f4f6)",
          borderRadius: 6,
          border: "1px solid var(--sg-border, #e5e7eb)",
        }}
      >
        <span style={{ color: "var(--sg-muted, #6b7280)" }}>Provider:</span>
        <strong style={{ fontFamily: "ui-monospace, monospace" }}>{statusLabel}</strong>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          style={{
            marginLeft: "auto",
            padding: "2px 8px",
            fontSize: 12,
            background: "transparent",
            border: "1px solid var(--sg-border, #e5e7eb)",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 12,
        background: "var(--sg-surface, #f3f4f6)",
        borderRadius: 6,
        border: "1px solid var(--sg-border, #e5e7eb)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
          Provider
          <select
            value={config.provider}
            onChange={(e) => onChange({ provider: e.target.value as ProviderId })}
            style={{ padding: "4px 6px", fontSize: 12 }}
          >
            <option value="mock">Mock (scripted)</option>
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="openai-compatible">OpenAI-compatible endpoint</option>
            <option value="gemini">Google Gemini</option>
            <option value="vercel">Vercel AI SDK</option>
          </select>
        </label>
        <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
          Model
          <input
            type="text"
            value={config.model}
            onChange={(e) => onChange({ model: e.target.value })}
            placeholder={config.provider === "mock" ? "(unused)" : "model name"}
            disabled={config.provider === "mock"}
            style={{ padding: "4px 6px", fontSize: 12, flex: 1 }}
          />
        </label>
        {config.provider === "vercel" && (
          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
            Sub-provider
            <select
              value={config.vercelSubProvider ?? "openai"}
              onChange={(e) => onChange({ vercelSubProvider: e.target.value as VercelSubProvider })}
              style={{ padding: "4px 6px", fontSize: 12 }}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="mistral">Mistral</option>
              <option value="xai">xAI</option>
            </select>
          </label>
        )}
        {config.provider === "openai-compatible" && (
          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, flex: 2 }}>
            baseURL
            <input
              type="text"
              value={config.baseURL ?? ""}
              onChange={(e) => onChange({ baseURL: e.target.value })}
              placeholder="https://api.groq.com/openai/v1"
              style={{ padding: "4px 6px", fontSize: 12, flex: 1 }}
            />
          </label>
        )}
        <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, flex: 2 }}>
          API key
          <input
            type="password"
            value={config.apiKey}
            onChange={(e) => onChange({ apiKey: e.target.value })}
            placeholder={config.provider === "mock" ? "(unused)" : "sk-..."}
            disabled={config.provider === "mock"}
            autoComplete="off"
            style={{ padding: "4px 6px", fontSize: 12, flex: 1 }}
          />
        </label>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          style={{
            padding: "4px 10px",
            fontSize: 12,
            background: "transparent",
            border: "1px solid var(--sg-border, #e5e7eb)",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Done
        </button>
      </div>
      {config.provider !== "mock" && (
        <div style={{ fontSize: 11, color: "var(--sg-muted, #6b7280)", lineHeight: 1.4 }}>
          🔒 <strong>Dev testing only.</strong> Your key stays in <code>sessionStorage</code>{" "}
          and is sent directly from your browser to the provider.
          {" "}<strong>Production apps must proxy through a backend</strong> — never ship a key in
          your bundle.
        </div>
      )}
    </div>
  );
}
