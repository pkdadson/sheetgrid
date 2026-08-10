import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import SheetGrid from "./SheetGrid.vue";

describe("SheetGrid built-in cell types", () => {
  it("toggles boolean cells without text editor", async () => {
    const rowsChange = vi.fn();
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [{ id: "1", name: "Ada", active: false }],
        columns: [
          { id: "name", header: "Name" },
          { id: "active", header: "Active", type: "boolean" },
        ],
        onRowsChange: rowsChange,
      },
      attachTo: document.body,
    });

    const checkbox = wrapper.get('input[type="checkbox"][aria-label="Active"]');
    expect((checkbox.element as HTMLInputElement).checked).toBe(false);
    await checkbox.setValue(true);
    await nextTick();

    await vi.waitFor(() => {
      expect(rowsChange).toHaveBeenCalled();
    });
    const next = rowsChange.mock.calls[0]?.[0] as Array<
      Record<string, unknown>
    >;
    expect(next[0]?.active).toBe(true);
  });

  it("renders select labels from options", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [{ id: "1", status: "open" }],
        columns: [
          {
            id: "status",
            header: "Status",
            type: "select",
            selectOptions: [
              { label: "Open", value: "open" },
              { label: "Done", value: "done" },
            ],
          },
        ],
      },
      attachTo: document.body,
    });
    expect(wrapper.text()).toContain("Open");
  });
});
