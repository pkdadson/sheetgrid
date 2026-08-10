import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SheetGrid from "./SheetGrid.vue";

describe("SheetGrid accessibility", () => {
  it("sets aria-rowcount and aria-colcount on the grid element", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [
          { id: "1", a: 1, b: 2 },
          { id: "2", a: 3, b: 4 },
          { id: "3", a: 5, b: 6 },
        ],
        columns: [
          { id: "a", header: "A" },
          { id: "b", header: "B" },
        ],
      },
      attachTo: document.body,
    });
    const grid = wrapper.get('[role="grid"]');
    expect(grid.attributes("aria-rowcount")).toBe("3");
    expect(grid.attributes("aria-colcount")).toBe("2");
  });

  it("applies ariaLabel to the grid when provided", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        ariaLabel: "Team roster",
        rows: [{ id: "1", name: "Ada" }],
        columns: [{ id: "name", header: "Name" }],
      },
      attachTo: document.body,
    });
    expect(wrapper.get('[role="grid"]').attributes("aria-label")).toBe(
      "Team roster",
    );
  });

  it("sort button has an aria-label for screen readers", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [{ id: "1", name: "Ada" }],
        columns: [{ id: "name", header: "Name" }],
      },
      attachTo: document.body,
    });
    const btn = wrapper.find("button.eg-sort-btn");
    expect(btn.exists()).toBe(true);
    expect(btn.attributes("aria-label")).toBe("Sort by Name");
  });
});
