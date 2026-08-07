import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { useVirtualWindow } from "./useVirtualWindow.js";

function ListFixture({
  count = 100,
  itemSize = 40,
  pinKeys,
}: {
  count?: number;
  itemSize?: number;
  pinKeys?: string[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `r${i}`,
    label: `Row ${i}`,
  }));

  const v = useVirtualWindow({
    count: rows.length,
    getItemKey: (i) => rows[i]!.id,
    estimateSize: () => itemSize,
    overscan: 1,
    getScrollElement: () => scrollerRef.current,
    pinKeys: pinKeys ?? (open ? [open] : []),
  });

  return (
    <div
      ref={scrollerRef}
      data-testid="scroller"
      style={{ height: 200, overflow: "auto" }}
    >
      <div data-testid="pad-start" style={{ height: v.padStart }} />
      {v.virtualItems.map((item) => {
        const row = rows[item.index]!;
        return (
          <div
            key={item.key}
            data-index={item.index}
            data-testid={`row-${item.index}`}
            ref={v.measureElement}
            style={{ height: itemSize }}
          >
            {row.label}
            <button type="button" onClick={() => setOpen(row.id)}>
              open-{row.id}
            </button>
          </div>
        );
      })}
      <div data-testid="pad-end" style={{ height: v.padEnd }} />
      <div data-testid="total">{v.totalSize}</div>
      <div data-testid="mounted-count">{v.virtualItems.length}</div>
    </div>
  );
}

function mockScroller(
  el: HTMLElement,
  opts: {
    clientHeight?: number;
    scrollTop?: number;
  },
) {
  Object.defineProperty(el, "clientHeight", {
    configurable: true,
    value: opts.clientHeight ?? 200,
  });
  Object.defineProperty(el, "clientWidth", {
    configurable: true,
    value: 300,
  });
  let scrollTop = opts.scrollTop ?? 0;
  Object.defineProperty(el, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (v: number) => {
      scrollTop = v;
    },
  });
  Object.defineProperty(el, "scrollLeft", {
    configurable: true,
    get: () => 0,
    set: () => {},
  });
}

describe("useVirtualWindow", () => {
  it("mounts only a window of rows, not the full list", () => {
    render(<ListFixture count={100} itemSize={40} />);
    const scroller = screen.getByTestId("scroller");
    mockScroller(scroller, { clientHeight: 200, scrollTop: 0 });
    fireEvent.scroll(scroller);

    expect(screen.queryByTestId("row-0")).toBeTruthy();
    expect(screen.queryByTestId("row-99")).toBeNull();
    const mounted = Number(screen.getByTestId("mounted-count").textContent);
    expect(mounted).toBeLessThan(30);
    expect(screen.getByTestId("total").textContent).toBe("4000");
  });

  it("updates the window on scroll", () => {
    render(<ListFixture count={100} itemSize={40} />);
    const scroller = screen.getByTestId("scroller");
    mockScroller(scroller, { clientHeight: 200, scrollTop: 2000 });
    fireEvent.scroll(scroller);

    expect(screen.queryByTestId("row-0")).toBeNull();
    expect(screen.queryByTestId("row-50")).toBeTruthy();
  });

  it("keeps pinKeys mounted when outside the natural window", () => {
    render(<ListFixture count={100} itemSize={40} pinKeys={["r0"]} />);
    const scroller = screen.getByTestId("scroller");
    mockScroller(scroller, { clientHeight: 200, scrollTop: 3000 });
    fireEvent.scroll(scroller);

    // Natural window is near the end; pin expands range to include r0
    expect(screen.queryByTestId("row-0")).toBeTruthy();
  });

  it("does not introduce transform styles on mounted rows", () => {
    render(<ListFixture count={20} itemSize={40} />);
    const scroller = screen.getByTestId("scroller");
    mockScroller(scroller, { clientHeight: 200, scrollTop: 0 });
    fireEvent.scroll(scroller);
    const row = screen.getByTestId("row-0");
    expect(row.style.transform).toBe("");
    expect(scroller.style.transform).toBe("");
  });
});
