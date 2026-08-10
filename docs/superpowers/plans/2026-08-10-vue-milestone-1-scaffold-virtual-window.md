# Vue milestone 1 — `@sheetgrid/vue` scaffold + `useVirtualWindow` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `@sheetgrid/vue` package with a `useVirtualWindow` composable that behaves identically to `@sheetgrid/react`'s hook across four ported tests. Everything additive; no changes to `@sheetgrid/core` or `@sheetgrid/react`.

**Architecture:** New `packages/vue/` workspace package built with tsup (ESM + CJS + `.d.ts`), tested with vitest + jsdom. Composable wraps `@sheetgrid/core` virtualization primitives (`buildPrefixSums`, `windowFromPrefix`, `expandWindowForPins`, `computePads`, `createSizeCache`, `anchorScrollDelta`) behind a Vue reactivity layer using `shallowRef` version counters + `computed` selectors. `MaybeRefOrGetter` inputs so parent refs propagate. SSR-safe: no `window`/`ResizeObserver` at module scope; all DOM reads inside `onMounted` or listeners.

**Tech Stack:** Vue 3.4+, TypeScript 5.6, tsup 8, vitest 2 + jsdom, `@vue/test-utils` 2, pnpm workspaces, Biome (already configured at repo root).

**Reference:** Spec at `docs/superpowers/specs/2026-08-10-vue-port-design.md`. Original React hook at `packages/react/src/useVirtualWindow.ts`. Original tests at `packages/react/src/useVirtualWindow.test.tsx`.

**Branch:** `feat/vue-scaffold-virtual-window` off `main`. Every commit uses subject `` `@sheetgrid/vue`: <message> ``. No AI/agent attribution anywhere.

---

## File structure

```
packages/vue/                       # NEW
  package.json                      # workspace package manifest
  tsconfig.json                     # extends ../../tsconfig.base.json
  tsup.config.ts                    # build config
  vitest.config.ts                  # test config
  vitest.setup.ts                   # ResizeObserver stub + test-utils cleanup
  README.md                         # public-facing docs
  src/
    index.ts                        # public exports
    composables/
      useVirtualWindow.ts           # the composable
      useVirtualWindow.test.ts      # 4 tests ported from React
CHANGELOG.md                        # MODIFIED — add entry under Unreleased
package.json                        # MODIFIED — extend publish:check to cover @sheetgrid/vue
```

**Responsibilities:**
- `package.json` — declares `@sheetgrid/vue` at `0.0.1`, `type: "module"`, ESM+CJS+dts exports, tsup/vitest scripts, workspace deps on `@sheetgrid/core` and `@sheetgrid/tokens`, peer on `vue >=3.4`.
- `tsconfig.json` — thin extension of `tsconfig.base.json`; `outDir: dist`, `rootDir: src`, `lib: ["ES2022","DOM","DOM.Iterable"]`.
- `tsup.config.ts` — ESM + CJS + `.d.ts` output, externals for `vue`, `@sheetgrid/core`, `@sheetgrid/tokens`.
- `vitest.config.ts` — jsdom environment, loads `vitest.setup.ts`.
- `vitest.setup.ts` — stubs `ResizeObserver` when jsdom lacks it (mirrors `packages/react/vitest.setup.ts`); enables `@vue/test-utils` cleanup via `enableAutoUnmount(afterEach)`.
- `src/index.ts` — re-exports `useVirtualWindow` and its types; nothing else yet (later milestones grow this).
- `src/composables/useVirtualWindow.ts` — full composable (windowing, scroll listener, `ResizeObserver` measurement, pin handling, `scrollToIndex`). Vue reactivity around `@sheetgrid/core` primitives.
- `src/composables/useVirtualWindow.test.ts` — four tests mirroring `packages/react/src/useVirtualWindow.test.tsx` one-to-one (basic window, scroll update, pinKeys, no-transform assertion).
- `README.md` — install, quickstart, note that only `useVirtualWindow` is available in `0.0.x`; full grid follows in later milestones.
- `CHANGELOG.md` — new `## Unreleased` bullet under an `Added` heading naming the new package.
- Root `package.json` — extend `publish:check` script so `pnpm --filter @sheetgrid/vue publish --dry-run --no-git-checks` also runs.

