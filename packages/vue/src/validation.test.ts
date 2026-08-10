import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import SheetGrid from "./SheetGrid.vue";

const requiredMsg =
  (message: string) =>
  (value: unknown): { ok: boolean; message?: string; code?: string } => {
    if (value === null || value === undefined) {
      return { ok: false, message, code: "required" };
    }
    if (typeof value === "string" && value.trim() === "") {
      return { ok: false, message, code: "required" };
    }
    return { ok: true };
  };

describe("SheetGrid validation", () => {
  it("aria-invalid on cells whose value fails column.validate (commit-with-error mode)", async () => {
    const wrapper = mount(SheetGrid, {
      props: {
        validationMode: "commit-with-error",
        rows: [{ id: "1", name: "" }],
        columns: [
          {
            id: "name",
            header: "Name",
            validate: requiredMsg("name is required"),
          },
        ],
      },
      attachTo: document.body,
    });

    // Click the empty cell, start editing, commit empty via Enter
    const cells = wrapper.findAll('[role="cell"]');
    await cells[0].trigger("mousedown");
    await nextTick();
    const grid = wrapper.get('[role="grid"]').element as HTMLElement;
    grid.focus();
    await wrapper.get('[role="grid"]').trigger("keydown", { key: "Enter" });
    await nextTick();
    const input = wrapper.find("input.eg-editor");
    await input.trigger("keydown", { key: "Enter" });
    await nextTick();
    await new Promise((r) => setTimeout(r, 10));
    await nextTick();

    const updatedCells = wrapper.findAll('[role="cell"]');
    expect(updatedCells[0].attributes("aria-invalid")).toBe("true");

    wrapper.unmount();
  });

  it("statusBar shows the first error message", async () => {
    const wrapper = mount(SheetGrid, {
      props: {
        validationMode: "commit-with-error",
        rows: [{ id: "1", name: "" }],
        columns: [
          {
            id: "name",
            header: "Name",
            validate: requiredMsg("name required"),
          },
        ],
      },
      attachTo: document.body,
    });

    // Trigger a validation error via commit-with-error path
    const cells = wrapper.findAll('[role="cell"]');
    await cells[0].trigger("mousedown");
    await nextTick();
    const grid = wrapper.get('[role="grid"]').element as HTMLElement;
    grid.focus();
    await wrapper.get('[role="grid"]').trigger("keydown", { key: "Enter" });
    await nextTick();
    await wrapper.find("input.eg-editor").trigger("keydown", { key: "Enter" });
    await nextTick();
    await new Promise((r) => setTimeout(r, 10));
    await nextTick();

    const status = wrapper.find(".eg-status");
    expect(status.exists()).toBe(true);
    expect(status.text()).toContain("name required");

    wrapper.unmount();
  });

  it("statusBar can be disabled", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        statusBar: false,
        rows: [{ id: "1", name: "Ada" }],
        columns: [{ id: "name", header: "Name" }],
      },
      attachTo: document.body,
    });
    expect(wrapper.find(".eg-status").exists()).toBe(false);

    wrapper.unmount();
  });
});
