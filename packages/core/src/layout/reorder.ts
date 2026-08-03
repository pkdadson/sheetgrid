/**
 * Move an id to a new index in an order array. Returns a new array.
 */
export function moveItem<T extends string>(
  order: T[],
  id: T,
  toIndex: number,
): T[] {
  const from = order.indexOf(id);
  if (from < 0) return [...order];
  const next = order.filter((_, i) => i !== from);
  const clamped = Math.max(0, Math.min(toIndex, next.length));
  next.splice(clamped, 0, id);
  return next;
}

/**
 * Swap two ids in an order array. Returns a new array.
 */
export function swapItems<T extends string>(order: T[], a: T, b: T): T[] {
  const i = order.indexOf(a);
  const j = order.indexOf(b);
  if (i < 0 || j < 0) return [...order];
  const next = [...order];
  next[i] = b;
  next[j] = a;
  return next;
}