---

## Prep — branch off `main`

- [ ] **Step 1: Confirm `main` is up to date locally**

```bash
git checkout main
git pull --ff-only origin main
```

Expected: `Already up to date.` (or a fast-forward if new commits exist).

- [ ] **Step 2: Create the feature branch**

```bash
git checkout -b feat/vue-scaffold-virtual-window
```

Expected: `Switched to a new branch 'feat/vue-scaffold-virtual-window'`.

---

## Task 1: Package scaffolding

**Files:**
- Create: `packages/vue/package.json`
- Create: `packages/vue/tsconfig.json`
- Create: `packages/vue/tsup.config.ts`
- Create: `packages/vue/vitest.config.ts`
- Create: `packages/vue/vitest.setup.ts`
- Create: `packages/vue/src/index.ts`

- [ ] **Step 1: Create `packages/vue/package.json`**

```json
{
  "name": "@sheetgrid/vue",
  "version": "0.0.1",
  "description": "SheetGrid — Excel-class Vue 3 data grid: virtualized, customizable, responsive",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": [
    "dist",
    "README.md"
  ],
  "sideEffects": false,
  "publishConfig": {
    "access": "public"
  },
  "keywords": [
    "sheetgrid",
    "vue",
    "vue3",
    "datagrid",
    "data-grid",
    "spreadsheet",
    "excel",
    "virtualized",
    "table",
    "typescript"
  ],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "pnpm run build && pnpm run test"
  },
  "peerDependencies": {
    "vue": ">=3.4.0"
  },
  "dependencies": {
    "@sheetgrid/core": "workspace:*",
    "@sheetgrid/tokens": "workspace:*"
  },
  "devDependencies": {
    "@vue/test-utils": "^2.4.6",
    "jsdom": "^25.0.0",
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "vue": "^3.4.0"
  }
}
```

- [ ] **Step 2: Create `packages/vue/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/vue/tsup.config.ts`**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["vue", "@sheetgrid/core", "@sheetgrid/tokens"],
});
```

- [ ] **Step 4: Create `packages/vue/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

- [ ] **Step 5: Create `packages/vue/vitest.setup.ts`**

```ts
import { enableAutoUnmount } from "@vue/test-utils";
import { afterEach } from "vitest";

// jsdom does not implement ResizeObserver; composable falls back without it,
// but a stub keeps observe/unobserve call sites stable in tests.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}

enableAutoUnmount(afterEach);
```

- [ ] **Step 6: Create `packages/vue/src/index.ts` (placeholder)**

```ts
// Populated in Task 2 — leave a marker so the file exists for tsup to resolve.
export {};
```

- [ ] **Step 7: Install workspace deps**

Run: `pnpm install`
Expected: pnpm picks up the new package, installs `vue`, `@vue/test-utils`, `jsdom`, `tsup`, `typescript`, `vitest`. Exit code 0.

- [ ] **Step 8: Verify the scaffold builds cleanly**

Run: `pnpm --filter @sheetgrid/vue build`
Expected: tsup produces `packages/vue/dist/index.js`, `.cjs`, `.d.ts` (all empty besides module boilerplate). Exit code 0.

- [ ] **Step 9: Verify lint/format is clean**

Run: `pnpm lint`
Expected: `Checked N files in Xms. No fixes applied.` Exit code 0. If Biome reports formatting issues, run `pnpm format` and re-run `pnpm lint`.

- [ ] **Step 10: Commit**

```bash
git add packages/vue pnpm-lock.yaml
git commit -m "\`@sheetgrid/vue\`: package scaffold"
```

Expected: single new-file commit. Verify author with `git log -1 --format='%an <%ae>%n%B'` — must be your git identity and must **not** contain any Co-Authored-By trailer or AI/agent attribution.

---

## Task 2: Types + inert composable stub

