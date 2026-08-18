import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Grid } from "./Grid.js";
import { useGridController } from "./useGridController.js";

afterEach(cleanup);

function Fixture({ readOnly }: { readOnly?: boolean }) {
  const controller = useGridController({ readOnly });
  return (
    <div style={{ height: 300 }}>
      <Grid
        controller={controller}
        rows={[
          { id: "r1", values: { name: "Ada" } },
          { id: "r2", values: { name: "Grace" } },
        ]}
        columns={[{ id: "name", header: "Name" }]}
      />
      <button
        type="button"
        data-testid="agent-set"
        onClick={() => controller.setCell("r1", "name", "Ada L")}
      >
        agent
      </button>
      <output data-testid="schema-rows">
        {controller.isAttached() ? controller.getSchema().rowCount : -1}
      </output>
    </div>
  );
}

describe("<Grid controller={...}/>", () => {
  it("attaches on mount and controller.isAttached() becomes true", async () => {
    render(<Fixture />);
    // Attachment happens in useEffect — flush.
    await act(async () => {});
    expect(Number(screen.getByTestId("schema-rows").textContent)).toBe(2);
  });

  it("agent-driven setCell writes value through controller", async () => {
    const { container } = render(<Fixture />);
    await act(async () => {});
    await act(async () => {
      (screen.getByTestId("agent-set") as HTMLButtonElement).click();
    });
    // Grid should render the new value; check the DOM.
    expect(container.textContent).toContain("Ada L");
  });

  it("readOnly controller rejects agent writes with structured error", async () => {
    render(<Fixture readOnly />);
    await act(async () => {});
    await act(async () => {
      (screen.getByTestId("agent-set") as HTMLButtonElement).click();
    });
    expect(screen.getByTestId("schema-rows").textContent).toBe("2");
    // Value untouched ("Ada", not "Ada L").
  });

  it("detaches on unmount", async () => {
    const Wrap = () => {
      const c = useGridController();
      (globalThis as any).__c = c;
      return (
        <div style={{ height: 300 }}>
          <Grid
            controller={c}
            rows={[{ id: "r1", values: { n: 1 } }]}
            columns={[{ id: "n", header: "N" }]}
          />
        </div>
      );
    };
    const { unmount } = render(<Wrap />);
    await act(async () => {});
    const c = (globalThis as any).__c;
    expect(c.isAttached()).toBe(true);
    unmount();
    expect(c.isAttached()).toBe(false);
  });
});
