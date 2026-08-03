import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Grid } from "./Grid.js";

describe("Grid", () => {
  it("renders headers and cell values from rows/columns", () => {
    render(
      <Grid
        rows={[{ id: "1", name: "Ada", age: 36 }]}
        columns={[
          { id: "name", header: "Name" },
          { id: "age", header: "Age" },
        ]}
      />,
    );
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.getByText("36")).toBeTruthy();
  });

  it("renders 2D data with headerRow", () => {
    render(
      <Grid
        data={[
          ["Name", "Age"],
          ["Grace", 40],
        ]}
        headerRow
      />,
    );
    expect(screen.getByText("Grace")).toBeTruthy();
  });
});