**Files:**
- Create: `packages/vue/src/composables/useVirtualWindow.ts`
- Modify: `packages/vue/src/index.ts`

- [ ] **Step 1: Create the composable stub with the full types**

Write `packages/vue/src/composables/useVirtualWindow.ts`:

```ts
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
```

- [ ] **Step 2: Replace `src/index.ts` with real exports**

```ts
export { useVirtualWindow } from "./composables/useVirtualWindow.js";
export type {
  UseVirtualWindowOptions,
  UseVirtualWindowResult,
  VirtualItem,
} from "./composables/useVirtualWindow.js";
```

- [ ] **Step 3: Build to confirm types compile**

Run: `pnpm --filter @sheetgrid/vue build`
Expected: exit 0. `packages/vue/dist/index.d.ts` now exports `useVirtualWindow` and its types.

- [ ] **Step 4: Commit**

```bash
git add packages/vue/src
git commit -m "\`@sheetgrid/vue\`: add useVirtualWindow types and inert stub"
```

---

## Task 3: Test 1 — "mounts only a window of rows"

**Files:**
- Create: `packages/vue/src/composables/useVirtualWindow.test.ts`
- Modify: `packages/vue/src/composables/useVirtualWindow.ts`

Reference test (React): `packages/react/src/useVirtualWindow.test.tsx:78-91`.

- [ ] **Step 1: Write the fixture and first failing test**

Create `packages/vue/src/composables/useVirtualWindow.test.ts`:

```ts
import { mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { describe, expect, it } from "vitest";
import { useVirtualWindow } from "./useVirtualWindow.js";

function makeFixture(props: {
  count?: number;
  itemSize?: number;
  pinKeys?: string[];
}) {
  const count = props.count ?? 100;
  const itemSize = props.itemSize ?? 40;
  const pinKeys = props.pinKeys;

  return defineComponent({
    setup() {
      const scrollerRef = ref<HTMLDivElement | null>(null);
      const rows = Array.from({ length: count }, (_, i) => ({
        id: `r${i}`,
        label: `Row ${i}`,
      }));
      const v = useVirtualWindow({
        count: rows.length,
        getItemKey: (i) => rows[i]!.id,
        estimateSize: () => itemSize,
        overscan: 1,
        getScrollElement: () => scrollerRef.value,
        pinKeys,
      });
      return { scrollerRef, rows, v, itemSize };
    },
    render() {
      return h(
        "div",
        {
          ref: "scrollerRef",
          "data-testid": "scroller",
          style: { height: "200px", overflow: "auto" },
        },
        [
          h("div", {
            "data-testid": "pad-start",
            style: { height: `${this.v.padStart.value}px` },
          }),
          ...this.v.virtualItems.value.map((item) =>
            h(
              "div",
              {
                key: item.key,
                "data-index": item.index,
                "data-testid": `row-${item.index}`,
                ref: (el: unknown) =>
                  this.v.measureElement(el as Element | null),
                style: { height: `${this.itemSize}px` },
              },
              this.rows[item.index]!.label,
            ),
          ),
          h("div", {
            "data-testid": "pad-end",
            style: { height: `${this.v.padEnd.value}px` },
          }),
          h("div", { "data-testid": "total" }, String(this.v.totalSize.value)),
          h(
            "div",
            { "data-testid": "mounted-count" },
            String(this.v.virtualItems.value.length),
          ),
        ],
      );
    },
  });
}

function mockScroller(
  el: HTMLElement,
  opts: { clientHeight?: number; scrollTop?: number },
) {
  Object.defineProperty(el, "clientHeight", {
    configurable: true,
    value: opts.clientHeight ?? 200,
  });
  Object.defineProperty(el, "clientWidth", {
    configurable: true,
    value: 300,
  });
  let scrollTop = opts.scrollTop ?? 0;
  Object.defineProperty(el, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (v: number) => {
      scrollTop = v;
    },
  });
  Object.defineProperty(el, "scrollLeft", {
    configurable: true,
    get: () => 0,
    set: () => {},
  });
}

describe("useVirtualWindow", () => {
  it("mounts only a window of rows, not the full list", async () => {
    const Fixture = makeFixture({ count: 100, itemSize: 40 });
    const wrapper = mount(Fixture, { attachTo: document.body });
    const scroller = wrapper.get('[data-testid="scroller"]').element as HTMLElement;
    mockScroller(scroller, { clientHeight: 200, scrollTop: 0 });
    scroller.dispatchEvent(new Event("scroll"));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="row-0"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="row-99"]').exists()).toBe(false);
    const mounted = Number(
      wrapper.get('[data-testid="mounted-count"]').text(),
    );
    expect(mounted).toBeLessThan(30);
    expect(wrapper.get('[data-testid="total"]').text()).toBe("4000");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @sheetgrid/vue test`
