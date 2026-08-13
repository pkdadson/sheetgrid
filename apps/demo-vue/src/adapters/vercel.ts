import type { SendInput, SendOutput } from "@sheetgrid/agent";

export type VercelSubProvider = "openai" | "anthropic" | "google" | "mistral" | "xai";

/**
 * Vercel AI SDK adapter with sub-provider selection. Dynamically imports
 * @ai-sdk/{provider} so only the picked provider's code ends up in the bundle.
 */
export function makeVercelAISend(opts: {
  apiKey: string;
  model: string;
  subProvider: VercelSubProvider;
}) {
  return async (input: SendInput): Promise<SendOutput> => {
    const { generateText, tool } = await import("ai");

    // Dynamic import per sub-provider.
    let model: any;
    if (opts.subProvider === "openai") {
      const { createOpenAI } = await import("@ai-sdk/openai");
      model = createOpenAI({ apiKey: opts.apiKey })(opts.model);
    } else if (opts.subProvider === "anthropic") {
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      model = createAnthropic({ apiKey: opts.apiKey })(opts.model);
    } else if (opts.subProvider === "google") {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      model = createGoogleGenerativeAI({ apiKey: opts.apiKey })(opts.model);
    } else if (opts.subProvider === "mistral") {
      const { createMistral } = await import("@ai-sdk/mistral");
      model = createMistral({ apiKey: opts.apiKey })(opts.model);
    } else if (opts.subProvider === "xai") {
      const { createXai } = await import("@ai-sdk/xai");
      model = createXai({ apiKey: opts.apiKey })(opts.model);
    } else {
      throw new Error(`Unknown Vercel sub-provider: ${opts.subProvider}`);
    }

    // Build Vercel tools map from our descriptors.
    const tools: Record<string, unknown> = {};
    for (const t of input.tools) {
      tools[t.name] = tool({
        description: t.description,
        parameters: t.input_schema as any,
        execute: async () => {
          throw new Error("unreachable — loop owns execution");
        },
      });
    }

    // Convert messages to Vercel's shape.
    const messages: any[] = [
      { role: "system", content: input.systemPrompt },
    ];
    for (const m of input.messages) {
      if (m.role === "user") {
        messages.push({ role: "user", content: m.content });
      } else if (m.role === "assistant") {
        messages.push({ role: "assistant", content: m.content });
      } else {
        for (const r of m.content) {
          messages.push({
            role: "tool",
            content: [
              {
                type: "tool-result",
                toolCallId: r.tool_use_id,
                toolName: "",
                result: r.output,
              },
            ],
          });
        }
      }
    }

    const res = await generateText({
      model,
      messages: messages as any,
      tools: tools as any,
      abortSignal: input.signal,
    });

    const content: SendOutput["content"] = [];
    if (res.text) content.push({ type: "text", text: res.text });
    for (const tc of res.toolCalls ?? []) {
      content.push({
        type: "tool_use",
        id: tc.toolCallId,
        name: tc.toolName,
        input: tc.args,
      });
    }
    const stopReason = (res.toolCalls?.length ?? 0) > 0 ? "tool_use" : "end_turn";
    return { content, stop_reason: stopReason };
  };
}
