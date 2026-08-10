import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import SheetGrid from "./SheetGrid.vue";

describe("SheetGrid clipboard", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText,
        readText: vi.fn().mockResolvedValue("Z\t9"),
      },
    });
  });

  it("copies selection with Ctrl+C after selecting a cell", async () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [{ id: "1", name: "Ada", age: 36 }],
        columns: [
          { id: "name", header: "Name" },
          { id: "age", header: "Age" },
        ],
      },
      attachTo: document.body,
    });

    // Click the "Ada" cell to select it
    // biome-ignore lint/style/noNonNullAssertion: cell is guaranteed to exist in this test fixture
    const cell = wrapper
      .findAll('[role="cell"]')
      .find((c) => c.text().includes("Ada"))!;
    await cell.trigger("mousedown");
    await nextTick();

    // Focus the grid and fire Ctrl+C
    const grid = wrapper.get('[role="grid"]').element as HTMLElement;
    grid.focus();
    await wrapper.get('[role="grid"]').trigger("keydown", {
      key: "c",
      code: "KeyC",
      ctrlKey: true,
    });

    // copySelection is async — wait for the writeText call
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalled();
    });
    expect(writeText.mock.calls[0]?.[0]).toContain("Ada");
  });
});
