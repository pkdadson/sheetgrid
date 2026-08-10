# Vue milestone 2a — `<SheetGrid>` scaffold + `useGridStore` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `<SheetGrid>` component to `@sheetgrid/vue` — data-only render (headers + cells, object rows and 2D matrix), reactive `useGridStore` composable, tokens injection, `VueColumnDef` type — passing a 1:1 port of `Grid.test.tsx`. No virtualization (that's 2b), no interaction (that's 2c). Additive only, no changes to `@sheetgrid/core` or `@sheetgrid/react`.

**Architecture:** `<SheetGrid>` is an SFC that accepts either `rows`+`columns` (object mode) or `data`+`headerRow` (matrix mode). Data flows through `@sheetgrid/core`'s `fromObjects`/`fromMatrix` into `createGridStore`, which is wrapped by a new `useGridStore` composable (Vue reactivity via `shallowRef` version counter + `computed` selectors, same pattern as `useVirtualWindow`). Rendering uses semantic table markup with the same ARIA roles as React's `<Grid>` (`role="grid"`, `role="row"`, `role="columnheader"`, `role="cell"`) plus the shared CSS classes (`eg-frame`, `eg-root`, `eg-table`, `eg-th`, `eg-td`) injected once via `injectTokens()`. `SheetGrid.vue` watches its reactive inputs and calls `store.replaceRows`/`store.replaceColumns` when the parent's props change.

**Tech Stack:** Vue 3.4+ SFC (`<script setup lang="ts">`), TypeScript 5.6, `@vue/test-utils` + vitest + jsdom, tsup, Biome (repo-wide). No new peer or runtime dependencies.

**Reference:** Design spec at `docs/superpowers/specs/2026-08-10-vue-port-design.md`. React sources: `packages/react/src/Grid.tsx`, `packages/react/src/inject-tokens.ts`, `packages/react/src/column-types.ts`, `packages/react/src/Grid.test.tsx`. Milestone 1 composable pattern reference: `packages/vue/src/composables/useVirtualWindow.ts`.

**Branch:** `feat/vue-sheetgrid-component` off `main` (already cut). Every commit uses subject `` `@sheetgrid/vue`: <message> ``. No AI/agent attribution anywhere.

---

## File structure

```
packages/vue/
  src/
    inject-tokens.ts                          # NEW — port React CSS + injection function
    column-types.ts                           # NEW — VueColumnDef, re-export ObjectRow/SelectOption
    SheetGrid.vue                             # NEW — the component
    SheetGrid.test.ts                         # NEW — ports Grid.test.tsx (2 tests)
    composables/
      useGridStore.ts                         # NEW — reactive wrap of createGridStore
      useGridStore.test.ts                    # NEW — reactivity smoke test
    index.ts                                  # MODIFIED — export new symbols
  README.md                                   # MODIFIED — status: `<SheetGrid>` is now available
```

**Responsibilities:**
- `inject-tokens.ts` — one function `injectTokens()` that appends a `<style id="sheetgrid-tokens">` to `document.head` with the full CSS from `packages/react/src/inject-tokens.ts` (byte-identical `CSS` string). SSR-safe (no-op when `document` is undefined).
- `column-types.ts` — `ObjectRow` = `Record<string, unknown> & { id: string }`. `SelectOption` = `{ label, value }`. `VueColumnDef` extends core `ColumnDef` with NO framework-specific fields yet (cell/editor components come in milestone 3).
- `useGridStore.ts` — composable that owns a `GridStore`, exposes `store`, reactive `rows`, `columns`, `errors` computed off a version-counter, unsubscribes on scope dispose. Signature: `useGridStore(input: MaybeRefOrGetter<CreateGridStoreInput>) => { store, rows, columns, errors }`. Does NOT auto-watch input for changes — caller (SheetGrid) manages `replaceRows`/`replaceColumns`.
- `useGridStore.test.ts` — one test that mutates the store via `store.setCell()` and asserts the `rows` computed updates; one test that asserts `onScopeDispose` unsubscribes.
- `SheetGrid.vue` — SFC accepting minimal m2a prop subset (`rows`, `columns`, `data`, `headerRow`, `density`, `theme`, `zebra`, `className`, `data-testid`). Calls `injectTokens()` on mount. Uses `useGridStore`. Watches `props.rows`/`props.columns`/`props.data`/`props.headerRow` and calls `store.replaceRows`/`store.replaceColumns` accordingly. Renders `<table class="eg-table">` inside `<div class="eg-frame">` > `<div class="eg-root" role="grid">`.
- `SheetGrid.test.ts` — mounts the component with `@vue/test-utils`, asserts headers and cell values render (test 1: object mode with `Ada`/`36`; test 2: matrix mode with `Grace`).
- `index.ts` — add `export { default as SheetGrid } from "./SheetGrid.vue"`, `export type { SheetGridProps }`, `export { useGridStore }`, `export type { UseGridStoreOptions, UseGridStoreResult }`, `export { injectTokens }`, `export type { VueColumnDef, ObjectRow, SelectOption } from "./column-types"`.
- `README.md` — flip status: `<SheetGrid>` object + matrix rendering now available (no virtualization or interaction yet — those land in later milestones).

