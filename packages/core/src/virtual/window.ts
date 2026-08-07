import { buildPrefixSums, windowFromPrefix } from "./prefix.js";

export interface FixedWindowInput {
  scrollOffset: number;
  viewportSize: number;
  itemSize: number;
  itemCount: number;
  overscan: number;
}

export interface WindowResult {
  startIndex: number;
  endIndex: number;
  offsetBefore: number;
  totalSize: number;
}

export function computeWindow(opts: FixedWindowInput): WindowResult {
  const { scrollOffset, viewportSize, itemSize, itemCount, overscan } = opts;
  if (itemCount <= 0 || itemSize <= 0) {
    return { startIndex: 0, endIndex: -1, offsetBefore: 0, totalSize: 0 };
  }
  const totalSize = itemCount * itemSize;
  const maxScroll = Math.max(0, totalSize - Math.max(0, viewportSize));
  // Clamp scroll so a shrunken dataset never yields an empty window
  const clampedScroll = Math.min(Math.max(0, scrollOffset), maxScroll);
  const rawStart = Math.floor(clampedScroll / itemSize);
  const visibleCount = Math.max(1, Math.ceil(viewportSize / itemSize));
  let startIndex = Math.max(0, rawStart - overscan);
  let endIndex = Math.min(itemCount - 1, rawStart + visibleCount + overscan);
  if (startIndex >= itemCount) {
    startIndex = Math.max(0, itemCount - visibleCount - overscan);
  }
  if (endIndex < startIndex) {
    endIndex = Math.min(itemCount - 1, startIndex + visibleCount + overscan);
  }
  return {
    startIndex,
    endIndex,
    offsetBefore: startIndex * itemSize,
    totalSize,
  };
}

export interface VariableWindowInput {
  scrollOffset: number;
  viewportSize: number;
  sizes: number[] | readonly number[];
  overscan: number;
}

/**
 * Window items with variable sizes (e.g. column widths or measured rows).
 * Item i occupies [offsets[i], offsets[i+1]).
 * Implemented via prefix sums + binary search (see `windowFromPrefix`).
 */
export function computeVariableWindow(opts: VariableWindowInput): WindowResult {
  const { scrollOffset, viewportSize, sizes, overscan } = opts;
  if (sizes.length === 0) {
    return { startIndex: 0, endIndex: -1, offsetBefore: 0, totalSize: 0 };
  }
  const prefix = buildPrefixSums(sizes);
  return windowFromPrefix(prefix, scrollOffset, viewportSize, overscan);
}