Expected: FAIL. The stub returns `virtualItems: []` and `totalSize: 0`, so `row-0` won't exist and `total` will be `"0"`.

- [ ] **Step 3: Implement the real composable**

Replace `packages/vue/src/composables/useVirtualWindow.ts` with the full implementation. Structure mirrors `packages/react/src/useVirtualWindow.ts` — same core primitives, Vue-idiomatic reactivity.

```ts
import {
  anchorScrollDelta,
  buildPrefixSums,
  computePads,
  createSizeCache,
  expandWindowForPins,
  offsetOf,
  sizeAt,
  windowFromPrefix,
  type SizeCache,
} from "@sheetgrid/core";
import type { ComputedRef, MaybeRefOrGetter } from "vue";
import {
  computed,
  onScopeDispose,
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
  getScrollElement: () => HTMLElement | null;
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
  virtualItems: ComputedRef<VirtualItem[]>;
  startIndex: ComputedRef<number>;
  endIndex: ComputedRef<number>;
  padStart: ComputedRef<number>;
  padEnd: ComputedRef<number>;
  totalSize: ComputedRef<number>;
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
    getScrollElement,
    horizontal: horizontalOpt = false,
    pinKeys: pinKeysOpt,
    pinIndexes: pinIndexesOpt,
    enabled: enabledOpt = true,
  } = options;

  const cache: SizeCache = createSizeCache({ defaultEstimate: 40 });

  const scrollOffset = shallowRef(0);
  const viewportSize = shallowRef(0);
  const sizeVersion = shallowRef(0);
  const bumpSize = () => {
    sizeVersion.value += 1;
  };

  // Reactive views over the option inputs
  const count = computed(() => toValue(countOpt));
  const overscan = computed(() => toValue(overscanOpt));
  const horizontal = computed(() => toValue(horizontalOpt));
  const enabled = computed(() => toValue(enabledOpt));
  const pinKeys = computed(() => toValue(pinKeysOpt));
  const pinIndexes = computed(() => toValue(pinIndexesOpt));

  // Bind scroll + viewport tracking to *their* element.
  // `getScrollElement` is a plain function; wrapping in watchEffect lets Vue
  // re-run when it reads a template ref that populates after mount.
  const observed = new Map<Element, number>();
  let ro: ResizeObserver | null = null;
  let currentEl: HTMLElement | null = null;
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
    currentEl = next;
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

  // Key list depends on count
  const keys = computed(() => {
    const n = count.value;
    const out: string[] = new Array(n);
    for (let i = 0; i < n; i++) out[i] = getItemKey(i);
    return out;
  });

  // Seed estimates into the cache when new keys appear
  watch(
    keys,
    (list) => {
      for (let i = 0; i < list.length; i++) {
        const key = list[i]!;
        if (cache.get(key) === undefined) {
          cache.setEstimate(key, estimateSize(i));
        }
      }
    },
    { immediate: true },
  );

  const sizes = computed(() => {
    // Read sizeVersion to invalidate when measurements land
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

  // Drop stale observations for unmounted indexes.
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
    const view = horizontal.value ? scroller.clientWidth : scroller.clientHeight;
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

  return {
    virtualItems,
    startIndex: computed(() => range.value.startIndex),
    endIndex: computed(() => range.value.endIndex),
    padStart: computed(() => range.value.padStart),
    padEnd: computed(() => range.value.padEnd),
    totalSize: computed(() => range.value.totalSize),
    measureElement,
    scrollToIndex,
  };
}
```

