import type { SendInput, SendOutput } from "@sheetgrid/agent";

/**
 * Scripted mock LLM. Recognizes a small set of phrases and returns matching
 * tool_use blocks. No network, no key required — dev playground default.
 */
export async function mockSend(input: SendInput): Promise<SendOutput> {
  // If the last message is a tool_result from get_data, summarize.
  const last = input.messages[input.messages.length - 1];
  if (last && last.role === "tool") {
    for (const r of last.content) {
      const output: any = r.output;
      if (output.ok && Array.isArray(output.value?.rows)) {
        const names = output.value.rows
          .map((row: any) => row.values?.name)
          .filter(Boolean);
        return {
          content: [
            {
              type: "text",
              text: `You have ${names.length} rows: ${names.join(", ")}.`,
            },
          ],
          stop_reason: "end_turn",
        };
      }
    }
    return {
      content: [{ type: "text", text: "done." }],
      stop_reason: "end_turn",
    };
  }

  const lastUser = [...input.messages]
    .reverse()
    .find((m) => m.role === "user");
  const text =
    (lastUser && lastUser.role === "user" ? lastUser.content : "").toLowerCase();

  if (text.includes("fill")) {
    return {
      content: [
        {
          type: "tool_use",
          id: "t1",
          name: "grid_set_cells",
          input: {
            patches: [
              {
                rowId: "r1",
                columnId: "note",
                value: "First contact 2026-08-11",
              },
              { rowId: "r2", columnId: "note", value: "Follow-up scheduled" },
              { rowId: "r3", columnId: "note", value: "Retired" },
            ],
          },
        },
      ],
      stop_reason: "tool_use",
    };
  }
  if (text.includes("undo")) {
    return {
      content: [{ type: "tool_use", id: "u", name: "grid_undo", input: {} }],
      stop_reason: "tool_use",
    };
  }
  if (text.includes("sort by age")) {
    return {
      content: [
        {
          type: "tool_use",
          id: "s",
          name: "grid_set_sort",
          input: {
            specs: [
              {
                columnId: "age",
                direction: text.includes("desc") ? "desc" : "asc",
              },
            ],
          },
        },
      ],
      stop_reason: "tool_use",
    };
  }
  if (text.includes("clear sort")) {
    return {
      content: [
        { type: "tool_use", id: "cs", name: "grid_clear_sort", input: {} },
      ],
      stop_reason: "tool_use",
    };
  }
  if (text.includes("who")) {
    return {
      content: [
        { type: "tool_use", id: "g", name: "grid_get_data", input: {} },
      ],
      stop_reason: "tool_use",
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Mock LLM. I know: "fill notes", "undo", "sort by age" (add "desc"), "clear sort", "who is in the grid". Switch provider to Anthropic/OpenAI/Vercel AI (with a key) for real natural-language handling.`,
      },
    ],
    stop_reason: "end_turn",
  };
}
