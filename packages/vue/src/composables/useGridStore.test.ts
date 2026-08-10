import type { ColumnDef, GridRow } from "@sheetgrid/core";
import { describe, expect, it } from "vitest";
import { effectScope, ref } from "vue";
import { useGridStore } from "./useGridStore.js";

function makeInput(): { rows: GridRow[]; columns: ColumnDef[] } {
  return {
    columns: [
      { id: "name", header: "Name" },
      { id: "age", header: "Age" },
    ],
    rows: [
      { id: "1", values: { name: "Ada", age: 36 } },
      { id: "2", values: { name: "Grace", age: 40 } },
    ],
  };
}

describe("useGridStore", () => {
  it("exposes reactive rows that update when the store mutates", () => {
    const { store, rows } = useGridStore(makeInput());
    expect(rows.value).toHaveLength(2);
    // biome-ignore lint/style/noNonNullAssertion: rows.value populated above
    expect(rows.value[0]!.values.name).toBe("Ada");

    store.setCell("1", "name", "Alan", "edit");
    // biome-ignore lint/style/noNonNullAssertion: same
    expect(rows.value[0]!.values.name).toBe("Alan");
  });

  it("exposes reactive columns via getOrderedColumns", () => {
    const { columns } = useGridStore(makeInput());
    expect(columns.value.map((c) => c.id)).toEqual(["name", "age"]);
  });

  it("accepts a reactive input (getter)", () => {
    const src = ref(makeInput());
    const { rows } = useGridStore(() => src.value);
    expect(rows.value).toHaveLength(2);
    // Composable only uses the input at creation time — caller manages
    // replacement, so updating `src` here does NOT change `rows`.
    src.value = { ...makeInput(), rows: [{ id: "9", values: {} }] };
    expect(rows.value).toHaveLength(2);
  });

  it("autoWatch: replaces rows when the reactive input changes", async () => {
    const src = ref(makeInput());
    const { rows } = useGridStore(() => src.value, { autoWatch: true });
    expect(rows.value).toHaveLength(2);

    src.value = {
      ...makeInput(),
      rows: [{ id: "9", values: { name: "Nine", age: 9 } }],
    };
    await new Promise((r) => setTimeout(r, 0));
    // Vue watchers fire on next microtask
    expect(rows.value).toHaveLength(1);
    // biome-ignore lint/style/noNonNullAssertion: length checked above
    expect(rows.value[0]!.values.name).toBe("Nine");
  });

  it("unsubscribes when the scope is disposed", () => {
    const scope = effectScope();
    let refRows: ReturnType<typeof useGridStore>["rows"] | null = null;
    let refStore: ReturnType<typeof useGridStore>["store"] | null = null;
    scope.run(() => {
      const g = useGridStore(makeInput());
      refRows = g.rows;
      refStore = g.store;
    });
    // biome-ignore lint/style/noNonNullAssertion: populated inside scope.run
    const before = refRows!.value[0]!.values.name;
    scope.stop();
    // After dispose the subscription is gone; mutations no longer bump the
    // version counter, so the computed does not update.
    // biome-ignore lint/style/noNonNullAssertion: populated inside scope.run
    refStore!.setCell("1", "name", "Grace", "edit");
    // biome-ignore lint/style/noNonNullAssertion: populated inside scope.run
    expect(refRows!.value[0]!.values.name).toBe(before);
  });
});