---

## Prep — confirm branch and clean state

- [ ] **Step 1: Confirm current branch**

```bash
git branch --show-current
```

Expected: `feat/vue-sheetgrid-component`.

- [ ] **Step 2: Confirm working tree is clean**

```bash
git status
```

Expected: `nothing to commit, working tree clean`. If not clean, STOP and report BLOCKED.

- [ ] **Step 3: Confirm milestone 1 tests still pass on this branch**

```bash
pnpm --filter @sheetgrid/vue test
```

Expected: 5/5 pass (the merged milestone 1 tests).

---

## Task 1: `injectTokens`

**Files:**
- Create: `packages/vue/src/inject-tokens.ts`

- [ ] **Step 1: Create `packages/vue/src/inject-tokens.ts`**

Write the file with the exact same `CSS` constant and `injectTokens()` function as `packages/react/src/inject-tokens.ts` (both files ship the same tokens/base styles because the CSS is framework-agnostic). Also export `isTokensInjected` for parity.

Read `packages/react/src/inject-tokens.ts` in full and copy every character of the file into `packages/vue/src/inject-tokens.ts` without changes. The React file has no React imports — it's plain TypeScript touching `document`.

Verify: `diff packages/react/src/inject-tokens.ts packages/vue/src/inject-tokens.ts` must return no output.

- [ ] **Step 2: Verify build still works with new file**

Run: `pnpm --filter @sheetgrid/vue build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add packages/vue/src/inject-tokens.ts
git commit -m '`@sheetgrid/vue`: port injectTokens (CSS parity with React)'
```

Verify author: `git log -1 --format='%an <%ae>%n%s'` — must be your git identity and the subject must show clean backticks (not `\``).

---

## Task 2: `VueColumnDef` + type re-exports

**Files:**
- Create: `packages/vue/src/column-types.ts`

- [ ] **Step 1: Create `packages/vue/src/column-types.ts`**

Content:

```ts
import type { ColumnDef } from "@sheetgrid/core";
import type { BuiltInCellType } from "./cells/types.js";

/**
 * A row you pass into `<SheetGrid rows={...}>`. `id` must be a stable string
 * that survives re-renders — selection, edit state, and reorder tracking key
 * off it. If you don't have a natural id, generate one once (e.g.
 * `crypto.randomUUID()`) and store it alongside your row data.
 */
export type ObjectRow = Record<string, unknown> & { id: string };

export interface SelectOption {
  label: string;
  value: string;
}

/**
 * Column definition used by `<SheetGrid>`. Extends core `ColumnDef`. Vue
 * component overrides for `cell` and `editor` land in a later milestone.
 */
export interface VueColumnDef extends ColumnDef {
  /** Built-in cell type. Default: "text". */
  type?: BuiltInCellType | (string & {});
  selectOptions?: SelectOption[];
}
```

**Important:** this file imports from `./cells/types.js` — that path does NOT exist yet on this branch. Create a minimal stub at `packages/vue/src/cells/types.ts` (see Step 2) so the import resolves.

- [ ] **Step 2: Create `packages/vue/src/cells/types.ts` (stub)**

Content:

```ts
/**
 * Placeholder for the cell-type registry landing in milestone 3.
 * `<SheetGrid>` in milestone 2a only uses `BuiltInCellType` as an opaque string
 * hint on `VueColumnDef`; the actual registry, `CellTypeDefinition`, and Vue
 * cell components come later.
 */
export type BuiltInCellType = "text" | "number" | "boolean" | "select";
```

- [ ] **Step 3: Build to verify TypeScript resolves**

