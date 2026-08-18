import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import SheetGrid from "./SheetGrid.vue";
import { useGridController } from "./composables/useGridController.js";

describe("Vue paste-as-compound-command", () => {
  it("one undo reverts all pasted cells", async () => {
    const Cmp = defineComponent({
      setup() {
        const controller = useGridController();
        (globalThis as any).__vc = controller;
        const rows = ref([
          { id: "r1", a: "", b: "" },
          { id: "r2", a: "", b: "" },
        ]);
        const columns = ref([
          { id: "a", header: "A" },
          { id: "b", header: "B" },
        ]);
        return () =>
          h("div", { style: "height: 300px" }, [
            h(SheetGrid, {
              controller,
              rows: rows.value,
              columns: columns.value,
            }),
          ]);
      },
    });
    const w = mount(Cmp);
    await nextTick();
    const c = (globalThis as any).__vc;
    c.setCells([
      { rowId: "r1", columnId: "a", value: "1" },
      { rowId: "r1", columnId: "b", value: "2" },
      { rowId: "r2", columnId: "a", value: "3" },
      { rowId: "r2", columnId: "b", value: "4" },
    ]);
    await nextTick();
    expect(c.canUndo()).toBe(true);
    c.undo();
    await nextTick();
    const data = c.getData();
    expect(data.rows[0]!.values.a).toBe("");
    expect(data.rows[1]!.values.b).toBe("");
  });
});
