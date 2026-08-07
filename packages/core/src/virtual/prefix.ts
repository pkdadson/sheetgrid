import type { WindowResult } from "./window.js";

/**
 * Prefix sums of item sizes. `prefix[0] === 0`,
 * `prefix[i]` === sum of sizes[0..i-1], length === sizes.length + 1.
 */
export function buildPrefixSums(sizes: readonly number[]): Float64Array {
  const n = sizes.length;
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    prefix[i + 1] = prefix[i]! + Math.max(0, sizes[i] ?? 0);
  }
  return prefix;
}

/** Offset of item `index` from the start of the list. */
export function offsetOf(prefix: Float64Array, index: number): number {
  if (index <= 0) return 0;
  if (index >= prefix.length - 1) return prefix[prefix.length - 1] ?? 0;
  return prefix[index] ?? 0;
}

/** Size of item `index`. */
export function sizeAt(prefix: Float64Array, index: number): number {
  if (index < 0 || index >= prefix.length - 1) return 0;
  return (prefix[index + 1] ?? 0) - (prefix[index] ?? 0);
}

/**
 * Binary search: largest i such that prefix[i] <= value, clamped to [0, n-1].
 * (First item whose start is at or before `value` for start-finding.)
 */
function findStartIndex(prefix: Float64Array, scrollOffset: number): number {
  const n = prefix.length - 1;
  if (n <= 0) return 0;
  let lo = 0;
  let hi = n - 1;
  // largest i with prefix[i] <= scrollOffset
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (prefix[mid]! <= scrollOffset) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Window items using a precomputed prefix array (O(log n) start).
 */
export function windowFromPrefix(
  prefix: Float64Array,
  scrollOffset: number,
  viewportSize: number,
  overscan: number,
): WindowResult {
  const itemCount = prefix.length - 1;
  if (itemCount <= 0) {
    return { startIndex: 0, endIndex: -1, offsetBefore: 0, totalSize: 0 };
  }

  const totalSize = prefix[itemCount]!;
  const maxScroll = Math.max(0, totalSize - Math.max(0, viewportSize));
  const clampedScroll = Math.min(Math.max(0, scrollOffset), maxScroll);
  const endScroll = clampedScroll + Math.max(0, viewportSize);

  let startIndex = findStartIndex(prefix, clampedScroll);
  // Advance while this item ends at or before scroll (fully above)
  while (
    startIndex < itemCount - 1 &&
    prefix[startIndex + 1]! <= clampedScroll
  ) {
    startIndex += 1;
  }

  let endIndex = startIndex;
  while (endIndex < itemCount - 1 && prefix[endIndex + 1]! < endScroll) {
    endIndex += 1;
  }

  startIndex = Math.max(0, startIndex - overscan);
  endIndex = Math.min(itemCount - 1, endIndex + overscan);

  return {
    startIndex,
    endIndex,
    offsetBefore: prefix[startIndex]!,
    totalSize,
  };
}

/**
 * Expand a continuous window so every pin index is included.
 * Pins far from the viewport grow the mounted range (typical open-menu pin is near-viewport).
 */
export function expandWindowForPins(
  startIndex: number,
  endIndex: number,
  itemCount: number,
  pinIndexes: readonly number[],
): { startIndex: number; endIndex: number } {
  if (itemCount <= 0) {
    return { startIndex: 0, endIndex: -1 };
  }
  let start = startIndex;
  let end = endIndex;
  if (end < start) {
    // empty window — still allow pins alone
    start = itemCount;
    end = -1;
  }
  for (const raw of pinIndexes) {
    if (!Number.isFinite(raw)) continue;
    const p = Math.trunc(raw);
    if (p < 0 || p >= itemCount) continue;
    start = Math.min(start, p);
    end = Math.max(end, p);
  }
  if (end < start) {
    return { startIndex: 0, endIndex: -1 };
  }
  return {
    startIndex: Math.max(0, start),
    endIndex: Math.min(itemCount - 1, end),
  };
}

/** Scroll padding for spacer / padding-top|bottom strategy (no transforms). */
export function computePads(
  prefix: Float64Array,
  startIndex: number,
  endIndex: number,
): { padStart: number; padEnd: number; totalSize: number } {
  const itemCount = prefix.length - 1;
  const totalSize = itemCount > 0 ? prefix[itemCount]! : 0;
  if (itemCount <= 0 || endIndex < startIndex) {
    return { padStart: 0, padEnd: totalSize, totalSize };
  }
  const padStart = prefix[startIndex] ?? 0;
  const endOffset = prefix[endIndex + 1] ?? totalSize;
  const padEnd = Math.max(0, totalSize - endOffset);
  return { padStart, padEnd, totalSize };
}
