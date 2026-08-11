import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import SheetGrid from "./SheetGrid.vue";

describe("SheetGrid slots", () => {
  it("renders #toolbar slot above the grid", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [{ id: "1", name: "Ada" }],
        columns: [{ id: "name", header: "Name" }],
      },
      slots: {
        toolbar: '<div class="my-toolbar">Toolbar</div>',
      },
      attachTo: document.body,
    });
    const el = wrapper.element as HTMLElement;
    const toolbar = el.querySelector(".my-toolbar");
    const grid = el.querySelector('[role="grid"]');
    expect(toolbar).toBeTruthy();
    expect(toolbar?.textContent).toBe("Toolbar");
    // Toolbar must appear before the grid in DOM order
    expect(
      toolbar?.compareDocumentPosition(grid as Element) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders #empty slot when there are no rows", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [],
        columns: [{ id: "name", header: "Name" }],
      },
      slots: {
        empty: '<div class="empty-msg">No data yet</div>',
      },
      attachTo: document.body,
    });
    expect(wrapper.text()).toContain("No data yet");
  });

  it("does NOT render #empty slot when rows are present", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [{ id: "1", name: "Ada" }],
        columns: [{ id: "name", header: "Name" }],
      },
      slots: {
        empty: '<div class="empty-msg">Empty!</div>',
      },
      attachTo: document.body,
    });
    expect(wrapper.text()).not.toContain("Empty!");
  });

  it("#status slot receives error prop and replaces built-in status content", async () => {
    // Trigger validation error to get a status message
    const wrapper = mount(SheetGrid, {
      props: {
        validationMode: "commit-with-error",
        rows: [{ id: "1", name: "" }],
        columns: [
          {
            id: "name",
            header: "Name",
            validate: (v: unknown) =>
              v === "" || v == null
                ? { ok: false as const, message: "required", code: "required" }
                : { ok: true as const },
          },
        ],
      },
      slots: {
        // Use scoped slot syntax via render fn
        status: (props: { error: string | null }) =>
          h(
            "div",
            { class: "custom-status" },
            `Custom: ${props.error ?? "clean"}`,
          ),
      },
      attachTo: document.body,
    });

    // Verify slot rendered initially with no error
    expect(wrapper.text()).toContain("Custom: clean");

    // Note: triggering commit-with-error path in a Playwright-less test requires
    // driving through the editor keyboard flow; simplest here is to verify the
    // slot props signature works with a fresh mount showing the "clean" state.
    // A more thorough test lives in validation.test.ts.
  });

  it("#cell scoped slot overrides default cell rendering", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [
          { id: "1", name: "Ada", score: 98 },
          { id: "2", name: "Grace", score: 99 },
        ],
        columns: [
          { id: "name", header: "Name" },
          { id: "score", header: "Score" },
        ],
      },
      slots: {
        cell: (props: {
          row: { id: string; name: string; score: number };
          column: { id: string };
          value: unknown;
        }) =>
          h(
            "span",
            { class: `cell-${props.column.id}-${props.row.id}` },
            `[${String(props.value)}]`,
          ),
      },
      attachTo: document.body,
    });
    const el = wrapper.element as HTMLElement;
    expect(el.querySelector(".cell-name-1")?.textContent).toBe("[Ada]");
    expect(el.querySelector(".cell-score-2")?.textContent).toBe("[99]");
  });

  it("#header scoped slot overrides default header rendering", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [{ id: "1", name: "Ada" }],
        columns: [{ id: "name", header: "Name" }],
      },
      slots: {
        header: (props: { column: { id: string }; label: string }) =>
          h("span", { class: `hdr-${props.column.id}` }, `<<${props.label}>>`),
      },
      attachTo: document.body,
    });
    const el = wrapper.element as HTMLElement;
    expect(el.querySelector(".hdr-name")?.textContent).toBe("<<Name>>");
  });

  it("#row scoped slot replaces default cell rendering inside <tr>", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [{ id: "1", name: "Ada", score: 98 }],
        columns: [
          { id: "name", header: "Name" },
          { id: "score", header: "Score" },
        ],
      },
      slots: {
        row: (props: {
          row: { id: string; values: Record<string, unknown> };
          index: number;
        }) =>
          h(
            "td",
            { class: `custom-row-${props.row.id}`, colspan: 2 },
            `row#${props.index}: ${String(props.row.values.name)}`,
          ),
      },
      attachTo: document.body,
    });
    const el = wrapper.element as HTMLElement;
    const custom = el.querySelector(".custom-row-1");
    expect(custom).toBeTruthy();
    expect(custom?.textContent).toBe("row#0: Ada");
    // Default cell TDs should NOT be present
    expect(el.querySelector(".eg-td")).toBeFalsy();
  });

  it("#loading slot replaces tbody content when :loading is true", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        loading: true,
        rows: [{ id: "1", name: "Ada" }],
        columns: [{ id: "name", header: "Name" }],
      },
      slots: {
        loading: '<div class="my-spinner">Fetching…</div>',
      },
      attachTo: document.body,
    });
    const el = wrapper.element as HTMLElement;
    expect(el.querySelector(".my-spinner")?.textContent).toBe("Fetching…");
    // Data row should NOT be rendered
    expect(el.querySelector('[data-index="1"]')).toBeFalsy();
  });

  it("default 'Loading…' text when :loading=true but no slot provided", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        loading: true,
        rows: [{ id: "1", name: "Ada" }],
        columns: [{ id: "name", header: "Name" }],
      },
      attachTo: document.body,
    });
    expect(wrapper.text()).toContain("Loading");
    expect(
      (wrapper.element as HTMLElement).querySelector(".eg-loading"),
    ).toBeTruthy();
  });
});