Run: `pnpm --filter @sheetgrid/vue build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add packages/vue/src/column-types.ts packages/vue/src/cells/types.ts
git commit -m '`@sheetgrid/vue`: add VueColumnDef and cell-type stub'
```

---

## Task 3: `useGridStore` composable

**Files:**
- Create: `packages/vue/src/composables/useGridStore.ts`
- Create: `packages/vue/src/composables/useGridStore.test.ts`

- [ ] **Step 1: Write the failing test at `packages/vue/src/composables/useGridStore.test.ts`**

```ts
import { effectScope, ref } from "vue";
import { describe, expect, it } from "vitest";
import type { ColumnDef, GridRow } from "@sheetgrid/core";
import { useGridStore } from "./useGridStore.js";

function makeInput(): { rows: GridRow[]; columns: ColumnDef[] } {
  return {
    columns: [
      { id: "name", header: "Name" },
      { id: "age", header: "Age" },
    ],
    rows: [
      { id: "1", values: { name: "Ada", age: 36 } },
      { id: "2", values: { name: "Grace", age: 40 } },
    ],
  };
}

describe("useGridStore", () => {
  it("exposes reactive rows that update when the store mutates", () => {
    const { store, rows } = useGridStore(makeInput());
    expect(rows.value).toHaveLength(2);
    expect(rows.value[0]!.values.name).toBe("Ada");

    store.setCell("1", "name", "Alan", "edit");
    expect(rows.value[0]!.values.name).toBe("Alan");
  });

  it("exposes reactive columns via getOrderedColumns", () => {
    const { columns } = useGridStore(makeInput());
    expect(columns.value.map((c) => c.id)).toEqual(["name", "age"]);
  });

  it("accepts a reactive input (getter)", () => {
    const src = ref(makeInput());
    const { rows } = useGridStore(() => src.value);
    expect(rows.value).toHaveLength(2);
    // Composable only uses the input at creation time — caller manages
    // replacement, so updating `src` here does NOT change `rows`.
    src.value = { ...makeInput(), rows: [{ id: "9", values: {} }] };
    expect(rows.value).toHaveLength(2);
  });

  it("unsubscribes when the scope is disposed", () => {
    const scope = effectScope();
    let refRows: ReturnType<typeof useGridStore>["rows"] | null = null;
    let refStore: ReturnType<typeof useGridStore>["store"] | null = null;
    scope.run(() => {
      const g = useGridStore(makeInput());
      refRows = g.rows;
      refStore = g.store;
    });
    const before = refRows!.value[0]!.values.name;
    scope.stop();
    // After dispose the subscription is gone; mutations no longer bump the
    // version counter, so the computed does not update.
    refStore!.setCell("1", "name", "Grace", "edit");
    expect(refRows!.value[0]!.values.name).toBe(before);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @sheetgrid/vue test -- -t "useGridStore"`
Expected: FAIL with `Cannot find module './useGridStore.js'` (or similar module-resolution error). If the test somehow passes, STOP and report BLOCKED.

- [ ] **Step 3: Implement `packages/vue/src/composables/useGridStore.ts`**

```ts
import {
  createGridStore,
  type CreateGridStoreInput,
  type GridStore,
} from "@sheetgrid/core";
import type { CellError, ColumnDef, GridRow } from "@sheetgrid/core";
import type { ComputedRef, MaybeRefOrGetter } from "vue";
import { computed, onScopeDispose, shallowRef, toValue } from "vue";

export interface UseGridStoreOptions {
  input: MaybeRefOrGetter<CreateGridStoreInput>;
}

export interface UseGridStoreResult {
  store: GridStore;
  rows: ComputedRef<GridRow[]>;
  columns: ComputedRef<ColumnDef[]>;
  errors: ComputedRef<Map<string, CellError>>;
}

/**
 * Own a `GridStore` and expose reactive selectors over it. The input is
 * evaluated once at creation time — the caller manages replacement via
 * `store.replaceRows()` / `store.replaceColumns()` when props change. This
 * matches the React version's pattern and keeps store identity stable across
 * a component's lifetime.
 */
export function useGridStore(
  input: MaybeRefOrGetter<CreateGridStoreInput>,
): UseGridStoreResult {
  const store = createGridStore(toValue(input));
  const version = shallowRef(0);
  const stop = store.subscribe(() => {
    version.value += 1;
  });
  onScopeDispose(stop);

  const rows = computed(() => {
    // Read version to establish reactive dep on store notifications
    void version.value;
    return store.getRows();
  });
  const columns = computed(() => {
    void version.value;
    return store.getOrderedColumns();
  });
  const errors = computed(() => {
    void version.value;
    return store.getErrors();
  });

  return { store, rows, columns, errors };
}
```

