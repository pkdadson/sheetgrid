import {
  type SizeCache,
  anchorScrollDelta,
  buildPrefixSums,
  computePads,
  createSizeCache,
  expandWindowForPins,
  offsetOf,
  sizeAt,
  windowFromPrefix,
} from "@sheetgrid/core";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface UseVirtualWindowOptions {
  /** Number of items in the flattened list (post expand/collapse). */
  count: number;
  /** Stable key per index (include expand state when height depends on it). */
  getItemKey: (index: number) => string;
  /** Estimate until measured. */
  estimateSize: (index: number) => number;
  /** Extra items outside the viewport. Default 3. */
  overscan?: number;
  /**
   * Their scroll parent — SheetGrid never creates a scroller.
   * Must return a stable element while mounted (ref.current is fine).
   */
  getScrollElement: () => HTMLElement | null;
  /** Column virtualization: use scrollLeft / clientWidth / offsetWidth. */
  horizontal?: boolean;
  /**
   * Keep these item keys mounted (e.g. row with an open dropdown)
   * so the anchor is not unmounted under a popup.
   */
  pinKeys?: readonly string[];
  /** Same as pinKeys but by index. */
  pinIndexes?: readonly number[];
  /** When false, exposes the full range (no windowing). Default true. */
  enabled?: boolean;
}

export interface VirtualItem {
  index: number;
  key: string;
  /** Offset from the start of the list (px). */
  start: number;
  size: number;
}

export interface UseVirtualWindowResult {
  virtualItems: VirtualItem[];
  startIndex: number;
  endIndex: number;
  /** Top spacer (vertical) or left spacer (horizontal), px. */
  padStart: number;
  /** Bottom / right spacer, px. */
  padEnd: number;
  totalSize: number;
  /**
   * Callback ref for **their** row/cell root. Set `data-index={index}` on that node.
   * Does not wrap the node — attach to the element you already render.
   */
  measureElement: (element: Element | null) => void;
  scrollToIndex: (
    index: number,
    align?: "start" | "center" | "end" | "auto",
  ) => void;
}

function readScrollMetrics(
  el: HTMLElement,
  horizontal: boolean,
): { scrollOffset: number; viewportSize: number } {
  if (horizontal) {
    return { scrollOffset: el.scrollLeft, viewportSize: el.clientWidth };
  }
  return { scrollOffset: el.scrollTop, viewportSize: el.clientHeight };
}

function measureSize(el: Element, horizontal: boolean): number {
  if (horizontal) {
    return (el as HTMLElement).offsetWidth || el.getBoundingClientRect().width;
  }
  return (el as HTMLElement).offsetHeight || el.getBoundingClientRect().height;
}

/**
 * Non-invasive list virtualization for an existing table or grid.
 *
 * - Does **not** create a scroll container or wrap rows
 * - Does **not** apply CSS transforms (safe for popovers / fixed positioning)
 * - Uses top/bottom (or left/right) **padding spacers** you render yourself
 * - Variable sizes via estimate → measure → cache + scroll anchoring
 *
 * @example
 * ```tsx
 * const v = useVirtualWindow({
 *   count: rows.length,
 *   getItemKey: (i) => rows[i].id,
 *   estimateSize: () => 40,
 *   getScrollElement: () => scrollerRef.current,
 *   pinKeys: openMenuId ? [openMenuId] : [],
 * });
 * // tbody: spacer padStart → rows for v.virtualItems → spacer padEnd
 * // each row: data-index={item.index} ref={v.measureElement}
 * ```
 */
