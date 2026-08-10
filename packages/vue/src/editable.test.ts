import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import SheetGrid from "./SheetGrid.vue";

describe("SheetGrid column.editable", () => {
  it("does not open editor on Enter when column.editable is false", async () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [{ id: "1", name: "Ada" }],
        columns: [{ id: "name", header: "Name", editable: false }],
      },
      attachTo: document.body,
    });
    // biome-ignore lint/style/noNonNullAssertion: cell is guaranteed to exist in this test fixture
    const cell = wrapper.findAll('[role="cell"]')[0]!;
    await cell.trigger("mousedown");
    await nextTick();

    const grid = wrapper.get('[role="grid"]').element as HTMLElement;
    grid.focus();
    await wrapper.get('[role="grid"]').trigger("keydown", { key: "Enter" });
    await nextTick();

    // No editor should mount
    const input = wrapper.find("input.eg-editor");
    expect(input.exists()).toBe(false);
  });

  it("respects a predicate: editable per row", async () => {
    // The predicate receives a GridRow; values only include defined columns.
    // Use a "status" column to carry the locked flag so it ends up in row.values.
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [
          { id: "1", name: "Ada", status: "open" },
          { id: "2", name: "Grace", status: "locked" },
        ],
        columns: [
          { id: "status", header: "Status" },
          {
            id: "name",
            header: "Name",
            editable: (row: { values: Record<string, unknown> }) =>
              row.values.status !== "locked",
          },
        ],
      },
      attachTo: document.body,
    });

    // Click Grace (locked)
    const cells = wrapper.findAll('[role="cell"]');
    // biome-ignore lint/style/noNonNullAssertion: cell is guaranteed to exist in this test fixture
    const grace = cells.find((c) => c.text().includes("Grace"))!;
    await grace.trigger("mousedown");
    await nextTick();

    const grid = wrapper.get('[role="grid"]').element as HTMLElement;
    grid.focus();
    await wrapper.get('[role="grid"]').trigger("keydown", { key: "Enter" });
    await nextTick();

    expect(wrapper.find("input.eg-editor").exists()).toBe(false);

    // Click Ada (unlocked)
    // biome-ignore lint/style/noNonNullAssertion: cell is guaranteed to exist in this test fixture
    const ada = cells.find((c) => c.text().includes("Ada"))!;
    await ada.trigger("mousedown");
    await nextTick();
    await wrapper.get('[role="grid"]').trigger("keydown", { key: "Enter" });
    await nextTick();

    expect(wrapper.find("input.eg-editor").exists()).toBe(true);
  });
});