- [ ] **Step 4: Run the test suite**

Run: `pnpm --filter @sheetgrid/vue test`
Expected: 5 (milestone 1) + 4 (new) = 9 tests pass. If any fail, STOP and report BLOCKED with the failure output.

- [ ] **Step 5: Commit**

```bash
git add packages/vue/src/composables
git commit -m '`@sheetgrid/vue`: add useGridStore composable'
```

---

## Task 4: `<SheetGrid>` skeleton + first `Grid.test.tsx` test (object mode)

**Files:**
- Create: `packages/vue/src/SheetGrid.vue`
- Create: `packages/vue/src/SheetGrid.test.ts`

- [ ] **Step 1: Write the failing test at `packages/vue/src/SheetGrid.test.ts`**

```ts
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SheetGrid from "./SheetGrid.vue";

describe("SheetGrid", () => {
  it("renders headers and cell values from rows/columns", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        rows: [{ id: "1", name: "Ada", age: 36 }],
        columns: [
          { id: "name", header: "Name" },
          { id: "age", header: "Age" },
        ],
      },
      attachTo: document.body,
    });
    const text = wrapper.text();
    expect(text).toContain("Name");
    expect(text).toContain("Age");
    expect(text).toContain("Ada");
    expect(text).toContain("36");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sheetgrid/vue test -- -t "renders headers and cell values"`
Expected: FAIL with `Cannot find module './SheetGrid.vue'` (or similar module-resolution error).

- [ ] **Step 3: Implement `packages/vue/src/SheetGrid.vue`**

```vue
<script setup lang="ts">
import {
  type ColumnDef,
  type GridRow,
  fromMatrix,
  fromObjects,
} from "@sheetgrid/core";
import { computed, onMounted, watch } from "vue";
import type { ObjectRow, VueColumnDef } from "./column-types.js";
import { useGridStore } from "./composables/useGridStore.js";
import { injectTokens } from "./inject-tokens.js";

export interface SheetGridProps {
  /** Object rows. Every row must have a stable string `id`. */
  rows?: ObjectRow[];
  /** Column definitions. */
  columns?: VueColumnDef[];
  /** 2D matrix data. Use instead of `rows`/`columns` for spreadsheet input. */
  data?: unknown[][];
  /** Treat the first row of `data` as the header row. */
  headerRow?: boolean;
  density?: "comfortable" | "compact";
  theme?: "light" | "dark";
  zebra?: boolean;
  className?: string;
}

const props = withDefaults(defineProps<SheetGridProps>(), {
  density: "comfortable",
  zebra: false,
});

onMounted(() => {
  injectTokens();
});

function normalize(
  p: Pick<SheetGridProps, "rows" | "columns" | "data" | "headerRow">,
): { rows: GridRow[]; columns: ColumnDef[] } {
  if (p.data) {
    return fromMatrix(p.data, { headerRow: p.headerRow });
  }
  const columns = (p.columns ?? []) as ColumnDef[];
  return {
    columns,
    rows: fromObjects(p.rows ?? [], columns),
  };
}

const initial = normalize(props);
const { store, rows, columns } = useGridStore({
  rows: initial.rows,
  columns: initial.columns,
});

// Sync store when props change. Object mode uses `columns` identity as the
// column source of truth; matrix mode derives both from `data` + `headerRow`.
watch(
  () => [props.rows, props.columns, props.data, props.headerRow] as const,
  () => {
    const next = normalize(props);
    store.replaceColumns(next.columns);
    store.replaceRows(next.rows);
  },
  { deep: true },
);
</script>

<template>
  <div
    class="eg-frame"
    :class="className"
    :data-density="density"
    :data-theme="theme"
    :data-zebra="zebra ? 'true' : 'false'"
  >
    <div class="eg-root" role="grid" tabindex="0">
      <table class="eg-table">
        <thead>
          <tr role="row">
            <th
              v-for="col in columns"
              :key="col.id"
              class="eg-th eg-th-leaf"
              role="columnheader"
            >
              {{ col.header ?? col.id }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
            role="row"
            class="eg-data-row"
          >
            <td
              v-for="col in columns"
              :key="col.id"
              class="eg-td"
              role="cell"
            >
              {{ formatCellValue(row.values[col.id]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
function formatCellValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return String(v);
  return "";
}
</script>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @sheetgrid/vue test -- -t "renders headers and cell values"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/vue/src
git commit -m '`@sheetgrid/vue`: add SheetGrid component (object mode render)'
```

