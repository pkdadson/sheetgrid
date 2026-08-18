import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Grid } from "./Grid.js";

const rows = [
  { id: "1", name: "Ada", score: 98 },
  { id: "2", name: "Grace", score: 99 },
  { id: "3", name: "Alan", score: 97 },
];
const columns = [
  { id: "name", header: "Name" },
  { id: "score", header: "Score", type: "number" as const },
];

function rowOrder() {
  return screen
    .getAllByRole("row")
    .map((r) => r.textContent ?? "")
    .filter((t) => /Ada|Grace|Alan|Kat/.test(t))
    .map((t) => t.match(/Ada|Grace|Alan|Kat/)?.[0] ?? "");
}

describe("sort UI", () => {
  afterEach(() => cleanup());

  it("cycles none → asc → desc → none on click of a sortable header", () => {
    render(<Grid rows={rows} columns={columns} />);
    const btn = screen.getByRole("button", { name: "Sort by Score" });
    expect(rowOrder()).toEqual(["Ada", "Grace", "Alan"]);
    fireEvent.click(btn);
    expect(rowOrder()).toEqual(["Alan", "Ada", "Grace"]);
    fireEvent.click(btn);
    expect(rowOrder()).toEqual(["Grace", "Ada", "Alan"]);
    fireEvent.click(btn);
    expect(rowOrder()).toEqual(["Ada", "Grace", "Alan"]);
  });

  it("shift-click adds a secondary sort and renders numeric priority badges", () => {
    render(<Grid rows={rows} columns={columns} />);
    fireEvent.click(screen.getByRole("button", { name: "Sort by Name" }));
    fireEvent.click(screen.getByRole("button", { name: "Sort by Score" }), {
      shiftKey: true,
    });
    const nameHeader = screen.getByRole("columnheader", { name: /Name/i });
    const scoreHeader = screen.getByRole("columnheader", { name: /Score/i });
    expect(nameHeader.textContent).toMatch(/1/);
    expect(scoreHeader.textContent).toMatch(/2/);
  });

  it("shift-click on the same column cycles asc → desc → remove", () => {
    const onSortChange = vi.fn();
    render(<Grid rows={rows} columns={columns} onSortChange={onSortChange} />);
    const btn = screen.getByRole("button", { name: "Sort by Score" });
    fireEvent.click(btn, { shiftKey: true });
    fireEvent.click(btn, { shiftKey: true });
    fireEvent.click(btn, { shiftKey: true });
    expect(onSortChange).toHaveBeenLastCalledWith([]);
  });

  it("does not render a sort button when sortable=false", () => {
    render(
      <Grid
        rows={rows}
        columns={[
          { id: "name", header: "Name" },
          { id: "score", header: "Score", type: "number", sortable: false },
        ]}
      />,
    );
    expect(screen.queryByRole("button", { name: "Sort by Score" })).toBeNull();
    expect(screen.getByRole("columnheader", { name: /Score/i })).toBeTruthy();
  });

  it("aria-sort reflects direction on active columns", () => {
    render(<Grid rows={rows} columns={columns} />);
    const scoreHeader = screen.getByRole("columnheader", { name: /Score/i });
    expect(scoreHeader.getAttribute("aria-sort")).toBe("none");
    fireEvent.click(screen.getByRole("button", { name: "Sort by Score" }));
    expect(scoreHeader.getAttribute("aria-sort")).toBe("ascending");
    fireEvent.click(screen.getByRole("button", { name: "Sort by Score" }));
    expect(scoreHeader.getAttribute("aria-sort")).toBe("descending");
  });

  it("Enter and Space trigger sort; Shift+Enter triggers shift sort", () => {
    render(<Grid rows={rows} columns={columns} />);
    const btn = screen.getByRole("button", { name: "Sort by Score" });
    fireEvent.keyDown(btn, { key: "Enter" });
    expect(rowOrder()).toEqual(["Alan", "Ada", "Grace"]);
    fireEvent.keyDown(btn, { key: " " });
    expect(rowOrder()).toEqual(["Grace", "Ada", "Alan"]);
    fireEvent.keyDown(screen.getByRole("button", { name: "Sort by Name" }), {
      key: "Enter",
      shiftKey: true,
    });
    const nameHeader = screen.getByRole("columnheader", { name: /Name/i });
    expect(nameHeader.textContent).toMatch(/2/);
  });

  it("controlled mode: parent prop wins over internal click", () => {
    const onSortChange = vi.fn();
    render(
      <Grid
        rows={rows}
        columns={columns}
        sortBy={[{ columnId: "score", direction: "asc" }]}
        onSortChange={onSortChange}
      />,
    );
    expect(rowOrder()).toEqual(["Alan", "Ada", "Grace"]);
    fireEvent.click(screen.getByRole("button", { name: "Sort by Score" }));
    expect(rowOrder()).toEqual(["Alan", "Ada", "Grace"]);
    expect(onSortChange).toHaveBeenCalled();
  });

  it("clicking a sort header does not select the column", () => {
    render(<Grid rows={rows} columns={columns} />);
    fireEvent.click(screen.getByRole("button", { name: "Sort by Score" }));
    const selected = document.querySelectorAll('td[aria-selected="true"]');
    expect(selected.length).toBe(0);
  });

  it("sort persists across a rows prop replacement", () => {
    const { rerender } = render(<Grid rows={rows} columns={columns} />);
    fireEvent.click(screen.getByRole("button", { name: "Sort by Score" }));
    expect(rowOrder()).toEqual(["Alan", "Ada", "Grace"]);
    const next = [...rows, { id: "4", name: "Kat", score: 100 }];
    rerender(<Grid rows={next} columns={columns} />);
    expect(rowOrder()).toEqual(["Alan", "Ada", "Grace", "Kat"]);
  });
});

describe("sort UI + row grouping", () => {
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

  afterEach(() => cleanup());

  it("sorts within groups when clicking a non-grouped column", () => {
    render(
      <Grid
        rows={groupedRows}
        columns={groupedCols}
        rowGrouping={{ columns: ["region"] }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sort by Score" }));
    const order = screen
      .getAllByRole("row")
      .map((r) => r.textContent ?? "")
      .filter((t) => /Ada|Grace|Alan|Kat/.test(t))
      .map((t) => t.match(/Ada|Grace|Alan|Kat/)?.[0] ?? "");
    expect(order).toEqual(["Alan", "Ada", "Grace", "Kat"]);
  });

  it("sort by grouped column reorders groups", () => {
    render(
      <Grid
        rows={groupedRows}
        columns={groupedCols}
        rowGrouping={{ columns: ["region"] }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sort by Region" }));
    fireEvent.click(screen.getByRole("button", { name: "Sort by Region" }));
    const order = screen
      .getAllByRole("row")
      .map((r) => r.textContent ?? "")
      .filter((t) => /Ada|Grace|Alan|Kat/.test(t))
      .map((t) => t.match(/Ada|Grace|Alan|Kat/)?.[0] ?? "");
    expect(order.slice(0, 2).sort()).toEqual(["Grace", "Kat"]);
    expect(order.slice(2).sort()).toEqual(["Ada", "Alan"]);
  });
});