- [ ] **Step 4: Run the first test to verify it now passes**

Run: `pnpm --filter @sheetgrid/vue test -- -t "mounts only a window"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/vue/src
git commit -m "\`@sheetgrid/vue\`: implement useVirtualWindow with first passing test"
```

---

## Task 4: Test 2 — "updates the window on scroll"

**Files:**
- Modify: `packages/vue/src/composables/useVirtualWindow.test.ts`

Reference test (React): `packages/react/src/useVirtualWindow.test.tsx:93-101`.

- [ ] **Step 1: Append the second test inside the `describe` block**

```ts
  it("updates the window on scroll", async () => {
    const Fixture = makeFixture({ count: 100, itemSize: 40 });
    const wrapper = mount(Fixture, { attachTo: document.body });
    const scroller = wrapper.get('[data-testid="scroller"]').element as HTMLElement;
    mockScroller(scroller, { clientHeight: 200, scrollTop: 2000 });
    scroller.dispatchEvent(new Event("scroll"));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="row-0"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="row-50"]').exists()).toBe(true);
  });
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @sheetgrid/vue test -- -t "updates the window on scroll"`
Expected: PASS (the scroll listener installed in Task 3 already handles this).

- [ ] **Step 3: Commit**

```bash
git add packages/vue/src
git commit -m "\`@sheetgrid/vue\`: cover scroll-driven window update"
```

---

## Task 5: Test 3 — "keeps pinKeys mounted"

**Files:**
- Modify: `packages/vue/src/composables/useVirtualWindow.test.ts`

Reference test (React): `packages/react/src/useVirtualWindow.test.tsx:103-111`.

- [ ] **Step 1: Append the third test**

```ts
  it("keeps pinKeys mounted when outside the natural window", async () => {
    const Fixture = makeFixture({ count: 100, itemSize: 40, pinKeys: ["r0"] });
    const wrapper = mount(Fixture, { attachTo: document.body });
    const scroller = wrapper.get('[data-testid="scroller"]').element as HTMLElement;
    mockScroller(scroller, { clientHeight: 200, scrollTop: 3000 });
    scroller.dispatchEvent(new Event("scroll"));
    await wrapper.vm.$nextTick();

    // Natural window is near the end; the pin expands range to include r0.
    expect(wrapper.find('[data-testid="row-0"]').exists()).toBe(true);
  });
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @sheetgrid/vue test -- -t "keeps pinKeys mounted"`
Expected: PASS (pin handling was implemented in Task 3).

- [ ] **Step 3: Commit**

```bash
git add packages/vue/src
git commit -m "\`@sheetgrid/vue\`: cover pinKeys window expansion"
```

---

## Task 6: Test 4 — "no transform styles"

**Files:**
- Modify: `packages/vue/src/composables/useVirtualWindow.test.ts`

Reference test (React): `packages/react/src/useVirtualWindow.test.tsx:113-121`.

- [ ] **Step 1: Append the fourth test**

```ts
  it("does not introduce transform styles on mounted rows", async () => {
    const Fixture = makeFixture({ count: 20, itemSize: 40 });
    const wrapper = mount(Fixture, { attachTo: document.body });
    const scroller = wrapper.get('[data-testid="scroller"]').element as HTMLElement;
    mockScroller(scroller, { clientHeight: 200, scrollTop: 0 });
    scroller.dispatchEvent(new Event("scroll"));
    await wrapper.vm.$nextTick();
    const row = wrapper.get('[data-testid="row-0"]').element as HTMLElement;
    expect(row.style.transform).toBe("");
    expect(scroller.style.transform).toBe("");
  });
```

- [ ] **Step 2: Run the full suite**

Run: `pnpm --filter @sheetgrid/vue test`
Expected: 4 tests, all pass. Exit 0.