---

## Task 5: Matrix mode test (`Grid.test.tsx` test 2)

**Files:**
- Modify: `packages/vue/src/SheetGrid.test.ts`

- [ ] **Step 1: Append the matrix-mode test to the existing `describe("SheetGrid", ...)` block**

```ts
  it("renders 2D data with headerRow", () => {
    const wrapper = mount(SheetGrid, {
      props: {
        data: [
          ["Name", "Age"],
          ["Grace", 40],
        ],
        headerRow: true,
      },
      attachTo: document.body,
    });
    expect(wrapper.text()).toContain("Grace");
  });
```

- [ ] **Step 2: Run the full suite**

Run: `pnpm --filter @sheetgrid/vue test`
Expected: all tests pass. Milestone 1: 5, useGridStore: 4, SheetGrid: 2. Total 11.

If matrix test fails, most likely `fromMatrix` returns a column shape whose `.id` differs from the auto-generated header — verify by logging `columns.value` in the fixture. Do NOT change the composable; the fix is in `SheetGrid.vue`'s `normalize` if needed.

- [ ] **Step 3: Commit**

```bash
git add packages/vue/src/SheetGrid.test.ts
git commit -m '`@sheetgrid/vue`: cover matrix mode with headerRow'
```

---

## Task 6: Wire exports and update README

**Files:**
- Modify: `packages/vue/src/index.ts`
- Modify: `packages/vue/README.md`

- [ ] **Step 1: Update `packages/vue/src/index.ts`**

Read the current file. It currently exports only `useVirtualWindow`. Add these lines while preserving the existing exports:

```ts
export { default as SheetGrid } from "./SheetGrid.vue";
export type { SheetGridProps } from "./SheetGrid.vue";

export { useGridStore } from "./composables/useGridStore.js";
export type {
  UseGridStoreOptions,
  UseGridStoreResult,
} from "./composables/useGridStore.js";

export { injectTokens, isTokensInjected } from "./inject-tokens.js";

export type { ObjectRow, SelectOption, VueColumnDef } from "./column-types.js";
```

Final file should have both the old `useVirtualWindow` exports AND the new symbols. Do not remove any existing export.

- [ ] **Step 2: Verify build produces the new type surface**

Run: `pnpm --filter @sheetgrid/vue build`
Expected: exit 0. `packages/vue/dist/index.d.ts` now includes `SheetGrid`, `useGridStore`, `injectTokens`, `VueColumnDef`.

- [ ] **Step 3: Update `packages/vue/README.md`**

Replace the existing status callout:

```markdown
> **Status:** `0.0.x` ships the `useVirtualWindow` composable for bring-your-own-table virtualization. The `<SheetGrid>` component and cell/editor system land in subsequent releases.
```

with:

```markdown
> **Status:** `0.0.x` ships the `useVirtualWindow` composable and the `<SheetGrid>` component (data-only render, object rows and 2D matrix). Row/column virtualization, selection, keyboard, and clipboard land in the next release; cell types + editors follow.
```

Add a new section immediately BEFORE the existing `## \`useVirtualWindow\`` heading:

````markdown
## `<SheetGrid>` (data-only render, m2a preview)

```vue
<script setup lang="ts">
import { SheetGrid } from "@sheetgrid/vue";

const rows = [
  { id: "1", name: "Ada", age: 36 },
  { id: "2", name: "Grace", age: 40 },
];
const columns = [
  { id: "name", header: "Name" },
  { id: "age", header: "Age" },
];
</script>

<template>
  <SheetGrid :rows="rows" :columns="columns" />
</template>
```

Matrix mode:

```vue
<SheetGrid :data="[['Name', 'Age'], ['Ada', 36]]" header-row />
```

**Current props:** `rows`, `columns`, `data`, `headerRow`, `density`, `theme`, `zebra`, `className`. Row/column virtualization, selection, keyboard, and clipboard ship in the next release; cell types and editors follow.

````

- [ ] **Step 4: Commit**

```bash
git add packages/vue/src/index.ts packages/vue/README.md
git commit -m '`@sheetgrid/vue`: export SheetGrid + useGridStore, update README'
```

---

## Task 7: Full green + attribution grep

