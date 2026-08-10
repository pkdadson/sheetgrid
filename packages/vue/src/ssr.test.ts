import { describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import SheetGrid from "./SheetGrid.vue";

describe("SheetGrid SSR", () => {
  it("renders on the server without touching window or ResizeObserver", async () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const originalRO = globalThis.ResizeObserver;
    (globalThis as { window?: unknown }).window = undefined;
    (globalThis as { document?: unknown }).document = undefined;
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = undefined;
    try {
      const app = createSSRApp(SheetGrid, {
        rows: [{ id: "1", name: "Ada", age: 36 }],
        columns: [
          { id: "name", header: "Name" },
          { id: "age", header: "Age" },
        ],
      });
      const html = await renderToString(app);
      expect(html).toContain("Name");
      expect(html).toContain("Age");
      // Body is empty on the server (viewport unknown → windowing yields nothing)
      // but the header renders.
    } finally {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
      globalThis.ResizeObserver = originalRO;
    }
  });
});
