export type SizeSource = "estimate" | "measure";

export interface SizeCacheOptions {
  /** Used when neither a measured nor estimate entry exists. Default 40. */
  defaultEstimate?: number;
}

export interface SizeCache {
  /** Measured or estimate size if present. */
  get(key: string): number | undefined;
  /** Prefer measured, else estimate, else `estimate` arg / default. */
  getOrEstimate(key: string, estimate?: number): number;
  /**
   * Store a measured size. Returns `true` if the stored size changed
   * (callers can re-window and scroll-anchor).
   */
  setMeasured(key: string, size: number): boolean;
  /** Soft size used until measured. Does not overwrite a measurement. */
  setEstimate(key: string, size: number): void;
  invalidate(key: string): void;
  clear(): void;
  /**
   * Build a dense `sizes[]` aligned to `keys`.
   * `estimateAt(i)` supplies the estimate when the cache has no entry.
   */
  buildSizes(
    keys: readonly string[],
    estimateAt: (index: number) => number,
  ): number[];
}

interface Entry {
  size: number;
  source: SizeSource;
}

/**
 * Keyed size cache for variable-height / variable-width virtualization.
 * Measurements win over estimates; unmount does not clear entries
 * (off-screen expanded rows still need correct total scroll size).
 */
export function createSizeCache(options: SizeCacheOptions = {}): SizeCache {
  const defaultEstimate = options.defaultEstimate ?? 40;
  const map = new Map<string, Entry>();

  return {
    get(key) {
      return map.get(key)?.size;
    },

    getOrEstimate(key, estimate = defaultEstimate) {
      const e = map.get(key);
      if (e) return e.size;
      return estimate > 0 ? estimate : defaultEstimate;
    },

    setMeasured(key, size) {
      const next = Math.max(0, size);
      const prev = map.get(key);
      if (prev?.source === "measure" && prev.size === next) {
        return false;
      }
      const changed = !prev || prev.size !== next;
      map.set(key, { size: next, source: "measure" });
      return changed;
    },

    setEstimate(key, size) {
      const next = Math.max(0, size);
      const prev = map.get(key);
      if (prev?.source === "measure") return;
      map.set(key, { size: next, source: "estimate" });
    },

    invalidate(key) {
      map.delete(key);
    },

    clear() {
      map.clear();
    },

    buildSizes(keys, estimateAt) {
      const sizes = new Array<number>(keys.length);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]!;
        const e = map.get(key);
        if (e) {
          sizes[i] = e.size;
        } else {
          const est = estimateAt(i);
          sizes[i] = est > 0 ? est : defaultEstimate;
        }
      }
      return sizes;
    },
  };
}
