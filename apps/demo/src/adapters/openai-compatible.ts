import type { SendInput, SendOutput } from "@sheetgrid/agent";

/**
 * OpenAI-compatible endpoint adapter. Reuses the `openai` SDK with a custom
 * `baseURL`. Unlocks xAI Grok, Groq, DeepSeek, Together, Fireworks, Ollama,
 * LM Studio, LiteLLM, and any other provider that exposes an OpenAI-shaped
 * /v1/chat/completions endpoint with function calling.
 */
export function makeOpenAICompatibleSend(opts: {
  apiKey: string;
  model: string;
  baseURL: string;
}) {
  return async (input: SendInput): Promise<SendOutput> => {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({
      apiKey: opts.apiKey,
      baseURL: opts.baseURL,
      dangerouslyAllowBrowser: true,
    });

    const openaiMessages: any[] = [
      { role: "system", content: input.systemPrompt },
    ];
    for (const m of input.messages) {
      if (m.role === "user") {
        openaiMessages.push({ role: "user", content: m.content });
      } else if (m.role === "assistant") {
        const textParts = m.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { type: "text"; text: string }).text)
          .join("");
        const toolCalls = m.content
          .filter((b) => b.type === "tool_use")
          .map((b) => {
            const tu = b as { type: "tool_use"; id: string; name: string; input: unknown };
            return {
              id: tu.id,
              type: "function" as const,
              function: {
                name: tu.name,
                arguments: JSON.stringify(tu.input),
              },
            };
          });
        openaiMessages.push({
          role: "assistant",
          content: textParts || null,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        });
      } else {
        for (const r of m.content) {
          openaiMessages.push({
            role: "tool",
            tool_call_id: r.tool_use_id,
            content: JSON.stringify(r.output),
          });
        }
      }
    }

    const res = await client.chat.completions.create(
      {
        model: opts.model,
        messages: openaiMessages,
        tools: input.tools.map((t) => ({
          type: "function" as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.input_schema as any,
          },
        })),
      },
      { signal: input.signal },
    );

    const choice = res.choices[0]!;
    const content: SendOutput["content"] = [];
    if (choice.message.content) {
      content.push({ type: "text", text: choice.message.content });
    }
    for (const tc of choice.message.tool_calls ?? []) {
      if (tc.type !== "function") continue;
      content.push({
        type: "tool_use",
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments || "{}"),
      });
    }
    const stopReason = choice.finish_reason === "tool_calls" ? "tool_use" : "end_turn";
    return { content, stop_reason: stopReason };
  };
}
