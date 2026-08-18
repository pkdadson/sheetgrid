import { createGridController } from "@sheetgrid/agent";
import type { SendOutput } from "@sheetgrid/agent";
import { createGridStore } from "@sheetgrid/core";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import AgentChat from "./AgentChat.vue";

function fixture() {
  const store = createGridStore({
    rows: [{ id: "r1", values: { name: "Ada" } }],
    columns: [{ id: "name", header: "Name" }],
  });
  const controller = createGridController();
  controller.__attach(store);
  return controller;
}

function mockSend(scripts: SendOutput[]) {
  let i = 0;
  return vi.fn(async () => {
    const out = scripts[i++];
    if (!out) throw new Error("script exhausted");
    return out;
  });
}

describe("<AgentChat> Vue", () => {
  it("renders default UI: textarea + send button", () => {
    const controller = fixture();
    const w = mount(AgentChat, { props: { controller, send: mockSend([]) } });
    expect(w.find("textarea").exists()).toBe(true);
    expect(w.find("button").text().toLowerCase()).toContain("send");
  });

  it("submitting the form calls send and renders assistant text", async () => {
    const controller = fixture();
    const send = mockSend([
      {
        content: [{ type: "text", text: "Hello human." }],
        stop_reason: "end_turn",
      },
    ]);
    const w = mount(AgentChat, { props: { controller, send } });
    await w.find("textarea").setValue("hi");
    await w.find("form").trigger("submit");
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();
    expect(w.html()).toContain("Hello human.");
  });

  it("emits send event", async () => {
    const controller = fixture();
    const send = mockSend([
      { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" },
    ]);
    const w = mount(AgentChat, { props: { controller, send } });
    await w.find("textarea").setValue("hi");
    await w.find("form").trigger("submit");
    expect(w.emitted("send")?.[0]).toEqual(["hi"]);
  });

  it("message slot override replaces default bubble", async () => {
    const controller = fixture();
    const send = mockSend([
      { content: [{ type: "text", text: "hi" }], stop_reason: "end_turn" },
    ]);
    const Wrap = defineComponent({
      setup() {
        return () =>
          h(
            AgentChat as any,
            { controller, send },
            {
              message: ({ message }: any) =>
                h(
                  "div",
                  { "data-testid": "custom-bubble" },
                  JSON.stringify(message.role),
                ),
            },
          );
      },
    });
    const w = mount(Wrap);
    await w.find("textarea").setValue("hey");
    await w.find("form").trigger("submit");
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();
    expect(w.findAll('[data-testid="custom-bubble"]').length).toBeGreaterThan(
      0,
    );
  });
});
