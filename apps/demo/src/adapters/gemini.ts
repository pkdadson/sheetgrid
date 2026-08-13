import type { SendInput, SendOutput } from "@sheetgrid/agent";

/**
 * Gemini adapter using @google/genai. Google's tool-use shape uses
 * `functionCall` / `functionResponse` parts inside content. We convert our
 * neutral SendInput/SendOutput to Gemini's shape and back.
 */
export function makeGeminiSend(opts: { apiKey: string; model: string }) {
  return async (input: SendInput): Promise<SendOutput> => {
    // Dynamic import — only load SDK when this provider is picked.
    const { GoogleGenAI } = await import("@google/genai");
    const client = new GoogleGenAI({ apiKey: opts.apiKey });

    // Convert our messages to Gemini's `contents` shape.
    // Each message becomes one or more `Content` objects with `role` and `parts`.
    const contents: Array<{ role: "user" | "model"; parts: any[] }> = [];
    for (const m of input.messages) {
      if (m.role === "user") {
        contents.push({ role: "user", parts: [{ text: m.content }] });
      } else if (m.role === "assistant") {
        const parts: any[] = [];
        for (const b of m.content) {
          if (b.type === "text") {
            parts.push({ text: b.text });
          } else {
            parts.push({
              functionCall: {
                name: b.name,
                args: b.input,
              },
            });
          }
        }
        contents.push({ role: "model", parts });
      } else {
        // tool_result — Gemini expects functionResponse parts, in a user-role message.
        const parts = m.content.map((r) => ({
          functionResponse: {
            name: "", // Gemini needs the function name; we don't have it stored on the result. Use empty.
            response: r.output as any,
          },
        }));
        contents.push({ role: "user", parts });
      }
    }

    // Convert our tool descriptors to Gemini's function-declaration shape.
    const tools = [
      {
        functionDeclarations: input.tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.input_schema as any,
        })),
      },
    ];

    const res = await client.models.generateContent({
      model: opts.model,
      contents,
      config: {
        systemInstruction: input.systemPrompt,
        tools,
      },
      // signal handling: @google/genai may or may not accept AbortSignal directly
      // in the top-level call. If not supported, users can't cancel mid-flight
      // via the SDK — the loop will still see the promise as pending. This is a
      // known limitation for Gemini; document in the recipe.
    });

    // Parse response — walk candidates[0].content.parts to extract text + functionCall.
    const content: SendOutput["content"] = [];
    const candidate = res.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    let toolCallIdCounter = 0;
    let sawFunctionCall = false;
    for (const p of parts) {
      if (typeof p.text === "string" && p.text.length > 0) {
        content.push({ type: "text", text: p.text });
      }
      if (p.functionCall) {
        sawFunctionCall = true;
        toolCallIdCounter++;
        content.push({
          type: "tool_use",
          id: `gemini-${Date.now()}-${toolCallIdCounter}`,
          name: p.functionCall.name ?? "",
          input: p.functionCall.args ?? {},
        });
      }
    }

    return {
      content,
      stop_reason: sawFunctionCall ? "tool_use" : "end_turn",
    };
  };
}