**Files:** none modified — verification only.

- [ ] **Step 1: Format and scoped lint**

Run: `pnpm --filter @sheetgrid/vue exec biome check src`
Expected: exit 0. If Biome flags style issues, run `pnpm --filter @sheetgrid/vue exec biome check src --fix` and re-check. Do NOT run `pnpm format` (reformats the whole repo).

If `noNonNullAssertion` fires on `list[i]!` in fixtures or the composable, add narrow `// biome-ignore lint/style/noNonNullAssertion: <reason>` comments matching the milestone 1 pattern (see `packages/vue/src/composables/useVirtualWindow.ts` for examples).

- [ ] **Step 2: Whole-workspace build**

Run: `pnpm build`
Expected: all packages build. `@sheetgrid/vue` dist reflects the new exports.

- [ ] **Step 3: Whole-workspace test**

Run: `pnpm test`
Expected: react 35/35, vue 11/11 (5 milestone-1 + 4 useGridStore + 2 SheetGrid).

- [ ] **Step 4: Publish dry-run**

Run: `pnpm --filter @sheetgrid/vue publish --dry-run --no-git-checks`
Expected: exit 0. Tarball now larger than milestone 1 (SheetGrid.vue + inject-tokens + useGridStore add roughly 4-6 kB).

- [ ] **Step 5: Attribution grep across the branch**

```bash
git log --format='%B' main..HEAD | grep -Ei 'claude|anthropic|co-authored-by|gpt|grok|copilot|openai|generated with' || echo "commit messages: clean"
git diff main..HEAD | grep -Ei 'claude|anthropic|co-authored-by|gpt-4|grok|copilot|openai|generated with|noreply@anthropic' || echo "diff: clean"
```

Both must print `clean`. If either hits, rebase to fix the offending commit BEFORE pushing.

- [ ] **Step 6: Do NOT push yet**

Report the branch state to the controller. The controller decides when to push and open the PR.

---

## Self-review

**Spec coverage** — every milestone 2a scope line is implemented:

| Requirement | Task(s) |
|---|---|
| `useGridStore` composable | Task 3 (impl + 4 tests) |
| `VueColumnDef` | Task 2 |
| `injectTokens` (CSS parity with React) | Task 1 |
| `<SheetGrid>` component | Tasks 4 (object mode) + 5 (matrix mode) |
| Passes `Grid.test.tsx` (2 tests ported 1:1) | Tasks 4 + 5 |
| No changes to `@sheetgrid/core` / `@sheetgrid/react` | Enforced by touching only `packages/vue/` |
| No AI/agent attribution | Task 7 Step 5 grep gate |
| Feature branch `feat/vue-sheetgrid-component` | Prep confirms |

**Deferred to milestone 2b (row + column virtualization):**
- Wrapping `<tbody>` rendering with `useVirtualWindow` internally.
- Column windowing via a second `useVirtualWindow` with `horizontal: true`.
- `column-virtual.test.tsx` port.
- `virtualizeColumns` and `overscan` props.

**Deferred to milestone 2c (interaction):**
- Selection state (`createSelection`, `selectCell`, `extendTo`, `toggleCell`).
- Click-to-select on `<td>` (mouseDown handler).
- Keyboard nav (`mapKeyToCommand` from core, arrow keys, Tab).
- TSV clipboard (Cmd/Ctrl+C via `serializeTsv`).
- `clipboard.test.tsx` port.
- `apps/demo-vue` extension to showcase `<SheetGrid>`.

**Placeholder scan** — searched for `TBD`, `TODO`, `implement later`, `similar to task N`, `add appropriate`, `handle edge cases`, empty code fences. None present. Every code step shows the full code; every command shows the expected outcome.

**Type consistency:**
- `SheetGridProps` interface defined once in `SheetGrid.vue` (Task 4), exported via `index.ts` (Task 6). Same name in test file (Task 5).
- `VueColumnDef`, `ObjectRow`, `SelectOption` — defined in Task 2 `column-types.ts`, re-exported in Task 6 `index.ts`. Used in `SheetGrid.vue` (Task 4).
- `UseGridStoreOptions`, `UseGridStoreResult` — defined in Task 3, re-exported in Task 6.
- `injectTokens`, `isTokensInjected` — defined in Task 1, re-exported in Task 6.
- `BuiltInCellType` — stub in Task 2 `cells/types.ts`; will be replaced by the real registry in milestone 3.
