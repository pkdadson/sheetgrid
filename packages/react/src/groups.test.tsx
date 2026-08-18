import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Grid } from "./Grid.js";

describe("Grid columnGroups", () => {
  it("renders multi-level column header bands", () => {
    render(
      <Grid
        rows={[{ id: "1", name: "Ada", role: "Eng", region: "EU", score: 1 }]}
        columns={[
          { id: "name", header: "Name", width: 100 },
          { id: "role", header: "Role", width: 100 },
          { id: "region", header: "Region", width: 100 },
          { id: "score", header: "Score", width: 100 },
        ]}
        columnGroups={[
          { id: "person", header: "Person", children: ["name", "role"] },
          { id: "work", header: "Work", children: ["region", "score"] },
        ]}
        virtualizeColumns={false}
      />,
    );
    expect(screen.getByText("Person")).toBeTruthy();
    expect(screen.getByText("Work")).toBeTruthy();
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByText("Score")).toBeTruthy();
    expect(
      screen
        .getByRole("columnheader", { name: "Person" })
        .getAttribute("colspan"),
    ).toBe("2");
    expect(
      screen
        .getByRole("columnheader", { name: "Work" })
        .getAttribute("colspan"),
    ).toBe("2");
  });
});