export function useVirtualWindow(
  options: UseVirtualWindowOptions,
): UseVirtualWindowResult {
  const {
    count,
    getItemKey,
    estimateSize,
    overscan = 3,
    getScrollElement,
    horizontal = false,
    pinKeys,
    pinIndexes,
    enabled = true,
  } = options;

  const cacheRef = useRef<SizeCache | null>(null);
  if (!cacheRef.current) {
    cacheRef.current = createSizeCache({ defaultEstimate: 40 });
  }
  const cache = cacheRef.current;

  const [scrollOffset, setScrollOffset] = useState(0);
  const [viewportSize, setViewportSize] = useState(0);
  const [sizeVersion, setSizeVersion] = useState(0);

  const getItemKeyRef = useRef(getItemKey);
  const estimateSizeRef = useRef(estimateSize);
  getItemKeyRef.current = getItemKey;
  estimateSizeRef.current = estimateSize;

  const observedRef = useRef(new Map<Element, number>());
  const roRef = useRef<ResizeObserver | null>(null);

  const bumpSize = useCallback(() => {
    setSizeVersion((v) => v + 1);
  }, []);

  // Scroll + viewport tracking on *their* element only (no extra scroller)
  useLayoutEffect(() => {
    let el = getScrollElement();

    const apply = () => {
      const node = getScrollElement();
      if (!node) return;
      const m = readScrollMetrics(node, horizontal);
      setScrollOffset(m.scrollOffset);
      setViewportSize(m.viewportSize);
    };

    const onScroll = () => apply();

    const attach = (node: HTMLElement) => {
      node.addEventListener("scroll", onScroll, { passive: true });
    };
    const detach = (node: HTMLElement) => {
      node.removeEventListener("scroll", onScroll);
    };

    if (el) attach(el);

    const RO = typeof ResizeObserver !== "undefined" ? ResizeObserver : null;
    const ro = RO ? new RO(() => apply()) : null;
    if (el && ro) ro.observe(el);

    apply();

    // Re-bind if ref populates after first layout
    const id = window.setInterval(() => {
      const next = getScrollElement();
      if (next !== el) {
        if (el) {
          detach(el);
          try {
            ro?.unobserve(el);
          } catch {
            /* ignore */
          }
        }
        el = next;
        if (el) {
          attach(el);
          ro?.observe(el);
          apply();
        }
      }
    }, 100);

    return () => {
      window.clearInterval(id);
      if (el) detach(el);
      ro?.disconnect();
    };
  }, [getScrollElement, horizontal]);

  // Key list for this count
  const keys = useMemo(() => {
    const out: string[] = new Array(count);
    for (let i = 0; i < count; i++) {
      out[i] = getItemKeyRef.current(i);
    }
    return out;
  }, [count, getItemKey]);

  // Seed estimates into cache when keys appear
  useLayoutEffect(() => {
    for (let i = 0; i < count; i++) {
      const key = keys[i]!;
      if (cache.get(key) === undefined) {
        cache.setEstimate(key, estimateSizeRef.current(i));
      }
    }
  }, [cache, count, keys]);

  const sizes = useMemo(() => {
    return cache.buildSizes(keys, (i) => estimateSizeRef.current(i));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sizeVersion invalidates measurements
  }, [cache, keys, sizeVersion]);

  const prefix = useMemo(() => buildPrefixSums(sizes), [sizes]);

  const resolvedPins = useMemo(() => {
    const set = new Set<number>();
    if (pinIndexes) {
      for (const p of pinIndexes) {
        if (p >= 0 && p < count) set.add(p);
      }
    }
    if (pinKeys && pinKeys.length > 0) {
      const keyToIndex = new Map<string, number>();
      for (let i = 0; i < keys.length; i++) {
        keyToIndex.set(keys[i]!, i);
      }
      for (const k of pinKeys) {
        const idx = keyToIndex.get(k);
        if (idx !== undefined) set.add(idx);
      }
    }
    return [...set];
  }, [pinIndexes, pinKeys, keys, count]);

  const range = useMemo(() => {
    if (!enabled || count <= 0) {
      return {
        startIndex: 0,
        endIndex: count - 1,
        padStart: 0,
        padEnd: 0,
        totalSize: prefix[count] ?? 0,
      };
    }

    const win = windowFromPrefix(
      prefix,
      scrollOffset,
      viewportSize > 0 ? viewportSize : 1,
      overscan,
    );
    const expanded = expandWindowForPins(
      win.startIndex,
      win.endIndex,
      count,
      resolvedPins,
    );
    const pads = computePads(prefix, expanded.startIndex, expanded.endIndex);
    return {
      startIndex: expanded.startIndex,
      endIndex: expanded.endIndex,
      padStart: pads.padStart,
      padEnd: pads.padEnd,
      totalSize: pads.totalSize,
    };
  }, [
    enabled,
    count,
    prefix,
    scrollOffset,
    viewportSize,
    overscan,
    resolvedPins,
  ]);

  const virtualItems = useMemo((): VirtualItem[] => {
    const { startIndex, endIndex } = range;
    if (count <= 0 || endIndex < startIndex) return [];
    const items: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        key: keys[i]!,
        start: offsetOf(prefix, i),
        size: sizeAt(prefix, i),
      });
    }
    return items;
  }, [range, count, keys, prefix]);

  const applyMeasurement = useCallback(
    (index: number, el: Element) => {
      if (index < 0 || index >= count) return;
      const key = getItemKeyRef.current(index);
      const next = measureSize(el, horizontal);
      if (next <= 0) return;
      const prev = cache.get(key);
      const oldSize = prev ?? sizes[index] ?? estimateSizeRef.current(index);
      const changed = cache.setMeasured(key, next);
      if (!changed) return;

      const itemOffset = offsetOf(prefix, index);
      const elScroll = getScrollElement();
      if (elScroll && prev !== undefined) {
        const delta = anchorScrollDelta(
          itemOffset,
          oldSize,
          next,
          horizontal ? elScroll.scrollLeft : elScroll.scrollTop,
        );
        if (delta !== 0) {
          if (horizontal) elScroll.scrollLeft += delta;
          else elScroll.scrollTop += delta;
        }
      }
      bumpSize();
    },
    [cache, count, horizontal, prefix, sizes, getScrollElement, bumpSize],
  );

  // Single ResizeObserver for all measured nodes (optional in non-browser envs)
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      roRef.current = null;
      return;
    }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const index = observedRef.current.get(entry.target);
        if (index === undefined) continue;
        applyMeasurement(index, entry.target);
      }
    });
    roRef.current = ro;
    for (const [el] of observedRef.current) {
      ro.observe(el);
    }
    return () => {
      ro.disconnect();
      roRef.current = null;
    };
  }, [applyMeasurement]);

  const measureElement = useCallback(
    (element: Element | null) => {
      if (!element) return;
      const raw = element.getAttribute("data-index");
      if (raw == null) return;
      const index = Number(raw);
      if (!Number.isFinite(index)) return;

      const prevIndex = observedRef.current.get(element);
      if (prevIndex !== index) {
        observedRef.current.set(element, index);
      }

      const ro = roRef.current;
      if (ro) {
        ro.observe(element);
      }

      applyMeasurement(index, element);
    },
    [applyMeasurement],
  );

  // Drop observations for unmounted indexes is automatic via GC of elements;
  // clean map when elements disconnect — ResizeObserver unobserve on unmount is
  // caller's responsibility; we unobserve when data-index elements disappear
  // by tracking in measureElement only. Periodic prune:
  useEffect(() => {
    const alive = new Set(virtualItems.map((v) => v.index));
    for (const [el, index] of observedRef.current) {
      if (!alive.has(index) || !el.isConnected) {
        roRef.current?.unobserve(el);
        observedRef.current.delete(el);
      }
    }
  }, [virtualItems]);

  const scrollToIndex = useCallback(
    (index: number, align: "start" | "center" | "end" | "auto" = "auto") => {
      const el = getScrollElement();
      if (!el || index < 0 || index >= count) return;
      const start = offsetOf(prefix, index);
      const size = sizeAt(prefix, index);
      const view = horizontal ? el.clientWidth : el.clientHeight;
      const current = horizontal ? el.scrollLeft : el.scrollTop;
      let next = start;
      if (align === "center") {
        next = start - view / 2 + size / 2;
      } else if (align === "end") {
        next = start - view + size;
      } else if (align === "auto") {
        if (start < current) next = start;
        else if (start + size > current + view) next = start - view + size;
        else return;
      }
      next = Math.max(0, next);
      if (horizontal) el.scrollLeft = next;
      else el.scrollTop = next;
    },
    [count, getScrollElement, horizontal, prefix],
  );

  return {
    virtualItems,
    startIndex: range.startIndex,
    endIndex: range.endIndex,
    padStart: range.padStart,
    padEnd: range.padEnd,
    totalSize: range.totalSize,
    measureElement,
    scrollToIndex,
  };
}
