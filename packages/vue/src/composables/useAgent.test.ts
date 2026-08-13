import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { createGridStore } from "@sheetgrid/core";
import { createGridController } from "@sheetgrid/agent";
import type { SendOutput } from "@sheetgrid/agent";
import { useAgent } from "./useAgent.js";

function mockSend(scripts: SendOutput[]) {
  let i = 0;
  return vi.fn(async () => {
    const out = scripts[i++];
    if (!out) throw new Error("script exhausted");
    return out;
  });
}

describe("useAgent (Vue)", () => {
  it("returns reactive state that updates on send", async () => {
    const store = createGridStore({
      rows: [{ id: "r1", values: { name: "Ada" } }],
      columns: [{ id: "name", header: "Name" }],
    });
    const controller = createGridController();
    controller.__attach(store);
    const send = mockSend([
      { content: [{ type: "text", text: "hi" }], stop_reason: "end_turn" },
    ]);

    let captured: ReturnType<typeof useAgent> | null = null;
    const Cmp = defineComponent({
      setup() {
        captured = useAgent(controller, { send });
        return () => h("div");
      },
    });
    mount(Cmp);
    await nextTick();
    expect(captured!.state.value.messages).toEqual([]);
    await captured!.send("hello");
    await nextTick();
    expect(captured!.state.value.messages.length).toBeGreaterThan(0);
    expect(captured!.state.value.thinking).toBe(false);
  });

  it("cancels loop on scope disposal", async () => {
    const store = createGridStore({
      rows: [],
      columns: [{ id: "a", header: "A" }],
    });
    const controller = createGridController();
    controller.__attach(store);
    let cancelSpy: ReturnType<typeof vi.fn> | null = null;
    const send = vi.fn(
      () =>
        new Promise<SendOutput>((_r, reject) => {
          // never resolves; only aborts on cancel
        }),
    );
    const Cmp = defineComponent({
      setup() {
        const agent = useAgent(controller, { send });
        cancelSpy = vi.spyOn(agent, "cancel");
        void agent.send("hi").catch(() => {});
        return () => h("div");
      },
    });
    const w = mount(Cmp);
    await nextTick();
    w.unmount();
    await nextTick();
    expect(cancelSpy).toHaveBeenCalled();
  });
});
