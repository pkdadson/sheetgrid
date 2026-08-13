import type { SendInput, SendOutput } from "@sheetgrid/agent";

export function makeAnthropicSend(opts: { apiKey: string; model: string }) {
  return async (input: SendInput): Promise<SendOutput> => {
    // Dynamic import — SDK only loaded when this provider is selected.
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({
      apiKey: opts.apiKey,
      dangerouslyAllowBrowser: true, // Dev testing only — production apps proxy through a backend.
    });

    const anthropicMessages = input.messages.map((m) => {
      if (m.role === "user") return { role: "user" as const, content: m.content };
      if (m.role === "assistant") {
        return {
          role: "assistant" as const,
          content: m.content.map((b) => {
            if (b.type === "text") return { type: "text" as const, text: b.text };
            return {
              type: "tool_use" as const,
              id: b.id,
              name: b.name,
              input: b.input,
            };
          }),
        };
      }
      // tool role → Anthropic represents tool_results inside a user message
      return {
        role: "user" as const,
        content: m.content.map((r) => ({
          type: "tool_result" as const,
          tool_use_id: r.tool_use_id,
          content: JSON.stringify(r.output),
        })),
      };
    });

    const res = await client.messages.create(
      {
        model: opts.model,
        max_tokens: 1024,
        system: input.systemPrompt,
        tools: input.tools.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.input_schema as any,
        })),
        messages: anthropicMessages,
      },
      { signal: input.signal },
    );

    return {
      content: res.content.map((b) => {
        if (b.type === "text") return { type: "text" as const, text: b.text };
        return {
          type: "tool_use" as const,
          id: b.id,
          name: b.name,
          input: b.input,
        };
      }),
      stop_reason: res.stop_reason ?? "end_turn",
    };
  };
}