- [ ] **Step 3: Commit**

```bash
git add packages/vue/src
git commit -m "\`@sheetgrid/vue\`: assert non-invasive rendering (no transforms)"
```

---

## Task 7: SSR safety guard test

**Files:**
- Modify: `packages/vue/src/composables/useVirtualWindow.test.ts`

The spec commits to "no `window` / `document` / `ResizeObserver` access at module scope." Verify by importing the module inside a fresh worker with those globals removed.

- [ ] **Step 1: Add a suite-level SSR safety test**

Append after the existing `describe` block:

```ts
describe("useVirtualWindow — SSR safety", () => {
  it("module imports without touching window / ResizeObserver", async () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const originalRO = globalThis.ResizeObserver;
    // @ts-expect-error simulate a Node/SSR global scope
    delete (globalThis as { window?: unknown }).window;
    // @ts-expect-error same
    delete (globalThis as { document?: unknown }).document;
    // @ts-expect-error same
    delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
    try {
      // Fresh import to defeat vitest module caching for this file.
      const mod = await import(
        `./useVirtualWindow.js?ssr=${Date.now()}`
      );
      expect(typeof mod.useVirtualWindow).toBe("function");
    } finally {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
      globalThis.ResizeObserver = originalRO;
    }
  });
});
```

- [ ] **Step 2: Run the suite**

Run: `pnpm --filter @sheetgrid/vue test`
Expected: 5 tests pass. If this test fails with a `window is not defined` at import time, that means module-scope code touches DOM globals — search the composable for such access and move it inside `applyMetrics`, `watchEffect`, or `onScopeDispose`.

- [ ] **Step 3: Commit**

```bash
git add packages/vue/src
git commit -m "\`@sheetgrid/vue\`: verify useVirtualWindow imports SSR-clean"
```

---

## Task 8: README

**Files:**
- Create: `packages/vue/README.md`

- [ ] **Step 1: Write the README**

```markdown
# @sheetgrid/vue

Excel-class **Vue 3** data grid — virtualized rows & columns, object or 2D data, edit, validation, clipboard, groups, sort, built-in cell types, opt-in formulas.

> **Status:** `0.0.x` ships the `useVirtualWindow` composable for bring-your-own-table virtualization. The `<SheetGrid>` component and cell/editor system land in subsequent releases (see [Vue port spec](../../docs/superpowers/specs/2026-08-10-vue-port-design.md)).

## Install

```bash
pnpm add @sheetgrid/vue
# npm i @sheetgrid/vue
```

**Peer:** `vue >= 3.4` (needed for `defineModel` in later milestones).

Transitive: `@sheetgrid/core`, `@sheetgrid/tokens`.

## `useVirtualWindow`

Window an existing scroll parent and row markup without wrappers or CSS transforms. Popup-safe. Works with object rows or 2D JSON matrices.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useVirtualWindow } from "@sheetgrid/vue";

const props = defineProps<{ data: unknown[][] }>();
const scrollerRef = ref<HTMLDivElement | null>(null);

const v = useVirtualWindow({
  count: () => props.data.length,
  getItemKey: (i) => String(i),
  estimateSize: () => 32,
  getScrollElement: () => scrollerRef.value,
});
</script>

<template>
  <div ref="scrollerRef" style="height: 400px; overflow: auto">
    <table>
      <tbody>
        <tr v-if="v.padStart.value > 0" aria-hidden="true" :style="{ height: v.padStart.value + 'px' }">
          <td :colspan="data[0]?.length ?? 0" style="padding: 0; border: 0" />
        </tr>
        <tr
          v-for="item in v.virtualItems.value"
          :key="item.key"
          :data-index="item.index"
          :ref="(el) => v.measureElement(el as Element | null)"
        >
          <td v-for="(cell, c) in data[item.index]!" :key="c">{{ cell }}</td>
        </tr>
        <tr v-if="v.padEnd.value > 0" aria-hidden="true" :style="{ height: v.padEnd.value + 'px' }">
          <td :colspan="data[0]?.length ?? 0" style="padding: 0; border: 0" />
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `count` | `MaybeRefOrGetter<number>` | — | Length of the flattened list (post expand/collapse). |
| `getItemKey` | `(index) => string` | — | Stable key; include expand state when height depends on it. |
| `estimateSize` | `(index) => number` | — | Size until measured. |
| `getScrollElement` | `() => HTMLElement \| null` | — | Their overflow container. |
| `overscan` | `MaybeRefOrGetter<number>` | `3` | Extra items outside the viewport. |
| `horizontal` | `MaybeRefOrGetter<boolean>` | `false` | Column virtualization mode. |
| `pinKeys` | `MaybeRefOrGetter<readonly string[]>` | `undefined` | Keep these keys mounted (e.g. row with an open dropdown). |
| `pinIndexes` | `MaybeRefOrGetter<readonly number[]>` | `undefined` | Same as `pinKeys` but by index. |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | When false, exposes the full range. |

### Returns

`virtualItems`, `padStart`, `padEnd`, `totalSize`, `startIndex`, `endIndex` — all `ComputedRef`. `measureElement(el)` and `scrollToIndex(i, align?)` — plain functions.

## SSR / Nuxt

`useVirtualWindow` is SSR-safe: no `window` / `ResizeObserver` access at module scope. On the server it returns empty; the client re-runs after mount and populates. Hydration matches by construction.

Nuxt module ships as `@sheetgrid/nuxt` in a later milestone.

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add packages/vue/README.md
git commit -m "\`@sheetgrid/vue\`: add README"
```

