import type { Comparator } from "../types.js";

const collator = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});

/**
 * Wrap a comparator so null/undefined values always sort last regardless of
 * direction. NaN is treated as null for the purposes of ordering.
 */
export function withNullsLast(inner: Comparator): Comparator {
  return (a, b, ctx) => {
    const aNull = a == null || (typeof a === "number" && Number.isNaN(a));
    const bNull = b == null || (typeof b === "number" && Number.isNaN(b));
    if (aNull && bNull) return 0;
    if (aNull) return 1;
    if (bNull) return -1;
    return inner(a, b, ctx);
  };
}

const numericInner: Comparator = (a, b) => Number(a) - Number(b);

const booleanInner: Comparator = (a, b) => {
  const na = a ? 1 : 0;
  const nb = b ? 1 : 0;
  return na - nb;
};

const stringInner: Comparator = (a, b) => collator.compare(String(a), String(b));

/**
 * Choose a default comparator for a column based on its `type` field. Falls
 * back to a locale-aware string comparator for unknown or missing types.
 */
export function pickDefaultComparator(
  type: string | undefined,
): Comparator {
  switch (type) {
    case "number":
      return withNullsLast(numericInner);
    case "boolean":
      return withNullsLast(booleanInner);
    default:
      return withNullsLast(stringInner);
  }
}
