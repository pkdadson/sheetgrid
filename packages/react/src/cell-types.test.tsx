import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Grid } from "./Grid.js";

describe("built-in cell types", () => {
  it("toggles boolean cells without text editor", async () => {
    const onRowsChange = vi.fn();
    render(
      <Grid
        rows={[{ id: "1", name: "Ada", active: false }]}
        columns={[
          { id: "name", header: "Name" },
          { id: "active", header: "Active", type: "boolean" },
        ]}
        onRowsChange={onRowsChange}
      />,
    );
    const checkbox = screen.getByRole("checkbox", {
      name: "Active",
    }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    await vi.waitFor(() => {
      expect(onRowsChange).toHaveBeenCalled();
    });
    const next = onRowsChange.mock.calls[0]?.[0] as Array<
      Record<string, unknown>
    >;
    expect(next[0]?.active).toBe(true);
  });

  it("renders select labels from options", () => {
    render(
      <Grid
        rows={[{ id: "1", status: "open" }]}
        columns={[
          {
            id: "status",
            header: "Status",
            type: "select",
            selectOptions: [
              { label: "Open", value: "open" },
              { label: "Done", value: "done" },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText("Open")).toBeTruthy();
  });
});
