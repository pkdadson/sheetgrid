import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGridStore } from "@sheetgrid/core";
import { createGridController } from "@sheetgrid/agent";
import { AgentChat } from "./AgentChat.js";
import type { SendOutput } from "@sheetgrid/agent";

afterEach(cleanup);

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

describe("<AgentChat> React", () => {
  it("renders default UI: textarea + send button + empty transcript", () => {
    const controller = fixture();
    render(<AgentChat controller={controller} send={mockSend([])} />);
    expect(screen.getByRole("textbox")).toBeTruthy();
    expect(screen.getByRole("button", { name: /send/i })).toBeTruthy();
  });

  it("submitting the form calls send and renders assistant text", async () => {
    const controller = fixture();
    const send = mockSend([
      { content: [{ type: "text", text: "Hello human." }], stop_reason: "end_turn" },
    ]);
    render(<AgentChat controller={controller} send={send} />);
    const input = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(input, { target: { value: "hi" } });
      fireEvent.submit(input.closest("form")!);
    });
    expect(screen.getByText("Hello human.")).toBeTruthy();
  });

  it("shows cancel button while thinking", async () => {
    const controller = fixture();
    let resolve: (v: SendOutput) => void;
    const send = vi.fn(
      () =>
        new Promise<SendOutput>((r) => {
          resolve = r;
        }),
    );
    render(<AgentChat controller={controller} send={send} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "hi" } });
    fireEvent.submit(input.closest("form")!);
    // Cancel button should now be visible.
    await act(async () => {});
    expect(screen.queryByRole("button", { name: /cancel/i })).toBeTruthy();
    resolve!({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" });
    await act(async () => {});
  });

  it("renderMessage override replaces default bubble", async () => {
    const controller = fixture();
    const send = mockSend([
      { content: [{ type: "text", text: "hi" }], stop_reason: "end_turn" },
    ]);
    render(
      <AgentChat
        controller={controller}
        send={send}
        renderMessage={(m) => <div data-testid="custom-bubble">{JSON.stringify(m.role)}</div>}
      />,
    );
    const input = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(input, { target: { value: "hey" } });
      fireEvent.submit(input.closest("form")!);
    });
    expect(screen.getAllByTestId("custom-bubble").length).toBeGreaterThan(0);
  });

  it("onSend / onError callbacks fire", async () => {
    const controller = fixture();
    const send = vi.fn(async () => {
      throw new Error("nope");
    });
    const onSend = vi.fn();
    const onError = vi.fn();
    render(
      <AgentChat controller={controller} send={send} onSend={onSend} onError={onError} />,
    );
    const input = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(input, { target: { value: "hi" } });
      fireEvent.submit(input.closest("form")!);
    });
    expect(onSend).toHaveBeenCalledWith("hi");
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
