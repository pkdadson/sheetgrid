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
  sizes: number[];
  overscan: number;
}

/**
 * Window items with variable sizes (e.g. column widths).
 * Item i occupies [offsets[i], offsets[i+1]).
 */
export function computeVariableWindow(
  opts: VariableWindowInput,
): WindowResult {
  const { scrollOffset, viewportSize, sizes, overscan } = opts;
  const itemCount = sizes.length;
  if (itemCount === 0) {
    return { startIndex: 0, endIndex: -1, offsetBefore: 0, totalSize: 0 };
  }

  const offsets: number[] = new Array(itemCount + 1);
  offsets[0] = 0;
  for (let i = 0; i < itemCount; i++) {
    offsets[i + 1] = offsets[i]! + sizes[i]!;
  }
  const totalSize = offsets[itemCount]!;
  const maxScroll = Math.max(0, totalSize - Math.max(0, viewportSize));
  const clampedScroll = Math.min(Math.max(0, scrollOffset), maxScroll);
  const endScroll = clampedScroll + viewportSize;

  // First item whose right edge is past scrollOffset
  let startIndex = 0;
  while (
    startIndex < itemCount - 1 &&
    offsets[startIndex + 1]! <= clampedScroll
  ) {
    startIndex += 1;
  }

  // Grow while the next item's left edge is still before endScroll
  // (i.e. next item still starts inside the viewport)
  let endIndex = startIndex;
  while (
    endIndex < itemCount - 1 &&
    offsets[endIndex + 1]! < endScroll
  ) {
    endIndex += 1;
  }

  startIndex = Math.max(0, startIndex - overscan);
  endIndex = Math.min(itemCount - 1, endIndex + overscan);

  return {
    startIndex,
    endIndex,
    offsetBefore: offsets[startIndex]!,
    totalSize,
  };
}
