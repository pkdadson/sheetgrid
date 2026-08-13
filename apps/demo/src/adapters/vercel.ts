import type { SendInput, SendOutput } from "@sheetgrid/agent";

export function makeVercelAISend(opts: { apiKey: string; model: string }) {
  return async (input: SendInput): Promise<SendOutput> => {
    const [{ generateText, tool }, { createOpenAI }] = await Promise.all([
      import("ai"),
      import("@ai-sdk/openai"),
    ]);

    const openai = createOpenAI({ apiKey: opts.apiKey });

    // Build Vercel tools map from our descriptors.
    const tools: Record<string, unknown> = {};
    for (const t of input.tools) {
      tools[t.name] = tool({
        description: t.description,
        // Vercel prefers Zod schemas; JSON Schema pass-through requires their
        // `jsonSchema` helper if available. For a dev-mode demo, cast through any.
        parameters: t.input_schema as any,
        execute: async () => {
          // Not used here — our loop executes tools, not the SDK.
          throw new Error("unreachable");
        },
      });
    }

    // Convert messages to Vercel format (mirrors OpenAI's shape).
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
      model: openai(opts.model),
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
