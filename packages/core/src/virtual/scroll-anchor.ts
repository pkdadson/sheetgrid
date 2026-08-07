/**
 * When an item's size changes, compute how much to add to `scrollOffset`
 * so content below the change does not visually jump.
 *
 * If the item (at `itemOffset`, old size `oldSize`) sits entirely above
 * the viewport, shift scroll by the size delta. Items inside or below
 * the viewport leave scroll unchanged.
 */
export function anchorScrollDelta(
  itemOffset: number,
  oldSize: number,
  newSize: number,
  scrollOffset: number,
): number {
  const delta = newSize - oldSize;
  if (delta === 0) return 0;
  // Fully above viewport when old bottom edge is at or before scroll top
  if (itemOffset + oldSize <= scrollOffset) {
    return delta;
  }
  return 0;
}
