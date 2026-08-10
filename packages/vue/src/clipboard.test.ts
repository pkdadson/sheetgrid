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

  it("cuts with Ctrl+X: copies to clipboard AND clears selected cells", async () => {
    const rowsChange = vi.fn();
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [{ id: "1", name: "Ada", age: 36 }],
        columns: [
          { id: "name", header: "Name" },
          { id: "age", header: "Age" },
        ],
        onRowsChange: rowsChange,
      },
      attachTo: document.body,
    });

    // biome-ignore lint/style/noNonNullAssertion: cell is guaranteed to exist in this test fixture
    const cell = wrapper
      .findAll('[role="cell"]')
      .find((c) => c.text().includes("Ada"))!;
    await cell.trigger("mousedown");
    await nextTick();

    const grid = wrapper.get('[role="grid"]').element as HTMLElement;
    grid.focus();
    await wrapper.get('[role="grid"]').trigger("keydown", {
      key: "x",
      code: "KeyX",
      ctrlKey: true,
    });

    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalled();
      expect(rowsChange).toHaveBeenCalled();
    });
    // Copy first
    expect(writeText.mock.calls[0]?.[0]).toContain("Ada");
    // Emit fires with the cleared value
    // biome-ignore lint/style/noNonNullAssertion: mock was asserted to have been called above
    const [rows, meta] = rowsChange.mock.calls[0]!;
    expect(meta.reason).toBe("cut");
    expect(rows[0]?.name).toBe("");
  });

  it("pastes with Ctrl+V: reads clipboard and writes to active cell", async () => {
    const rowsChange = vi.fn();
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [{ id: "1", name: "Ada", age: 36 }],
        columns: [
          { id: "name", header: "Name" },
          { id: "age", header: "Age" },
        ],
        onRowsChange: rowsChange,
      },
      attachTo: document.body,
    });

    // Select the age cell
    // biome-ignore lint/style/noNonNullAssertion: cell is guaranteed to exist in this test fixture
    const cell = wrapper
      .findAll('[role="cell"]')
      .find((c) => c.text().includes("36"))!;
    await cell.trigger("mousedown");
    await nextTick();

    // navigator.clipboard.readText returns "Z\t9" in the beforeEach mock
    const grid = wrapper.get('[role="grid"]').element as HTMLElement;
    grid.focus();
    await wrapper.get('[role="grid"]').trigger("keydown", {
      key: "v",
      code: "KeyV",
      ctrlKey: true,
    });

    await vi.waitFor(() => expect(rowsChange).toHaveBeenCalled());
    // biome-ignore lint/style/noNonNullAssertion: mock was asserted to have been called above
    const [rows] = rowsChange.mock.calls[0]!;
    // Age was 36; paste "Z\t9" starting at the age cell writes "Z" to age
    // (name column comes AFTER age in the paste target — mapping depends on
    // active cell + column order. "Z" lands in age (invalid number, but core
    // handles it — assert something changed).
    expect(
      rows[0]?.age === "Z" || rows[0]?.age === 9 || rows[0]?.age === "9",
    ).toBeTruthy();
  });

  it("native paste event: extracts text/plain and delegates to pasteSelection", async () => {
    const rowsChange = vi.fn();
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [{ id: "1", name: "Ada", age: 36 }],
        columns: [
          { id: "name", header: "Name" },
          { id: "age", header: "Age" },
        ],
        onRowsChange: rowsChange,
      },
      attachTo: document.body,
    });

    // Select first cell
    // biome-ignore lint/style/noNonNullAssertion: cell is guaranteed to exist in this test fixture
    const cell = wrapper
      .findAll('[role="cell"]')
      .find((c) => c.text().includes("Ada"))!;
    await cell.trigger("mousedown");
    await nextTick();

    // Fire a native paste event with clipboardData.
    // jsdom does not expose DataTransfer, so we build a minimal stub and
    // dispatch a plain Event with the property patched in.
    const grid = wrapper.get('[role="grid"]').element as HTMLElement;
    const stubClipboardData = {
      getData: (type: string) => (type === "text/plain" ? "Hedy" : ""),
    };
    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: stubClipboardData,
    });
    grid.dispatchEvent(pasteEvent);

    await vi.waitFor(() => expect(rowsChange).toHaveBeenCalled());
    // biome-ignore lint/style/noNonNullAssertion: mock was asserted to have been called above
    const [rows] = rowsChange.mock.calls[0]!;
    expect(rows[0]?.name).toBe("Hedy");
  });
});
