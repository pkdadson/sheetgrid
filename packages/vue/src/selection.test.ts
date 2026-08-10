import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
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

function cellAt(wrapper: ReturnType<typeof mount>, text: string) {
  // biome-ignore lint/style/noNonNullAssertion: cell is guaranteed to exist in this test fixture
  return wrapper.findAll('[role="cell"]').find((c) => c.text().includes(text))!;
}

describe("SheetGrid selection", () => {
  it("shift-click extends selection from active cell", async () => {
    const wrapper = mount(SheetGrid, {
      props: { rows, columns },
      attachTo: document.body,
    });
    await cellAt(wrapper, "Ada").trigger("mousedown");
    await nextTick();
    await cellAt(wrapper, "Alan").trigger("mousedown", { shiftKey: true });
    await nextTick();

    const selected = wrapper
      .findAll('[aria-selected="true"]')
      .map((c) => c.text());
    // Range Ada..Alan should include all three rows' name column
    expect(selected).toContain("Ada");
    expect(selected).toContain("Grace");
    expect(selected).toContain("Alan");
  });

  it("ctrl/cmd click toggles the cell in/out of the selection", async () => {
    const wrapper = mount(SheetGrid, {
      props: { rows, columns },
      attachTo: document.body,
    });
    await cellAt(wrapper, "Ada").trigger("mousedown");
    await nextTick();
    await cellAt(wrapper, "Grace").trigger("mousedown", { ctrlKey: true });
    await nextTick();

    const selected = wrapper
      .findAll('[aria-selected="true"]')
      .map((c) => c.text());
    expect(selected).toContain("Ada");
    expect(selected).toContain("Grace");

    // Toggle Grace back off
    await cellAt(wrapper, "Grace").trigger("mousedown", { ctrlKey: true });
    await nextTick();
    const afterToggle = wrapper
      .findAll('[aria-selected="true"]')
      .map((c) => c.text());
    expect(afterToggle).toContain("Ada");
    expect(afterToggle).not.toContain("Grace");
  });
});
