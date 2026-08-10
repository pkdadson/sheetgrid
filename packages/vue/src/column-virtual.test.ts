import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import SheetGrid from "./SheetGrid.vue";
import type { VueColumnDef } from "./column-types.js";
import type { ObjectRow } from "./column-types.js";

function manyColumns(n: number): VueColumnDef[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `c${i}`,
    header: `Col${i}`,
    width: 100 as const,
  }));
}

function manyRows(cols: number): ObjectRow[] {
  const row: ObjectRow = { id: "1" };
  for (let i = 0; i < cols; i++) row[`c${i}`] = `v${i}`;
  return [row];
}

function mockScrollBox(
  el: HTMLElement,
  opts: {
    clientWidth?: number;
    clientHeight?: number;
    scrollLeft?: number;
    scrollTop?: number;
  },
) {
  Object.defineProperty(el, "clientWidth", {
    configurable: true,
    value: opts.clientWidth ?? 300,
  });
  Object.defineProperty(el, "clientHeight", {
    configurable: true,
    value: opts.clientHeight ?? 200,
  });
  Object.defineProperty(el, "scrollLeft", {
    configurable: true,
    value: opts.scrollLeft ?? 0,
  });
  Object.defineProperty(el, "scrollTop", {
    configurable: true,
    value: opts.scrollTop ?? 0,
  });
}

describe("SheetGrid column virtualization", () => {
  it("does not mount all headers when scrolled (windowed columns)", async () => {
    const cols = 40;
    const wrapper = mount(SheetGrid, {
      props: {
        rows: manyRows(cols),
        columns: manyColumns(cols),
        overscan: 1,
      },
      attachTo: document.body,
    });
    const grid = wrapper.get('[role="grid"]').element as HTMLElement;
    mockScrollBox(grid, {
      clientWidth: 300,
      clientHeight: 200,
      scrollLeft: 1500,
      scrollTop: 0,
    });
    grid.dispatchEvent(new Event("scroll"));
    await nextTick();

    const text = wrapper.text();
    expect(text).not.toContain("Col0");
    expect(text).not.toContain("Col39");
    // At scrollLeft 1500 with width 100 → col 15
    expect(text).toContain("Col15");
  });

  it("can disable column virtualization", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: manyRows(10),
        columns: manyColumns(10),
        virtualizeColumns: false,
      },
      attachTo: document.body,
    });
    const text = wrapper.text();
    expect(text).toContain("Col0");
    expect(text).toContain("Col9");
  });
});
