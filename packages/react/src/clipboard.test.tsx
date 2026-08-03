import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Grid } from "./Grid.js";

describe("Grid clipboard", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText,
        readText: vi.fn().mockResolvedValue("Z\t9"),
      },
    });
  });

  it("copies selection with Ctrl+C after selecting a cell", async () => {
    render(
      <Grid
        rows={[{ id: "1", name: "Ada", age: 36 }]}
        columns={[
          { id: "name", header: "Name" },
          { id: "age", header: "Age" },
        ]}
      />,
    );
    fireEvent.mouseDown(screen.getByText("Ada"));
    const grid = screen.getByRole("grid");
    grid.focus();
    fireEvent.keyDown(grid, { key: "c", code: "KeyC", ctrlKey: true });
    // allow async copySelection to settle
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalled();
    });
    expect(writeText.mock.calls[0]?.[0]).toContain("Ada");
  });
});
