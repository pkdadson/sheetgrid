import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import SheetGrid from "./SheetGrid.vue";

const rows = [
  { id: "1", name: "Ada", score: 98 },
  { id: "2", name: "Grace", score: 99 },
  { id: "3", name: "Alan", score: 97 },
];
const columns = [
  { id: "name", header: "Name" },
  { id: "score", header: "Score", type: "number" as const },
];

function rowOrder(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('[role="row"]'))
    .map((r) => r.textContent ?? "")
    .filter((t) => /Ada|Grace|Alan|Kat/.test(t))
    .map((t) => t.match(/Ada|Grace|Alan|Kat/)?.[0] ?? "");
}

describe("SheetGrid sort UI", () => {
  it("cycles none → asc → desc → none on click of a sortable header", async () => {
    const wrapper = mount(SheetGrid, {
      props: { rows, columns },
      attachTo: document.body,
    });
    const el = wrapper.element as HTMLElement;
    const btn = () =>
      // biome-ignore lint/style/noNonNullAssertion: button is always present in test DOM
      Array.from(el.querySelectorAll("button")).find(
        (b) => b.getAttribute("aria-label") === "Sort by Score",
      )!;
    expect(rowOrder(el)).toEqual(["Ada", "Grace", "Alan"]);
    btn().click();
    await new Promise((r) => setTimeout(r, 0));
    expect(rowOrder(el)).toEqual(["Alan", "Ada", "Grace"]);
    btn().click();
    await new Promise((r) => setTimeout(r, 0));
    expect(rowOrder(el)).toEqual(["Grace", "Ada", "Alan"]);
    btn().click();
    await new Promise((r) => setTimeout(r, 0));
    expect(rowOrder(el)).toEqual(["Ada", "Grace", "Alan"]);
  });

  it("shift-click adds a secondary sort and renders numeric priority badges", async () => {
    const wrapper = mount(SheetGrid, {
      props: { rows, columns },
      attachTo: document.body,
    });
    const el = wrapper.element as HTMLElement;
    const btn = (label: string) =>
      // biome-ignore lint/style/noNonNullAssertion: button is always present in test DOM
      Array.from(el.querySelectorAll("button")).find(
        (b) => b.getAttribute("aria-label") === `Sort by ${label}`,
      )!;
    btn("Name").click();
    await new Promise((r) => setTimeout(r, 0));
    btn("Score").dispatchEvent(
      new MouseEvent("click", { bubbles: true, shiftKey: true }),
    );
    await new Promise((r) => setTimeout(r, 0));
    // Name has priority 1 (asc), score priority 2
    const nameText =
      Array.from(el.querySelectorAll('[role="columnheader"]')).find((h) =>
        h.textContent?.includes("Name"),
      )?.textContent ?? "";
    const scoreText =
      Array.from(el.querySelectorAll('[role="columnheader"]')).find((h) =>
        h.textContent?.includes("Score"),
      )?.textContent ?? "";
    expect(nameText).toMatch(/1/);
    expect(scoreText).toMatch(/2/);
  });

  it("shift-click on the same column cycles asc → desc → remove", async () => {
    const onSortChange = vi.fn();
    const wrapper = mount(SheetGrid, {
      props: { rows, columns, onSortChange },
      attachTo: document.body,
    });
    const el = wrapper.element as HTMLElement;
    const btn = () =>
      // biome-ignore lint/style/noNonNullAssertion: button is always present in test DOM
      Array.from(el.querySelectorAll("button")).find(
        (b) => b.getAttribute("aria-label") === "Sort by Score",
      )!;
    btn().dispatchEvent(
      new MouseEvent("click", { bubbles: true, shiftKey: true }),
    );
    await new Promise((r) => setTimeout(r, 0));
    btn().dispatchEvent(
      new MouseEvent("click", { bubbles: true, shiftKey: true }),
    );
    await new Promise((r) => setTimeout(r, 0));
    btn().dispatchEvent(
      new MouseEvent("click", { bubbles: true, shiftKey: true }),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(onSortChange).toHaveBeenLastCalledWith([]);
  });

  it("does not render a sort button when sortable=false", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows,
        columns: [
          { id: "name", header: "Name" },
          {
            id: "score",
            header: "Score",
            type: "number" as const,
            sortable: false,
          },
        ],
      },
      attachTo: document.body,
    });
    const el = wrapper.element as HTMLElement;
    const btn = Array.from(el.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === "Sort by Score",
    );
    expect(btn).toBeUndefined();
    // Score header still exists as a columnheader with label text
    const scoreHeader = Array.from(
      el.querySelectorAll('[role="columnheader"]'),
    ).find((h) => h.textContent?.includes("Score"));
    expect(scoreHeader).toBeTruthy();
  });

  it("aria-sort reflects direction on active columns", async () => {
    const wrapper = mount(SheetGrid, {
      props: { rows, columns },
      attachTo: document.body,
    });
    const el = wrapper.element as HTMLElement;
    const scoreHeader = () =>
      // biome-ignore lint/style/noNonNullAssertion: element is always present in test DOM
      Array.from(el.querySelectorAll('[role="columnheader"]')).find((h) =>
        h.textContent?.includes("Score"),
      )!;
    const btn = () =>
      // biome-ignore lint/style/noNonNullAssertion: button is always present in test DOM
      Array.from(el.querySelectorAll("button")).find(
        (b) => b.getAttribute("aria-label") === "Sort by Score",
      )!;
    expect(scoreHeader().getAttribute("aria-sort")).toBe("none");
    btn().click();
    await new Promise((r) => setTimeout(r, 0));
    expect(scoreHeader().getAttribute("aria-sort")).toBe("ascending");
    btn().click();
    await new Promise((r) => setTimeout(r, 0));
    expect(scoreHeader().getAttribute("aria-sort")).toBe("descending");
  });

  it("Enter and Space trigger sort; Shift+Enter triggers shift sort", async () => {
    const wrapper = mount(SheetGrid, {
      props: { rows, columns },
      attachTo: document.body,
    });
    const el = wrapper.element as HTMLElement;
    const btn = (label: string) =>
      // biome-ignore lint/style/noNonNullAssertion: button is always present in test DOM
      Array.from(el.querySelectorAll("button")).find(
        (b) => b.getAttribute("aria-label") === `Sort by ${label}`,
      )!;
    btn("Score").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(rowOrder(el)).toEqual(["Alan", "Ada", "Grace"]);
    btn("Score").dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true }),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(rowOrder(el)).toEqual(["Grace", "Ada", "Alan"]);
    btn("Name").dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
        bubbles: true,
      }),
    );
    await new Promise((r) => setTimeout(r, 0));
    const nameHeader = Array.from(
      el.querySelectorAll('[role="columnheader"]'),
    ).find((h) => h.textContent?.includes("Name"));
    expect(nameHeader?.textContent).toMatch(/2/);
  });

  it("controlled mode: parent prop wins over internal click", async () => {
    const onSortChange = vi.fn();
    const wrapper = mount(SheetGrid, {
      props: {
        rows,
        columns,
        sortBy: [{ columnId: "score", direction: "asc" as const }],
        onSortChange,
      },
      attachTo: document.body,
    });
    const el = wrapper.element as HTMLElement;
    expect(rowOrder(el)).toEqual(["Alan", "Ada", "Grace"]);
    // biome-ignore lint/style/noNonNullAssertion: button is always present in test DOM
    const btn = Array.from(el.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === "Sort by Score",
    )!;
    btn.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(rowOrder(el)).toEqual(["Alan", "Ada", "Grace"]);
    expect(onSortChange).toHaveBeenCalled();
  });

  it("clicking a sort header does not select the column", async () => {
    const wrapper = mount(SheetGrid, {
      props: { rows, columns },
      attachTo: document.body,
    });
    const el = wrapper.element as HTMLElement;
    // biome-ignore lint/style/noNonNullAssertion: button is always present in test DOM
    const btn = Array.from(el.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === "Sort by Score",
    )!;
    btn.click();
    await new Promise((r) => setTimeout(r, 0));
    const selected = el.querySelectorAll('td[aria-selected="true"]');
    expect(selected.length).toBe(0);
  });

  it("sort persists across a rows prop replacement", async () => {
    const wrapper = mount(SheetGrid, {
      props: { rows, columns },
      attachTo: document.body,
    });
    const el = wrapper.element as HTMLElement;
    // biome-ignore lint/style/noNonNullAssertion: button is always present in test DOM
    const btn = Array.from(el.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === "Sort by Score",
    )!;
    btn.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(rowOrder(el)).toEqual(["Alan", "Ada", "Grace"]);
    await wrapper.setProps({
      rows: [...rows, { id: "4", name: "Kat", score: 100 }],
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(rowOrder(el)).toEqual(["Alan", "Ada", "Grace", "Kat"]);
  });
});
