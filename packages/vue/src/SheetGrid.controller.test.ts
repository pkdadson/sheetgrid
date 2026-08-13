import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import SheetGrid from "./SheetGrid.vue";
import { useGridController } from "./composables/useGridController.js";

describe("<SheetGrid :controller>", () => {
  it("attaches on mount and detaches on unmount", async () => {
    const Cmp = defineComponent({
      setup() {
        const controller = useGridController();
        (globalThis as any).__vc = controller;
        const rows = ref([{ id: "r1", values: { n: 1 } }]);
        const columns = ref([{ id: "n", header: "N", type: "number" as const }]);
        return () =>
          h("div", { style: "height: 300px" }, [
            h(SheetGrid, { controller, rows: rows.value, columns: columns.value }),
          ]);
      },
    });
    const w = mount(Cmp);
    await nextTick();
    const c = (globalThis as any).__vc;
    expect(c.isAttached()).toBe(true);
    expect(c.getSchema().rowCount).toBe(1);
    w.unmount();
    await nextTick();
    expect(c.isAttached()).toBe(false);
  });

  it("agent-driven setCell mutates the grid and DOM re-renders", async () => {
    const Cmp = defineComponent({
      setup() {
        const controller = useGridController();
        (globalThis as any).__vc = controller;
        const rows = ref([{ id: "r1", values: { n: 1 } }]);
        const columns = ref([{ id: "n", header: "N", type: "number" as const }]);
        return () =>
          h("div", { style: "height: 300px" }, [
            h(SheetGrid, { controller, rows: rows.value, columns: columns.value }),
          ]);
      },
    });
    const w = mount(Cmp);
    await nextTick();
    const c = (globalThis as any).__vc;
    c.setCell("r1", "n", 42);
    await nextTick();
    expect(w.html()).toContain("42");
  });
});
