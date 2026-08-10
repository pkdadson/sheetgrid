import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import SheetGrid from "./SheetGrid.vue";

const groupedRows = [
  { id: "1", name: "Ada", region: "EU", score: 98 },
  { id: "2", name: "Grace", region: "US", score: 99 },
  { id: "3", name: "Alan", region: "EU", score: 97 },
  { id: "4", name: "Kat", region: "US", score: 100 },
];
const groupedCols = [
  { id: "name", header: "Name" },
  { id: "region", header: "Region" },
  { id: "score", header: "Score", type: "number" as const },
];

function nameOrder(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('[role="row"]'))
    .map((r) => r.textContent ?? "")
    .filter((t) => /Ada|Grace|Alan|Kat/.test(t))
    .map((t) => t.match(/Ada|Grace|Alan|Kat/)?.[0] ?? "");
}

describe("SheetGrid row grouping", () => {
  it("renders group header rows for each unique group-column value", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: groupedRows,
        columns: groupedCols,
        rowGrouping: { columns: ["region"] },
      },
      attachTo: document.body,
    });
    // Two groups: EU (2 rows) and US (2 rows)
    const groupRows = wrapper.findAll("tr.eg-group-row");
    expect(groupRows.length).toBe(2);
    const text = wrapper.text();
    expect(text).toContain("EU");
    expect(text).toContain("US");
  });

  it("sorts within groups when sorting a non-grouped column", async () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: groupedRows,
        columns: groupedCols,
        rowGrouping: { columns: ["region"] },
      },
      attachTo: document.body,
    });
    const el = wrapper.element as HTMLElement;
    // biome-ignore lint/style/noNonNullAssertion: button is always present in test DOM
    const scoreBtn = Array.from(el.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === "Sort by Score",
    )!;
    scoreBtn.click();
    await nextTick();

    // First group is EU: Alan (97) then Ada (98). Second group is US: Grace (99) then Kat (100).
    expect(nameOrder(el)).toEqual(["Alan", "Ada", "Grace", "Kat"]);
  });

  it("collapses a group when the toggle button is clicked", async () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: groupedRows,
        columns: groupedCols,
        rowGrouping: { columns: ["region"] },
      },
      attachTo: document.body,
    });
    // Both groups visible initially
    expect(nameOrder(wrapper.element as HTMLElement).length).toBe(4);

    // Click the first group's toggle
    const firstToggle = wrapper.get("tr.eg-group-row button.eg-group-toggle");
    await firstToggle.trigger("click");
    await nextTick();

    // Only one group's rows remain visible (the other group is collapsed)
    expect(nameOrder(wrapper.element as HTMLElement).length).toBeLessThan(4);
  });
});
