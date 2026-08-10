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
import type { MaybeRefOrGetter } from "vue";
import {
  computed,
  onScopeDispose,
  reactive,
  shallowRef,
  toValue,
  watch,
  watchEffect,
} from "vue";

export interface UseVirtualWindowOptions {
  count: MaybeRefOrGetter<number>;
  getItemKey: (index: number) => string;
  estimateSize: (index: number) => number;
  overscan?: MaybeRefOrGetter<number>;
  /** The scroll parent element — pass a template ref, a getter, or a raw element. SheetGrid never creates a scroller. */
  scrollElement: MaybeRefOrGetter<HTMLElement | null | undefined>;
  horizontal?: MaybeRefOrGetter<boolean>;
  pinKeys?: MaybeRefOrGetter<readonly string[] | undefined>;
  pinIndexes?: MaybeRefOrGetter<readonly number[] | undefined>;
  enabled?: MaybeRefOrGetter<boolean>;
}

export interface VirtualItem {
  index: number;
  key: string;
  start: number;
  size: number;
}

export interface UseVirtualWindowResult {
  virtualItems: VirtualItem[];
  startIndex: number;
  endIndex: number;
  padStart: number;
  padEnd: number;
  totalSize: number;
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
 */
export function useVirtualWindow(
  options: UseVirtualWindowOptions,
): UseVirtualWindowResult {
  const {
    count: countOpt,
    getItemKey,
    estimateSize,
    overscan: overscanOpt = 3,
    scrollElement: scrollElementOpt,
    horizontal: horizontalOpt = false,
    pinKeys: pinKeysOpt,
    pinIndexes: pinIndexesOpt,
    enabled: enabledOpt = true,
  } = options;

  const getScrollElement = (): HTMLElement | null =>
    toValue(scrollElementOpt) ?? null;

  const cache: SizeCache = createSizeCache({ defaultEstimate: 40 });

  const scrollOffset = shallowRef(0);
  const viewportSize = shallowRef(0);
  const sizeVersion = shallowRef(0);
  const bumpSize = () => {
    sizeVersion.value += 1;
  };

  const count = computed(() => toValue(countOpt));
  const overscan = computed(() => toValue(overscanOpt));
  const horizontal = computed(() => toValue(horizontalOpt));
  const enabled = computed(() => toValue(enabledOpt));
  const pinKeys = computed(() => toValue(pinKeysOpt));
  const pinIndexes = computed(() => toValue(pinIndexesOpt));

  const observed = new Map<Element, number>();
  let ro: ResizeObserver | null = null;
  let boundEl: HTMLElement | null = null;

  const applyMetrics = () => {
    const node = getScrollElement();
    if (!node) return;
    const m = readScrollMetrics(node, horizontal.value);
    scrollOffset.value = m.scrollOffset;
    viewportSize.value = m.viewportSize;
  };
  const onScroll = () => applyMetrics();

  watchEffect(() => {
    const next = getScrollElement();
    if (next === boundEl) return;
    if (boundEl) {
      boundEl.removeEventListener("scroll", onScroll);
      try {
        ro?.unobserve(boundEl);
      } catch {
        /* ignore */
      }
    }
    boundEl = next;
    if (typeof ResizeObserver !== "undefined" && ro === null) {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const index = observed.get(entry.target);
          if (index === undefined) {
            if (entry.target === boundEl) applyMetrics();
            continue;
          }
          applyMeasurement(index, entry.target);
        }
      });
    }
    if (boundEl) {
      boundEl.addEventListener("scroll", onScroll, { passive: true });
      ro?.observe(boundEl);
      applyMetrics();
    }
  });

  onScopeDispose(() => {
    if (boundEl) boundEl.removeEventListener("scroll", onScroll);
    ro?.disconnect();
    ro = null;
    observed.clear();
  });

  const keys = computed(() => {
    const n = count.value;
    const out: string[] = new Array(n);
    for (let i = 0; i < n; i++) out[i] = getItemKey(i);
    return out;
  });

  watch(
    keys,
    (list) => {
      for (let i = 0; i < list.length; i++) {
        // biome-ignore lint/style/noNonNullAssertion: i is bounded by list.length in the loop condition
        const key = list[i]!;
        if (cache.get(key) === undefined) {
          cache.setEstimate(key, estimateSize(i));
        }
      }
    },
    { immediate: true },
  );

  const sizes = computed(() => {
    void sizeVersion.value;
    return cache.buildSizes(keys.value, (i) => estimateSize(i));
  });

  const prefix = computed(() => buildPrefixSums(sizes.value));

  const resolvedPins = computed(() => {
    const n = count.value;
    const set = new Set<number>();
    const idxs = pinIndexes.value;
    if (idxs) {
      for (const p of idxs) {
        if (p >= 0 && p < n) set.add(p);
      }
    }
    const ks = pinKeys.value;
    if (ks && ks.length > 0) {
      const keyToIndex = new Map<string, number>();
      const list = keys.value;
      // biome-ignore lint/style/noNonNullAssertion: i is bounded by list.length in the loop condition
      for (let i = 0; i < list.length; i++) keyToIndex.set(list[i]!, i);
      for (const k of ks) {
        const idx = keyToIndex.get(k);
        if (idx !== undefined) set.add(idx);
      }
    }
    return [...set];
  });

  const range = computed(() => {
    const n = count.value;
    const p = prefix.value;
    if (!enabled.value || n <= 0) {
      return {
        startIndex: 0,
        endIndex: n - 1,
        padStart: 0,
        padEnd: 0,
        totalSize: p[n] ?? 0,
      };
    }
    const win = windowFromPrefix(
      p,
      scrollOffset.value,
      viewportSize.value > 0 ? viewportSize.value : 1,
      overscan.value,
    );
    const expanded = expandWindowForPins(
      win.startIndex,
      win.endIndex,
      n,
      resolvedPins.value,
    );
    const pads = computePads(p, expanded.startIndex, expanded.endIndex);
    return {
      startIndex: expanded.startIndex,
      endIndex: expanded.endIndex,
      padStart: pads.padStart,
      padEnd: pads.padEnd,
      totalSize: pads.totalSize,
    };
  });

  const virtualItems = computed<VirtualItem[]>(() => {
    const { startIndex, endIndex } = range.value;
    const n = count.value;
    if (n <= 0 || endIndex < startIndex) return [];
    const items: VirtualItem[] = [];
    const p = prefix.value;
    const list = keys.value;
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        // biome-ignore lint/style/noNonNullAssertion: i is bounded by [startIndex, endIndex] which are within [0, count)
        key: list[i]!,
        start: offsetOf(p, i),
        size: sizeAt(p, i),
      });
    }
    return items;
  });

  function applyMeasurement(index: number, el: Element) {
    const n = count.value;
    if (index < 0 || index >= n) return;
    const key = getItemKey(index);
    const next = measureSize(el, horizontal.value);
    if (next <= 0) return;
    const prev = cache.get(key);
    const oldSize = prev ?? sizes.value[index] ?? estimateSize(index);
    const changed = cache.setMeasured(key, next);
    if (!changed) return;

    const itemOffset = offsetOf(prefix.value, index);
    const scroller = getScrollElement();
    if (scroller && prev !== undefined) {
      const delta = anchorScrollDelta(
        itemOffset,
        oldSize,
        next,
        horizontal.value ? scroller.scrollLeft : scroller.scrollTop,
      );
      if (delta !== 0) {
        if (horizontal.value) scroller.scrollLeft += delta;
        else scroller.scrollTop += delta;
      }
    }
    bumpSize();
  }

  const measureElement = (element: Element | null) => {
    if (!element) return;
    const raw = element.getAttribute("data-index");
    if (raw == null) return;
    const index = Number(raw);
    if (!Number.isFinite(index)) return;
    const prevIndex = observed.get(element);
    if (prevIndex !== index) observed.set(element, index);
    ro?.observe(element);
    applyMeasurement(index, element);
  };

  watch(virtualItems, (items) => {
    const alive = new Set(items.map((v) => v.index));
    for (const [el, index] of observed) {
      if (!alive.has(index) || !el.isConnected) {
        try {
          ro?.unobserve(el);
        } catch {
          /* ignore */
        }
        observed.delete(el);
      }
    }
  });

  const scrollToIndex = (
    index: number,
    align: "start" | "center" | "end" | "auto" = "auto",
  ) => {
    const scroller = getScrollElement();
    const n = count.value;
    if (!scroller || index < 0 || index >= n) return;
    const start = offsetOf(prefix.value, index);
    const size = sizeAt(prefix.value, index);
    const view = horizontal.value
      ? scroller.clientWidth
      : scroller.clientHeight;
    const current = horizontal.value ? scroller.scrollLeft : scroller.scrollTop;
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
    if (horizontal.value) scroller.scrollLeft = next;
    else scroller.scrollTop = next;
  };

  return reactive({
    virtualItems,
    startIndex: computed(() => range.value.startIndex),
    endIndex: computed(() => range.value.endIndex),
    padStart: computed(() => range.value.padStart),
    padEnd: computed(() => range.value.padEnd),
    totalSize: computed(() => range.value.totalSize),
    measureElement,
    scrollToIndex,
  }) as UseVirtualWindowResult;
}
