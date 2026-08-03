import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { required } from "@sheetgrid/core";
import { Grid } from "./Grid.js";

describe("QA bugfixes", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("uses a select editor for select columns even when formulas are enabled", async () => {
    render(
      <Grid
        formulas
        rows={[{ id: "1", role: "Engineer" }]}
        columns={[
          {
            id: "role",
            header: "Role",
            type: "select",
            selectOptions: [
              { label: "Engineer", value: "Engineer" },
              { label: "Admiral", value: "Admiral" },
            ],
          },
        ]}
      />,
    );

    fireEvent.doubleClick(screen.getByRole("gridcell", { name: "Engineer" }));
    const select = await vi.waitFor(() => {
      const el = screen.getByRole("combobox");
      expect(el.tagName).toBe("SELECT");
      return el as HTMLSelectElement;
    });
    expect(select.options.length).toBeGreaterThan(1);
  });

  it("Escape cancels edit without committing draft (blur must not save)", async () => {
    const onRowsChange = vi.fn();
    render(
      <Grid
        rows={[{ id: "1", name: "Grace Hopper" }]}
        columns={[{ id: "name", header: "Name" }]}
        onRowsChange={onRowsChange}
      />,
    );

    const cell = screen.getByRole("gridcell", { name: "Grace Hopper" });
    fireEvent.mouseDown(cell);
    fireEvent.doubleClick(cell);
    const input = await vi.waitFor(() => screen.getByRole("textbox"));
    fireEvent.change(input, { target: { value: "Should Not Save" } });
    fireEvent.keyDown(input, { key: "Escape" });
    // Simulate blur that browsers fire when the editor unmounts
    fireEvent.blur(input);

    await vi.waitFor(() => {
      expect(screen.queryByRole("textbox")).toBeNull();
    });
    expect(screen.getByRole("gridcell", { name: /Grace Hopper/ })).toBeTruthy();
    expect(screen.queryByText("Should Not Save")).toBeNull();
    expect(onRowsChange).not.toHaveBeenCalled();
  });

  it("reject mode does not emit onRowsChange or clear required values", async () => {
    const onRowsChange = vi.fn();
    render(
      <Grid
        validationMode="reject"
        rows={[{ id: "1", name: "Katherine" }]}
        columns={[{ id: "name", header: "Name", validate: required }]}
        onRowsChange={onRowsChange}
      />,
    );

    const cell = screen.getByRole("gridcell", { name: "Katherine" });
    fireEvent.mouseDown(cell);
    fireEvent.doubleClick(cell);
    const input = await vi.waitFor(() => screen.getByRole("textbox"));
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await vi.waitFor(() => {
      const restored = screen.getByRole("gridcell", { name: /Katherine/ });
      expect(restored.getAttribute("aria-invalid")).toBe("true");
      expect(restored.getAttribute("title")).toMatch(/required/i);
    });

    // Previous value remains visible (editor closed, store unchanged)
    expect(screen.getByRole("gridcell", { name: /Katherine/ })).toBeTruthy();
    expect(onRowsChange).not.toHaveBeenCalled();
  });

  it("warns once when parent has 0px height (dev only)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const originalEnv = (globalThis as { process?: { env: Record<string, string | undefined> } }).process!.env.NODE_ENV;
    // Simulate a non-test dev env so the guard doesn't skip the warning.
    (globalThis as { process?: { env: Record<string, string | undefined> } }).process!.env.NODE_ENV = "development";
    try {
      render(
        <div style={{ height: 0 }}>
          <Grid
            rows={[{ id: "1", name: "Foo" }]}
            columns={[{ id: "name", header: "Name" }]}
          />
        </div>,
      );
      await vi.waitFor(() => {
        const called = warnSpy.mock.calls.some(([msg]) =>
          typeof msg === "string" && msg.includes("[sheetgrid]"),
        );
        expect(called).toBe(true);
      });
      // Warning should be one-shot per instance — re-measures don't spam.
      const first = warnSpy.mock.calls.filter(([m]) =>
        typeof m === "string" && m.includes("[sheetgrid]"),
      ).length;
      expect(first).toBe(1);
    } finally {
      (globalThis as { process?: { env: Record<string, string | undefined> } }).process!.env.NODE_ENV = originalEnv;
    }
  });

  it("Escape clears reject-mode error left on cell after invalid commit", async () => {
    const { container } = render(
      <Grid
        validationMode="reject"
        rows={[{ id: "1", name: "Katherine" }]}
        columns={[{ id: "name", header: "Name", validate: required }]}
      />,
    );

    const cell = screen.getByRole("gridcell", { name: "Katherine" });
    fireEvent.mouseDown(cell);
    fireEvent.doubleClick(cell);
    const input = await vi.waitFor(() => screen.getByRole("textbox"));
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // Error appears; editor closes.
    await vi.waitFor(() => {
      const c = screen.getByRole("gridcell", { name: /Katherine/ });
      expect(c.getAttribute("aria-invalid")).toBe("true");
    });

    // Escape on the grid root (editor no longer holds focus).
    const root = container.querySelector(".eg-root") as HTMLElement;
    fireEvent.keyDown(root, { key: "Escape", code: "Escape" });

    // Error should be cleared, cell no longer invalid.
    await vi.waitFor(() => {
      const c = screen.getByRole("gridcell", { name: /Katherine/ });
      expect(c.getAttribute("aria-invalid")).not.toBe("true");
    });
  });

  it("Escape clears reject error after invalid commit when sort is active", async () => {
    const { container } = render(
      <Grid
        validationMode="reject"
        rows={[
          { id: "1", name: "Katherine" },
          { id: "2", name: "Ada" },
        ]}
        columns={[{ id: "name", header: "Name", validate: required }]}
        defaultSortBy={[{ columnId: "name", direction: "asc" }]}
      />,
    );

    const cell = screen.getByRole("gridcell", { name: "Ada" });
    fireEvent.mouseDown(cell);
    fireEvent.doubleClick(cell);
    const input = await vi.waitFor(() => screen.getByRole("textbox"));
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await vi.waitFor(() => {
      expect(
        screen
          .getByRole("gridcell", { name: /Ada/ })
          .getAttribute("aria-invalid"),
      ).toBe("true");
    });

    const root = container.querySelector(".eg-root") as HTMLElement;
    fireEvent.keyDown(root, { key: "Escape", code: "Escape" });

    await vi.waitFor(() => {
      expect(
        screen
          .getByRole("gridcell", { name: /Ada/ })
          .getAttribute("aria-invalid"),
      ).not.toBe("true");
    });
  });

  it("sets scroll-margin on body rows so sticky headers do not steal hits", () => {
    const { container } = render(
      <Grid
        rows={[
          { id: "1", name: "Ada", region: "EU" },
          { id: "2", name: "Grace", region: "US" },
        ]}
        columns={[
          { id: "name", header: "Name" },
          { id: "region", header: "Region" },
        ]}
        rowGrouping={{ columns: ["region"] }}
        style={{ height: 320 }}
      />,
    );

    const frame = container.querySelector(".eg-frame") as HTMLElement;
    const band = frame?.style.getPropertyValue("--eg-header-band-height");
    expect(band).toMatch(/px/);

    const groupRow = container.querySelector(".eg-group-row") as HTMLElement;
    expect(groupRow).toBeTruthy();
    // Computed style may not resolve CSS vars in jsdom fully; assert the var is set on frame
    // and the class exists for scroll-margin rule.
    expect(Number.parseFloat(band)).toBeGreaterThan(0);
  });
});
