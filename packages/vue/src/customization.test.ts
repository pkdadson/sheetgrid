import {
  type SelectionState,
  createSelection,
  selectCell,
} from "@sheetgrid/core";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import SheetGrid from "./SheetGrid.vue";

const rows = [
  { id: "1", name: "Ada", age: 36 },
  { id: "2", name: "Grace", age: 40 },
  { id: "3", name: "Alan", age: 41 },
];
const columns = [
  { id: "name", header: "Name" },
  { id: "age", header: "Age" },
];

function cellsWithText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper
    .findAll('[role="cell"]')
    .filter((c) => c.text().includes(text));
}

function cellAt(wrapper: ReturnType<typeof mount>, text: string) {
  const found = wrapper
    .findAll('[role="cell"]')
    .find((c) => c.text().includes(text));
  if (!found) throw new Error(`Cell with text "${text}" not found`);
  return found;
}

// ─── 1. Selection controlled prop + emit ─────────────────────────────────────

describe("SheetGrid controlled selection", () => {
  it("reflects the passed :selection prop immediately", () => {
    const mySelection: SelectionState = selectCell(createSelection(), {
      rowId: "2",
      columnId: "name",
    });
    const wrapper = mount(SheetGrid, {
      props: { rows, columns, selection: mySelection },
      attachTo: document.body,
    });
    const selected = wrapper
      .findAll('[aria-selected="true"]')
      .map((c) => c.text());
    expect(selected).toContain("Grace");
  });

  it("emits selection-change when a cell is clicked", async () => {
    const selectionChange = vi.fn();
    const wrapper = mount(SheetGrid, {
      props: { rows, columns, onSelectionChange: selectionChange },
      attachTo: document.body,
    });
    await cellAt(wrapper, "Ada").trigger("mousedown");
    await nextTick();
    expect(selectionChange).toHaveBeenCalledOnce();
    const emitted = selectionChange.mock.calls[0]?.[0] as SelectionState;
    expect(emitted.active?.rowId).toBe("1");
    expect(emitted.active?.columnId).toBe("name");
  });

  it("does not override provided :selection with internal state after a mousedown", async () => {
    const fixedSelection: SelectionState = selectCell(createSelection(), {
      rowId: "3",
      columnId: "age",
    });
    const wrapper = mount(SheetGrid, {
      props: { rows, columns, selection: fixedSelection },
      attachTo: document.body,
    });
    // Click Ada — internal state updates but prop still wins
    await cellAt(wrapper, "Ada").trigger("mousedown");
    await nextTick();
    // The rendered aria-selected should still reflect fixedSelection (Alan age)
    const selected = wrapper
      .findAll('[aria-selected="true"]')
      .map((c) => c.text());
    // Alan's age cell is selected per fixedSelection
    expect(selected).toContain("41");
  });
});

// ─── 2. Row selection mode ────────────────────────────────────────────────────

