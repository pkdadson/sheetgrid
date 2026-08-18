import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Grid } from "./Grid.js";
import { useGridController } from "./useGridController.js";

afterEach(cleanup);

function PasteFixture() {
  const c = useGridController();
  (globalThis as any).__c = c;
  return (
    <div style={{ height: 300 }}>
      <Grid
        controller={c}
        rows={[
          { id: "r1", a: "", b: "" },
          { id: "r2", a: "", b: "" },
        ]}
        columns={[
          { id: "a", header: "A" },
          { id: "b", header: "B" },
        ]}
      />
    </div>
  );
}

describe("paste-as-compound-command", () => {
  it("one undo after a multi-cell paste reverts every cell", async () => {
    render(<PasteFixture />);
    await act(async () => {});
    const c = (globalThis as any).__c;
    // Simulate: agent pastes a 2x2 TSV via controller.setCells.
    c.setCells([
      { rowId: "r1", columnId: "a", value: "1" },
      { rowId: "r1", columnId: "b", value: "2" },
      { rowId: "r2", columnId: "a", value: "3" },
      { rowId: "r2", columnId: "b", value: "4" },
    ]);
    expect(c.canUndo()).toBe(true);
    c.undo();
    const data = c.getData();
    expect(data.rows[0]!.values.a).toBe("");
    expect(data.rows[0]!.values.b).toBe("");
    expect(data.rows[1]!.values.a).toBe("");
    expect(data.rows[1]!.values.b).toBe("");
  });
});
