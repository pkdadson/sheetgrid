import type { ComputedRef, MaybeRefOrGetter } from "vue";
import { computed, shallowRef } from "vue";

export interface UseVirtualWindowOptions {
  /** Number of items in the flattened list (post expand/collapse). Reactive. */
  count: MaybeRefOrGetter<number>;
  /** Stable key per index (include expand state when height depends on it). */
  getItemKey: (index: number) => string;
  /** Estimate until measured. */
  estimateSize: (index: number) => number;
  /** Extra items outside the viewport. Default 3. */
  overscan?: MaybeRefOrGetter<number>;
  /**
   * Their scroll parent — SheetGrid never creates a scroller.
   * Called reactively; reading a template ref inside works.
   */
  getScrollElement: () => HTMLElement | null;
  /** Column virtualization: use scrollLeft / clientWidth / offsetWidth. */
  horizontal?: MaybeRefOrGetter<boolean>;
  /**
   * Keep these item keys mounted (e.g. row with an open dropdown)
   * so the anchor is not unmounted under a popup.
   */
  pinKeys?: MaybeRefOrGetter<readonly string[] | undefined>;
  /** Same as pinKeys but by index. */
  pinIndexes?: MaybeRefOrGetter<readonly number[] | undefined>;
  /** When false, exposes the full range (no windowing). Default true. */
  enabled?: MaybeRefOrGetter<boolean>;
}

export interface VirtualItem {
  index: number;
  key: string;
  /** Offset from the start of the list (px). */
  start: number;
  size: number;
}

export interface UseVirtualWindowResult {
  virtualItems: ComputedRef<VirtualItem[]>;
  startIndex: ComputedRef<number>;
  endIndex: ComputedRef<number>;
  padStart: ComputedRef<number>;
  padEnd: ComputedRef<number>;
  totalSize: ComputedRef<number>;
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

/** Inert stub — real implementation lands in Task 3. */
export function useVirtualWindow(
  _options: UseVirtualWindowOptions,
): UseVirtualWindowResult {
  const empty = shallowRef<VirtualItem[]>([]);
  const zero = shallowRef(0);
  return {
    virtualItems: computed(() => empty.value),
    startIndex: computed(() => 0),
    endIndex: computed(() => -1),
    padStart: computed(() => zero.value),
    padEnd: computed(() => zero.value),
    totalSize: computed(() => zero.value),
    measureElement: () => {},
    scrollToIndex: () => {},
  };
}