describe("SheetGrid selectionMode='row'", () => {
  it("clicking a cell selects ALL cells in that row", async () => {
    const wrapper = mount(SheetGrid, {
      props: { rows, columns, selectionMode: "row", virtualizeColumns: false },
      attachTo: document.body,
    });
    // Click the name cell of the first row
    await cellAt(wrapper, "Ada").trigger("mousedown");
    await nextTick();
    const selected = wrapper
      .findAll('[aria-selected="true"]')
      .map((c) => c.text());
    // Both name and age of row 1 should be selected
    expect(selected).toContain("Ada");
    expect(selected).toContain("36");
    // Other rows should NOT be selected
    expect(selected).not.toContain("Grace");
    expect(selected).not.toContain("Alan");
  });

  it("shift-click extends selection across rows", async () => {
    const wrapper = mount(SheetGrid, {
      props: { rows, columns, selectionMode: "row", virtualizeColumns: false },
      attachTo: document.body,
    });
    await cellAt(wrapper, "Ada").trigger("mousedown");
    await nextTick();
    await cellAt(wrapper, "Grace").trigger("mousedown", { shiftKey: true });
    await nextTick();
    const selected = wrapper
      .findAll('[aria-selected="true"]')
      .map((c) => c.text());
    // Both rows should be selected
    expect(selected).toContain("Ada");
    expect(selected).toContain("36");
    expect(selected).toContain("Grace");
    expect(selected).toContain("40");
    expect(selected).not.toContain("Alan");
  });

  it("ctrl-click toggles a row in and out", async () => {
    const wrapper = mount(SheetGrid, {
      props: { rows, columns, selectionMode: "row", virtualizeColumns: false },
      attachTo: document.body,
    });
    await cellAt(wrapper, "Ada").trigger("mousedown");
    await nextTick();
    await cellAt(wrapper, "Grace").trigger("mousedown", { ctrlKey: true });
    await nextTick();
    let selected = wrapper
      .findAll('[aria-selected="true"]')
      .map((c) => c.text());
    expect(selected).toContain("Ada");
    expect(selected).toContain("Grace");

    // Toggle Grace off
    await cellAt(wrapper, "Grace").trigger("mousedown", { ctrlKey: true });
    await nextTick();
    selected = wrapper.findAll('[aria-selected="true"]').map((c) => c.text());
    expect(selected).toContain("Ada");
    expect(selected).not.toContain("Grace");
  });
});

// ─── 3. rowClassFn ───────────────────────────────────────────────────────────

describe("SheetGrid rowClassFn", () => {
  it("applies the returned class to the matching row's <tr>", async () => {
    const rowClassFn = (_row: unknown, index: number) =>
      index === 0 ? "first-row" : "";
    const wrapper = mount(SheetGrid, {
      props: { rows, columns, rowClassFn },
      attachTo: document.body,
    });
    await nextTick();
    const dataRows = wrapper.findAll("tr.eg-data-row");
    expect(dataRows[0]?.classes()).toContain("first-row");
    expect(dataRows[1]?.classes()).not.toContain("first-row");
    expect(dataRows[2]?.classes()).not.toContain("first-row");
  });

  it("preserves the base eg-data-row class alongside the custom class", async () => {
    const rowClassFn = () => "custom-cls";
    const wrapper = mount(SheetGrid, {
      props: { rows, columns, rowClassFn },
      attachTo: document.body,
    });
    await nextTick();
    const dataRows = wrapper.findAll("tr.eg-data-row");
    for (const row of dataRows) {
      expect(row.classes()).toContain("eg-data-row");
      expect(row.classes()).toContain("custom-cls");
    }
  });
});

// ─── 4. cellClassFn ──────────────────────────────────────────────────────────

describe("SheetGrid cellClassFn", () => {
  it("applies the class to cells matching the column condition", async () => {
    const cellClassFn = (_row: unknown, col: { id: string }) =>
      col.id === "name" ? "name-cell" : "";
    const wrapper = mount(SheetGrid, {
      props: { rows, columns, cellClassFn, virtualizeColumns: false },
      attachTo: document.body,
    });
    await nextTick();
    // Every name cell should have name-cell class
    const nameCells = cellsWithText(wrapper, "Ada")
      .concat(cellsWithText(wrapper, "Grace"))
      .concat(cellsWithText(wrapper, "Alan"));
    for (const cell of nameCells) {
      expect(cell.classes()).toContain("name-cell");
    }
    // Age cells should NOT
    const ageCells = cellsWithText(wrapper, "36")
      .concat(cellsWithText(wrapper, "40"))
      .concat(cellsWithText(wrapper, "41"));
    for (const cell of ageCells) {
      expect(cell.classes()).not.toContain("name-cell");
    }
  });

  it("preserves base eg-td class alongside the custom class", async () => {
    const cellClassFn = () => "custom-td";
    const wrapper = mount(SheetGrid, {
      props: { rows, columns, cellClassFn, virtualizeColumns: false },
      attachTo: document.body,
    });
    await nextTick();
    const dataCells = wrapper.findAll('[role="cell"]');
    for (const cell of dataCells) {
      expect(cell.classes()).toContain("eg-td");
      expect(cell.classes()).toContain("custom-td");
    }
  });
});

