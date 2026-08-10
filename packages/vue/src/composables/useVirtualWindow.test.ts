import { mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useVirtualWindow } from "./useVirtualWindow.js";

function makeFixture(props: {
  count?: number;
  itemSize?: number;
  pinKeys?: string[];
}) {
  const count = props.count ?? 100;
  const itemSize = props.itemSize ?? 40;
  const pinKeys = props.pinKeys;

  return defineComponent({
    setup() {
      const scrollerRef = ref<HTMLDivElement | null>(null);
      const rows = Array.from({ length: count }, (_, i) => ({
        id: `r${i}`,
        label: `Row ${i}`,
      }));
      const v = useVirtualWindow({
        count: rows.length,
        getItemKey: (i) => rows[i]!.id,
        estimateSize: () => itemSize,
        overscan: 1,
        getScrollElement: () => scrollerRef.value,
        pinKeys,
      });
      return { scrollerRef, rows, v, itemSize };
    },
    render() {
      return h(
        "div",
        {
          ref: "scrollerRef",
          "data-testid": "scroller",
          style: { height: "200px", overflow: "auto" },
        },
        [
          h("div", {
            "data-testid": "pad-start",
            style: { height: `${this.v.padStart.value}px` },
          }),
          ...this.v.virtualItems.value.map((item) =>
            h(
              "div",
              {
                key: item.key,
                "data-index": item.index,
                "data-testid": `row-${item.index}`,
                ref: (el: unknown) =>
                  this.v.measureElement(el as Element | null),
                style: { height: `${this.itemSize}px` },
              },
              this.rows[item.index]!.label,
            ),
          ),
          h("div", {
            "data-testid": "pad-end",
            style: { height: `${this.v.padEnd.value}px` },
          }),
          h("div", { "data-testid": "total" }, String(this.v.totalSize.value)),
          h(
            "div",
            { "data-testid": "mounted-count" },
            String(this.v.virtualItems.value.length),
          ),
        ],
      );
    },
  });
}

function mockScroller(
  el: HTMLElement,
  opts: { clientHeight?: number; scrollTop?: number },
) {
  Object.defineProperty(el, "clientHeight", {
    configurable: true,
    value: opts.clientHeight ?? 200,
  });
  Object.defineProperty(el, "clientWidth", {
    configurable: true,
    value: 300,
  });
  let scrollTop = opts.scrollTop ?? 0;
  Object.defineProperty(el, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (v: number) => {
      scrollTop = v;
    },
  });
  Object.defineProperty(el, "scrollLeft", {
    configurable: true,
    get: () => 0,
    set: () => {},
  });
}

describe("useVirtualWindow", () => {
  it("mounts only a window of rows, not the full list", async () => {
    const Fixture = makeFixture({ count: 100, itemSize: 40 });
    const wrapper = mount(Fixture, { attachTo: document.body });
    const scroller = wrapper.get('[data-testid="scroller"]').element as HTMLElement;
    mockScroller(scroller, { clientHeight: 200, scrollTop: 0 });
    scroller.dispatchEvent(new Event("scroll"));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="row-0"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="row-99"]').exists()).toBe(false);
    const mounted = Number(
      wrapper.get('[data-testid="mounted-count"]').text(),
    );
    expect(mounted).toBeLessThan(30);
    expect(wrapper.get('[data-testid="total"]').text()).toBe("4000");
  });

  it("updates the window on scroll", async () => {
    const Fixture = makeFixture({ count: 100, itemSize: 40 });
    const wrapper = mount(Fixture, { attachTo: document.body });
    const scroller = wrapper.get('[data-testid="scroller"]').element as HTMLElement;
    mockScroller(scroller, { clientHeight: 200, scrollTop: 2000 });
    scroller.dispatchEvent(new Event("scroll"));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="row-0"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="row-50"]').exists()).toBe(true);
  });

  it("keeps pinKeys mounted when outside the natural window", async () => {
    const Fixture = makeFixture({ count: 100, itemSize: 40, pinKeys: ["r0"] });
    const wrapper = mount(Fixture, { attachTo: document.body });
    const scroller = wrapper.get('[data-testid="scroller"]').element as HTMLElement;
    mockScroller(scroller, { clientHeight: 200, scrollTop: 3000 });
    scroller.dispatchEvent(new Event("scroll"));
    await wrapper.vm.$nextTick();

    // Natural window is near the end; the pin expands range to include r0.
    expect(wrapper.find('[data-testid="row-0"]').exists()).toBe(true);
  });

  it("does not introduce transform styles on mounted rows", async () => {
    const Fixture = makeFixture({ count: 20, itemSize: 40 });
    const wrapper = mount(Fixture, { attachTo: document.body });
    const scroller = wrapper.get('[data-testid="scroller"]').element as HTMLElement;
    mockScroller(scroller, { clientHeight: 200, scrollTop: 0 });
    scroller.dispatchEvent(new Event("scroll"));
    await wrapper.vm.$nextTick();
    const row = wrapper.get('[data-testid="row-0"]').element as HTMLElement;
    expect(row.style.transform).toBe("");
    expect(scroller.style.transform).toBe("");
  });
});

describe("useVirtualWindow — SSR safety", () => {
  it("module imports without touching window / ResizeObserver", async () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const originalRO = globalThis.ResizeObserver;
    // @ts-expect-error simulate a Node/SSR global scope
    delete (globalThis as { window?: unknown }).window;
    // @ts-expect-error same
    delete (globalThis as { document?: unknown }).document;
    // @ts-expect-error same
    delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
    try {
      // Fresh import to defeat vitest module caching for this file.
      vi.resetModules();
      const mod = await import("./useVirtualWindow.js");
      expect(typeof mod.useVirtualWindow).toBe("function");
    } finally {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
      globalThis.ResizeObserver = originalRO;
    }
  });
});
