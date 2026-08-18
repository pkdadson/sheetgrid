import { describe, expect, it } from "vitest";
import type { ColumnDef, GridRow, SortSpec } from "../types.js";
import { sortRows } from "./sort-rows.js";

const cols: ColumnDef[] = [
  { id: "name", header: "Name" },
  { id: "score", header: "Score", type: "number" },
  { id: "active", header: "Active", type: "boolean" },
];

const rows: GridRow[] = [
  { id: "1", values: { name: "Ada", score: 98, active: true } },
  { id: "2", values: { name: "Grace", score: 99, active: true } },
  { id: "3", values: { name: "Alan", score: 97, active: false } },
  { id: "4", values: { name: "Kat", score: null, active: true } },
];

describe("sortRows", () => {
  it("returns identity when spec is empty", () => {
    const out = sortRows(rows, cols, []);
    expect(out.map((r) => r.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("sorts asc by number, nulls last", () => {
    const spec: SortSpec[] = [{ columnId: "score", direction: "asc" }];
    const out = sortRows(rows, cols, spec);
    expect(out.map((r) => r.id)).toEqual(["3", "1", "2", "4"]);
  });

  it("sorts desc by number, nulls still last", () => {
    const spec: SortSpec[] = [{ columnId: "score", direction: "desc" }];
    const out = sortRows(rows, cols, spec);
    expect(out.map((r) => r.id)).toEqual(["2", "1", "3", "4"]);
  });

  it("sorts asc by string with Intl.Collator", () => {
    const spec: SortSpec[] = [{ columnId: "name", direction: "asc" }];
    const out = sortRows(rows, cols, spec);
    expect(out.map((r) => r.id)).toEqual(["1", "3", "2", "4"]);
  });

  it("is stable — equal keys preserve source order", () => {
    const spec: SortSpec[] = [{ columnId: "active", direction: "asc" }];
    const out = sortRows(rows, cols, spec);
    expect(out.map((r) => r.id)).toEqual(["3", "1", "2", "4"]);
  });

  it("applies multi-column with primary/secondary priority", () => {
    const spec: SortSpec[] = [
      { columnId: "active", direction: "desc" },
      { columnId: "score", direction: "asc" },
    ];
    const out = sortRows(rows, cols, spec);
    expect(out.map((r) => r.id)).toEqual(["1", "2", "4", "3"]);
  });

  it("uses column.comparator when provided (overrides default)", () => {
    const custom: ColumnDef[] = [
      {
        id: "name",
        header: "Name",
        comparator: (a, b) => String(b).localeCompare(String(a)),
      } as ColumnDef,
    ];
    const spec: SortSpec[] = [{ columnId: "name", direction: "asc" }];
    const out = sortRows(rows, custom, spec);
    expect(out.map((r) => r.id)).toEqual(["4", "2", "3", "1"]);
  });

  it("skips spec entries whose columnId is unknown", () => {
    const spec: SortSpec[] = [{ columnId: "missing", direction: "asc" }];
    const out = sortRows(rows, cols, spec);
    expect(out.map((r) => r.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("passes direction into custom comparator via ctx", () => {
    const seen: string[] = [];
    const custom: ColumnDef[] = [
      {
        id: "score",
        header: "Score",
        type: "number",
        comparator: (_a, _b, ctx) => {
          seen.push(ctx.direction);
          return 0;
        },
      } as ColumnDef,
    ];
    sortRows(rows, custom, [{ columnId: "score", direction: "desc" }]);
    expect(seen.every((d) => d === "desc")).toBe(true);
  });
});