---

## Task 9: CHANGELOG + publish:check

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `package.json`

- [ ] **Step 1: Read the current top of `CHANGELOG.md`**

```bash
head -20 CHANGELOG.md
```

Note the current `## Unreleased` (or top-most) heading and its existing bullets. You will append (not overwrite) an entry.

- [ ] **Step 2: Add a Vue entry under `Unreleased → Added`**

Under the existing `## Unreleased` block (create the `### Added` subsection if it does not already exist), append:

```markdown
- `@sheetgrid/vue`: new package (0.0.1). Ships `useVirtualWindow` composable — bring-your-own-table virtualization for Vue 3 with the same behavior as `@sheetgrid/react`'s hook. Object rows and 2D JSON matrices supported. SSR-safe.
```

Preserve every existing bullet exactly. Do not rewrap any other text.

- [ ] **Step 3: Extend `publish:check` in the root `package.json`**

Locate the `publish:check` script (currently ends with `pnpm --filter @sheetgrid/tokens publish --dry-run --no-git-checks`) and append:

```
&& pnpm --filter @sheetgrid/vue publish --dry-run --no-git-checks
```

After the edit, the value should read (single line):

```
node scripts/assert-ci-green.mjs && pnpm build && pnpm test && pnpm --filter @sheetgrid/core publish --dry-run --no-git-checks && pnpm --filter @sheetgrid/react publish --dry-run --no-git-checks && pnpm --filter @sheetgrid/tokens publish --dry-run --no-git-checks && pnpm --filter @sheetgrid/vue publish --dry-run --no-git-checks
```

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md package.json
git commit -m "\`@sheetgrid/vue\`: changelog and publish:check coverage"
```

---

## Task 10: Full green + branch clean

**Files:** none modified — verification only.

- [ ] **Step 1: Format and lint**

Run: `pnpm format && pnpm lint`
Expected: both exit 0. If `pnpm format` changed files, stage and amend into the most recent commit that owns those files — do not amend a merged commit and do not use `--no-verify`.

- [ ] **Step 2: Build every workspace package**

Run: `pnpm build`
Expected: all packages build. tsup output for `@sheetgrid/vue` under `packages/vue/dist/`.

- [ ] **Step 3: Run every workspace test suite**

Run: `pnpm test`
Expected: all package test suites pass (existing core / react suites + the 5 new Vue tests).

- [ ] **Step 4: Publish dry-run (does not push anything)**

Run: `pnpm --filter @sheetgrid/vue publish --dry-run --no-git-checks`
Expected: dry-run report listing `dist/` + `README.md`. Exit 0.

- [ ] **Step 5: Verify the branch's commit log has no AI/agent attribution**

```bash
git log --format='%B' main..HEAD | grep -Ei 'claude|anthropic|co-authored-by|gpt|grok|copilot' || echo "clean"
```

Expected: `clean`. If any hit shows up, rebase to fix the offending commit message before pushing (`git rebase -i main`, reword, force-push only after opening the PR — but do not force-push if a PR review has started).

- [ ] **Step 6: Push and open the PR (only when the user asks)**

Do NOT push automatically — the user explicitly asked to keep the milestone-1 doc artifacts local until they say otherwise. When they say "push and open PR":

```bash
git push -u origin feat/vue-scaffold-virtual-window
gh pr create --base main --head feat/vue-scaffold-virtual-window \
  --title "\`@sheetgrid/vue\`: scaffold + \`useVirtualWindow\`" \
  --body "$(cat <<'EOF'
