import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SheetGrid from "./SheetGrid.vue";

describe("SheetGrid", () => {
  it("renders headers and cell values from rows/columns", () => {
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
    const text = wrapper.text();
    expect(text).toContain("Name");
    expect(text).toContain("Age");
    expect(text).toContain("Ada");
    expect(text).toContain("36");
  });
});
