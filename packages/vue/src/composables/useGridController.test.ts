import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, ref } from "vue";
import { useGridController } from "./useGridController.js";

describe("useGridController (Vue)", () => {
  it("returns a stable controller across renders", () => {
    const captured: any[] = [];
    const Cmp = defineComponent({
      setup() {
        const controller = useGridController();
        captured.push(controller);
        const tick = ref(0);
        return { controller, tick };
      },
      render() {
        return h("div", `${this.tick}`);
      },
    });
    const wrapper = mount(Cmp);
    // Force a re-render.
    (wrapper.vm as any).tick++;
    // The captured controller stays the same across ticks — captured has 1 entry
    // because setup runs once.
    expect(captured).toHaveLength(1);
  });

  it("passes options through on first (only) setup call", () => {
    const Cmp = defineComponent({
      setup() {
        const controller = useGridController({ readOnly: true });
        return { controller };
      },
      render() {
        return h("div");
      },
    });
    const w = mount(Cmp);
    const res = (w.vm as any).controller.setCell("r", "c", 1);
    expect(res.ok).toBe(false);
  });

  it("disposes on scope unmount (detaches if attached)", () => {
    const Cmp = defineComponent({
      setup() {
        const controller = useGridController();
        (globalThis as any).__vc = controller;
        return { controller };
      },
      render() {
        return h("div");
      },
    });
    const w = mount(Cmp);
    const c = (globalThis as any).__vc;
    // Simulate attach with a minimal fake store shape.
    const fakeStore = {
      subscribe: () => () => {},
      __history: { on: () => () => {} },
      getRows: () => [],
      getColumns: () => [],
      getOrderedColumns: () => [],
      getColumnOrder: () => [],
      getLastReason: () => null,
    } as any;
    c.__attach(fakeStore);
    expect(c.isAttached()).toBe(true);
    w.unmount();
    expect(c.isAttached()).toBe(false);
  });
});