## Summary

- New workspace package `@sheetgrid/vue` at `0.0.1`.
- Ships `useVirtualWindow` composable — Vue 3 port of `@sheetgrid/react`'s hook. Same core primitives (`buildPrefixSums`, `windowFromPrefix`, `expandWindowForPins`, `computePads`, `createSizeCache`, `anchorScrollDelta` from `@sheetgrid/core`), Vue reactivity wrapper (`shallowRef` version counter + `computed`).
- 4 behavior tests ported one-to-one from `packages/react/src/useVirtualWindow.test.tsx` + 1 SSR-safety import test.
- README, CHANGELOG entry, and `publish:check` extended.
- No changes to `@sheetgrid/core` or `@sheetgrid/react`.

## Test plan

- [ ] \`pnpm --filter @sheetgrid/vue test\` — 5/5 pass
- [ ] \`pnpm build\` — every workspace package builds
- [ ] \`pnpm test\` — every workspace test suite green
- [ ] \`pnpm --filter @sheetgrid/vue publish --dry-run --no-git-checks\` — dry-run succeeds
EOF
)"
```

Then `gh pr checks <number> --watch` and report the result to the user.

---

## Self-review

**Spec coverage** — every milestone-1 line item in the spec is implemented:

| Spec requirement (milestone 1 row) | Task(s) |
|---|---|
| `packages/vue/` skeleton (`package.json`, tsup, vitest, biome pass) | Task 1 |
| `useVirtualWindow.ts` composable | Tasks 2 (types) + 3 (impl) |
| Tests ported 1:1 from React | Tasks 3, 4, 5, 6 (all four React tests) |
| SSR safety guarantee | Task 7 (import-under-Node test) |
| README | Task 8 |
| CHANGELOG entry | Task 9 |
| `publish:check` updated | Task 9 |
| CI stays green | Task 10 (full `pnpm build && pnpm test`) |
| No changes to `@sheetgrid/core` or `@sheetgrid/react` | Enforced by touching only `packages/vue/`, `CHANGELOG.md`, root `package.json` |
| No AI/agent attribution | Task 10 Step 5 grep gate |
| Feature branch `feat/vue-scaffold-virtual-window` | Prep step 2 |

**Placeholder scan** — searched the plan for `TBD`, `TODO`, `implement later`, `similar to task N`, `add appropriate`, `handle edge cases`, empty code fences. None present. Every step that changes code shows the actual code; every command shows the actual command and expected outcome.

**Type consistency** — `UseVirtualWindowOptions`, `UseVirtualWindowResult`, and `VirtualItem` shapes are identical across Tasks 2 and 3 (the Task 3 body replaces the Task 2 stub in place). Return-object property names (`virtualItems`, `startIndex`, `endIndex`, `padStart`, `padEnd`, `totalSize`, `measureElement`, `scrollToIndex`) match everywhere they are referenced (Tasks 3, 4, 5, 6, 8, PR body). `MaybeRefOrGetter` inputs are used consistently.
