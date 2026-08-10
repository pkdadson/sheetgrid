import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SheetGrid from "./SheetGrid.vue";

describe("SheetGrid columnGroups", () => {
  it("renders multi-level column header bands", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [{ id: "1", name: "Ada", role: "Eng", region: "EU", score: 1 }],
        columns: [
          { id: "name", header: "Name", width: 100 as const },
          { id: "role", header: "Role", width: 100 as const },
          { id: "region", header: "Region", width: 100 as const },
          { id: "score", header: "Score", width: 100 as const },
        ],
        columnGroups: [
          { id: "person", header: "Person", children: ["name", "role"] },
          { id: "work", header: "Work", children: ["region", "score"] },
        ],
        virtualizeColumns: false,
      },
      attachTo: document.body,
    });
    const text = wrapper.text();
    expect(text).toContain("Person");
    expect(text).toContain("Work");
    expect(text).toContain("Name");
    expect(text).toContain("Score");
    const el = wrapper.element as HTMLElement;
    const person = Array.from(
      el.querySelectorAll('[role="columnheader"]'),
    ).find((h) => h.textContent?.trim() === "Person");
    const work = Array.from(el.querySelectorAll('[role="columnheader"]')).find(
      (h) => h.textContent?.trim() === "Work",
    );
    expect(person?.getAttribute("colspan")).toBe("2");
    expect(work?.getAttribute("colspan")).toBe("2");
  });
});