// ─── 5. @column-widths-change ────────────────────────────────────────────────

describe("SheetGrid @column-widths-change", () => {
  it("fires after a resize drag ends with the new widths", async () => {
    const columnWidthsChange = vi.fn();
    const wrapper = mount(SheetGrid, {
      props: {
        rows,
        columns: [
          { id: "name", header: "Name", width: 100 },
          { id: "age", header: "Age", width: 100 },
        ],
        virtualizeColumns: false,
        onColumnWidthsChange: columnWidthsChange,
      },
      attachTo: document.body,
    });
    const headers = wrapper.findAll('[role="columnheader"]');
    const resizer = headers[0]?.find(".eg-col-resizer");
    expect(resizer?.exists()).toBe(true);

    await resizer?.trigger("mousedown", { clientX: 100 });
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 200 }));
    window.dispatchEvent(new MouseEvent("mouseup"));
    await nextTick();

    expect(columnWidthsChange).toHaveBeenCalledOnce();
    const widths = columnWidthsChange.mock.calls[0]?.[0] as Record<
      string,
      number
    >;
    expect(typeof widths).toBe("object");
    expect(widths.name).toBe(200);
  });

  it("does NOT fire when no resize happened (plain mouseup)", async () => {
    const columnWidthsChange = vi.fn();
    mount(SheetGrid, {
      props: {
        rows,
        columns,
        onColumnWidthsChange: columnWidthsChange,
      },
      attachTo: document.body,
    });
    window.dispatchEvent(new MouseEvent("mouseup"));
    await nextTick();
    expect(columnWidthsChange).not.toHaveBeenCalled();
  });
});

// ─── 6. clipboardEnabled: false ──────────────────────────────────────────────

describe("SheetGrid clipboardEnabled=false", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText, readText: vi.fn().mockResolvedValue("") },
    });
  });

  it("does NOT call writeText on Ctrl+C when clipboardEnabled is false", async () => {
    const wrapper = mount(SheetGrid, {
      props: { rows, columns, clipboardEnabled: false },
      attachTo: document.body,
    });
    await cellAt(wrapper, "Ada").trigger("mousedown");
    await nextTick();

    await wrapper.get('[role="grid"]').trigger("keydown", {
      key: "c",
      code: "KeyC",
      ctrlKey: true,
    });
    await nextTick();
    expect(writeText).not.toHaveBeenCalled();
  });

  it("does NOT call writeText on Ctrl+X when clipboardEnabled is false", async () => {
    const wrapper = mount(SheetGrid, {
      props: { rows, columns, clipboardEnabled: false },
      attachTo: document.body,
    });
    await cellAt(wrapper, "Ada").trigger("mousedown");
    await nextTick();

    await wrapper.get('[role="grid"]').trigger("keydown", {
      key: "x",
      code: "KeyX",
      ctrlKey: true,
    });
    await nextTick();
    expect(writeText).not.toHaveBeenCalled();
  });

  it("does NOT paste on native paste event when clipboardEnabled is false", async () => {
    const rowsChange = vi.fn();
    const wrapper = mount(SheetGrid, {
      props: {
        rows,
        columns,
        clipboardEnabled: false,
        onRowsChange: rowsChange,
      },
      attachTo: document.body,
    });
    await cellAt(wrapper, "Ada").trigger("mousedown");
    await nextTick();

    const grid = wrapper.get('[role="grid"]').element as HTMLElement;
    const stubClipboardData = {
      getData: (type: string) => (type === "text/plain" ? "NewValue" : ""),
    };
    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: stubClipboardData,
    });
    grid.dispatchEvent(pasteEvent);
    await nextTick();
    expect(rowsChange).not.toHaveBeenCalled();
  });
});
