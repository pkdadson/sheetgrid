import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import SheetGrid from "./SheetGrid.vue";

const rows = [{ id: "1", a: "x", b: "y", c: "z" }];
const columns = [
  { id: "a", header: "A", width: 100 as const },
  { id: "b", header: "B", width: 100 as const },
  { id: "c", header: "C", width: 100 as const },
];

describe("SheetGrid column resize", () => {
  it("updates the header width when the resizer is dragged", async () => {
    const wrapper = mount(SheetGrid, {
      props: { rows, columns, virtualizeColumns: false },
      attachTo: document.body,
    });
    const headers = wrapper.findAll('[role="columnheader"]');
    const firstHeader = headers[0]?.element as HTMLElement;
    const initialWidth = firstHeader.style.width;
    expect(initialWidth).toBe("100px");

    const resizer = headers[0]?.find(".eg-col-resizer");
    expect(resizer?.exists()).toBe(true);

    // Drag: mousedown at 100, mousemove to 200 → +100px
    await resizer?.trigger("mousedown", { clientX: 100 });
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 200 }));
    window.dispatchEvent(new MouseEvent("mouseup"));
    await nextTick();

    const newWidth = (
      wrapper.findAll('[role="columnheader"]')[0]?.element as HTMLElement
    ).style.width;
    expect(newWidth).toBe("200px");
  });

  it("enforces a minimum width of 40px", async () => {
    const wrapper = mount(SheetGrid, {
      props: { rows, columns, virtualizeColumns: false },
      attachTo: document.body,
    });
    const resizer = wrapper
      .findAll('[role="columnheader"]')[0]
      ?.find(".eg-col-resizer");
    // Drag left by 1000px → would go to -900, clamped to 40
    await resizer?.trigger("mousedown", { clientX: 500 });
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: -500 }));
    window.dispatchEvent(new MouseEvent("mouseup"));
    await nextTick();

    const newWidth = (
      wrapper.findAll('[role="columnheader"]')[0]?.element as HTMLElement
    ).style.width;
    expect(newWidth).toBe("40px");
  });
});

describe("SheetGrid column reorder", () => {
  it("moves a column via drag-and-drop and emits rowsChange with reason 'reorder'", async () => {
    const rowsChange = vi.fn();
    const wrapper = mount(SheetGrid, {
      props: {
        rows,
        columns,
        virtualizeColumns: false,
        onRowsChange: rowsChange,
      },
      attachTo: document.body,
    });
    const headers = wrapper.findAll('[role="columnheader"]');
    const source = headers[0]; // A
    const target = headers[2]; // C

    await source?.trigger("dragstart", { dataTransfer: null });
    await target?.trigger("dragover", { dataTransfer: null });
    await target?.trigger("drop", { dataTransfer: null });
    await nextTick();

    // Header order should now be B, C, A (moved A to index of C)
    const headersAfter = wrapper
      .findAll('[role="columnheader"]')
      .map((h) => h.text().trim());
    // First and second header should not be "A" anymore
    const order = headersAfter.filter((t) => ["A", "B", "C"].includes(t));
    expect(order.indexOf("A")).toBeGreaterThan(0);
    expect(rowsChange).toHaveBeenCalled();
    const [, meta] = rowsChange.mock.calls[0];
    expect(meta.reason).toBe("reorder");
  });
});
