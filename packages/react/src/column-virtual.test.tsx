import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Grid } from "./Grid.js";

function manyColumns(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `c${i}`,
    header: `Col${i}`,
    width: 100 as const,
  }));
}

function manyRows(cols: number) {
  const row: Record<string, unknown> & { id: string } = { id: "1" };
  for (let i = 0; i < cols; i++) row[`c${i}`] = `v${i}`;
  return [row];
}

describe("column virtualization", () => {
  it("does not mount all headers when scrolled (windowed columns)", () => {
    const cols = 40;
    render(
      <Grid
        rows={manyRows(cols)}
        columns={manyColumns(cols)}
        style={{ width: 300, height: 200 }}
        overscan={1}
      />,
    );
    const grid = screen.getByRole("grid");
    // Simulate a narrow viewport scrolled into the middle
    Object.defineProperty(grid, "clientWidth", {
      configurable: true,
      value: 300,
    });
    Object.defineProperty(grid, "clientHeight", {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(grid, "scrollLeft", {
      configurable: true,
      value: 1500,
    });
    Object.defineProperty(grid, "scrollTop", {
      configurable: true,
      value: 0,
    });
    fireEvent.scroll(grid);

    // Far-left header should be gone; mid headers present
    expect(screen.queryByText("Col0")).toBeNull();
    expect(screen.queryByText("Col39")).toBeNull();
    // At scrollLeft 1500 with width 100 → ~col 15
    expect(screen.getByText("Col15")).toBeTruthy();
  });

  it("can disable column virtualization", () => {
    render(
      <Grid
        rows={manyRows(10)}
        columns={manyColumns(10)}
        virtualizeColumns={false}
        style={{ width: 200, height: 200 }}
      />,
    );
    expect(screen.getByText("Col0")).toBeTruthy();
    expect(screen.getByText("Col9")).toBeTruthy();
  });
});
