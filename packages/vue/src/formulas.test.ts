import type { createGridStore } from "@sheetgrid/core";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import SheetGrid from "./SheetGrid.vue";

describe("SheetGrid formulas", () => {
  it("commits a formula and displays its result", async () => {
    const wrapper = mount(SheetGrid, {
      props: {
        formulas: true,
        rows: [{ id: "r1", a: "10", b: "20", sum: "" }],
        columns: [
          { id: "a", header: "A" },
          { id: "b", header: "B" },
          { id: "sum", header: "Sum" },
        ],
      },
      attachTo: document.body,
    });

    await nextTick();

    // Verify cells rendered
    const cells = wrapper.findAll('[role="cell"]');
    expect(cells.length).toBe(3);
    expect(cells[2]?.text()).toBe("");

    // Directly access the internal store via vm internals to call setFormula
    // (bypasses editor interaction complexity in JSDOM)
    // biome-ignore lint/suspicious/noExplicitAny: accessing internal store for smoke test
    const vm = wrapper.vm as any;
    const store = vm.$.setupState.store as ReturnType<typeof createGridStore>;

    expect(store.isFormulasEnabled()).toBe(true);

    const ok = store.setFormula("r1", "sum", "=1+2");
    expect(ok).toBe(true);

    await nextTick();

    // The "sum" cell should now display "3"
    const updatedCells = wrapper.findAll('[role="cell"]');
    expect(updatedCells[2]?.text().trim()).toBe("3");
  });
});
