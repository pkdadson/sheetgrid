import { describe, expect, it } from "vitest";
import { buildVisibleRows, flattenColumnGroups } from "./visible-rows.js";

describe("buildVisibleRows", () => {
  it("returns body rows when no grouping", () => {
    const rows = [
      { id: "1", values: { region: "EU", name: "A" } },
      { id: "2", values: { region: "US", name: "B" } },
    ];
    const visible = buildVisibleRows(rows, { groupBy: [] }, {});
    expect(visible.map((v) => v.type)).toEqual(["body", "body"]);
  });

  it("inserts group headers and nests by field", () => {
    const rows = [
      { id: "1", values: { region: "EU", name: "A" } },
      { id: "2", values: { region: "EU", name: "B" } },
      { id: "3", values: { region: "US", name: "C" } },
    ];
    const visible = buildVisibleRows(
      rows,
      { groupBy: ["region"] },
      { "region:EU": true, "region:US": true },
    );
    expect(visible[0]).toMatchObject({
      type: "group",
      key: "region:EU",
      count: 2,
    });
    expect(visible.filter((v) => v.type === "body")).toHaveLength(3);
  });

  it("hides children when group collapsed", () => {
    const rows = [
      { id: "1", values: { region: "EU", name: "A" } },
      { id: "2", values: { region: "EU", name: "B" } },
    ];
    const visible = buildVisibleRows(
      rows,
      { groupBy: ["region"] },
      { "region:EU": false },
    );
    expect(visible.filter((v) => v.type === "body")).toHaveLength(0);
    expect(visible).toHaveLength(1);
  });
});

describe("flattenColumnGroups", () => {
  it("computes colSpan for header groups", () => {
    const levels = flattenColumnGroups(
      [
        {
          id: "metrics",
          header: "Q1",
          children: ["revenue", "cost"],
        },
      ],
      ["revenue", "cost", "name"],
      { leafHeaders: { revenue: "Revenue", cost: "Cost", name: "Name" } },
    );
    expect(levels).toHaveLength(2);
    expect(levels[0]!.some((c) => c.id === "metrics" && c.colSpan === 2)).toBe(
      true,
    );
    expect(levels[0]!.find((c) => c.id === "metrics")?.header).toBe("Q1");
    expect(levels[1]!.map((c) => c.header)).toEqual([
      "Revenue",
      "Cost",
      "Name",
    ]);
  });

  it("single level when no groups", () => {
    const levels = flattenColumnGroups([], ["a", "b"], {
      leafHeaders: { a: "A", b: "B" },
    });
    expect(levels).toHaveLength(1);
    expect(levels[0]!.map((c) => c.header)).toEqual(["A", "B"]);
  });
});
