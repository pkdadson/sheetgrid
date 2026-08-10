# Vue port — design spec

**Status:** approved for planning
**Author:** Dadson
**Date:** 2026-08-10
**Target packages:** new — `@sheetgrid/vue`, `@sheetgrid/nuxt`

## Goal

Ship `@sheetgrid/vue` at full feature parity with `@sheetgrid/react`, plus a small `@sheetgrid/nuxt` module for Nuxt 3 users. Vue 3 only. Delivered in six staged PRs into `main`, each keeping CI green and each reviewable in isolation. `@sheetgrid/core` and `@sheetgrid/react` are not modified — the Vue port is purely additive.

## Non-goals

- Vue 2 / Vue 2.7 support. EOL since Dec 2023; adds dual builds and `vue-demi` shims for an audience not adopting new libraries.
- Any refactor of `@sheetgrid/core` or `@sheetgrid/react`. The cell-type registry pattern is mirrored per-framework, not hoisted into core.
- A shared cross-framework cell-type registry. Deferred; may be revisited if a third framework is added.
- Big-bang merge. All work lands as a sequence of small PRs.

## Constraints

- **Framework target:** Vue 3.4+ (needed for `defineModel`), Nuxt 3.10+.
- **No AI/agent attribution** in commits or PR bodies.
- **CI parity:** existing `build-and-test` workflow runs `pnpm build && pnpm test` across `packages/*` — new packages must build and test cleanly under it, no workflow change.
- **SSR-safe by construction:** no `window` / `document` / `ResizeObserver` at module scope. Hydration must not mismatch.
- **Public API surface** mirrors `packages/react/src/index.ts` one-to-one in *what* is exported.
- **Package manager / build:** pnpm workspace, tsup (ESM + CJS + `.d.ts`), Biome for lint/format.

## Architecture

### Package layout

Two new packages in `packages/*`:

```
packages/
  vue/                         # @sheetgrid/vue
    src/
      SheetGrid.vue            # main component (SFC, <script setup lang="ts">)
      SortHeader.vue
      composables/
        useVirtualWindow.ts    # mirrors packages/react/src/useVirtualWindow.ts
        useGridStore.ts        # binds @sheetgrid/core store to Vue reactivity
        useKeyboard.ts
      cells/
        registry.ts            # mirror of packages/react/src/cells/registry.ts
        types.ts
        TextCell.vue
        NumberCell.vue
        BooleanCell.vue
        SelectCell.vue
      editors/
        TextEditor.vue
        NumberEditor.vue
        SelectEditor.vue
      column-types.ts          # VueColumnDef
      inject-tokens.ts
      index.ts                 # public API + core re-exports
    package.json               # peer: vue >=3.4
    tsup.config.ts
  nuxt/                        # @sheetgrid/nuxt
    src/
      module.ts                # defineNuxtModule wrapper
      runtime/
        plugin.ts
    test/nuxt-fixture/         # minimal Nuxt app for @nuxt/test-utils
    package.json               # peer: nuxt >=3.10
```

`pnpm-workspace.yaml` already globs `packages/*` — no root config change.

### Dependency graph

- `@sheetgrid/vue` → depends on `@sheetgrid/core` (workspace), `@sheetgrid/tokens` (workspace). Peer: `vue >=3.4`.
- `@sheetgrid/nuxt` → depends on `@sheetgrid/vue` (workspace) and `@nuxt/kit` (dev). Peer: `nuxt >=3.10`.
- No dependency on `@sheetgrid/react`.

### Reactive integration with `@sheetgrid/core`

`GridStore` (from `packages/core/src/model/grid-store.ts`) is a snapshot store: `subscribe(listener) => unsubscribe` plus getter methods (`getRows`, `getOrderedColumns`, `getErrors`, …). React binds it via `useSyncExternalStore`. Vue's equivalent is a `shallowRef` version counter bumped on every notification, with `computed` selectors reading through it.

```ts
// composables/useGridStore.ts
export function useGridStore(input: MaybeRefOrGetter<CreateGridStoreInput>) {
  const store = createGridStore(toValue(input))
  const version = shallowRef(0)

  const stop = store.subscribe(() => { version.value++ })
  onScopeDispose(stop)

  const rows    = computed(() => (version.value, store.getRows()))
  const columns = computed(() => (version.value, store.getOrderedColumns()))
  const errors  = computed(() => (version.value, store.getErrors()))

  return { store, rows, columns, errors /* + thin wrappers for setCell, moveColumn, ... */ }
}
```

Rationale:

- **`shallowRef` + version counter, not `reactive(rows)`.** The store owns identity; wrapping the array in `reactive` would deep-proxy every row and fight the store's mutation model.
- **`onScopeDispose`** unsubscribes on component unmount and inside nested `effectScope`s (composable usable in tests without a component).
- **Reactive inputs** via `MaybeRefOrGetter` so refs from the parent propagate — `SheetGrid.vue` watches them and calls `store.replaceRows` / `store.replaceColumns`.

`useVirtualWindow` follows the same pattern: options accept `MaybeRefOrGetter` where useful (`count`, `overscan`), and returns `{ virtualItems: ComputedRef<VirtualItem[]>, padStart: ComputedRef<number>, padEnd: ComputedRef<number>, totalSize: ComputedRef<number>, measureElement: (el) => void, scrollToIndex }`. Internal scroll listener, `ResizeObserver`, and size cache mirror `packages/react/src/useVirtualWindow.ts` one-to-one.

### Cell & editor system

Mirror pattern — same shape as React's registry, Vue components instead of React ones. No shared registry code in `@sheetgrid/core`.

**Types** (`cells/types.ts`):

```ts
import type { Component } from "vue"
import type { GridRow } from "@sheetgrid/core"
import type { VueColumnDef } from "../column-types"

export interface CellRenderProps {
  value: unknown
  row: GridRow
  column: VueColumnDef
  rowId: string
  isSelected: boolean
  isEditing: boolean
  error?: string
  onCommitValue: (value: unknown) => void
}

export interface EditorRenderProps {
  value: unknown
  column: VueColumnDef
  onChange: (value: unknown) => void
  onCommit: (value?: unknown) => void
  onCancel: () => void
  error?: string
}

export interface CellTypeDefinition {
  cell: Component<CellRenderProps>
  editor?: Component<EditorRenderProps>
}

export type BuiltInCellType = "text" | "number" | "boolean" | "select"
```

**Registry** (`cells/registry.ts`) — identical control flow to `packages/react/src/cells/registry.ts:10-40`. `Map<string, CellTypeDefinition>`, `ensureBuiltIns()` lazy-seeds `"text" | "number" | "boolean" | "select"`, `registerCellType`, `getCellType`, `resolveColumnType` all mirror the React API.

**Built-in SFCs** — thin `<script setup lang="ts">` components with behavior parity to the React versions:

- `TextCell` / `TextEditor` — display + `<input>` with commit-on-Enter/blur, cancel-on-Escape.
- `NumberCell` — right-aligned formatted display; `NumberEditor` uses `<input type="text" inputmode="decimal">` (avoids native number spinners, same as React), validates on commit.
- `BooleanCell` — in-cell `<input type="checkbox">` firing `onCommitValue`; no separate editor (same as React `packages/react/src/cells/registry.ts:16`).
- `SelectCell` — display; `SelectEditor` — dropdown of `SelectOption[]` from `column.options`, keyboard-navigable.

**Rendering inside `SheetGrid.vue`** — resolve the cell type per column, render `<component :is="def.cell" v-bind="cellProps" />` for display and `<component :is="def.editor ?? def.cell" v-bind="editorProps" />` when editing that coordinate. Custom types work via `column.type: "my-thing"` after `registerCellType("my-thing", { cell: MyCell, editor: MyEditor })`.

**Column overrides** — `VueColumnDef` extends core `ColumnDef` with optional per-column component overrides:

```ts
export interface VueColumnDef<T = ObjectRow> extends ColumnDef {
  cell?: Component<CellRenderProps>
  editor?: Component<EditorRenderProps>
  // rest: options, validators, format, sortable, etc. — inherited from core
}
```

### Public API surface

`@sheetgrid/vue/index.ts` mirrors `@sheetgrid/react/index.ts` 1:1 in *what* is exported, Vue-idiomatic in *how*.

**Component**

```ts
export { default as SheetGrid } from "./SheetGrid.vue"
export type { SheetGridProps } from "./SheetGrid.vue"
export { default as SortHeader } from "./SortHeader.vue"
```

`SheetGrid` accepts the same props React's `<Grid>` does (`data`, `columns`, `matrix`, selection/sort/formula props, etc.), typed via `defineProps<SheetGridProps>()`. Two-way state (selection, cell edits) exposed via `defineModel` where React uses controlled/uncontrolled prop pairs.

**Composables**

```ts
export { useVirtualWindow }   // options can be reactive; returns reactive result
export { useGridStore }       // wraps createGridStore, exposes reactive rows/selection/etc.
export type { UseVirtualWindowOptions, UseVirtualWindowResult, VirtualItem }
```

**Cell/editor registry & built-ins** (Vue components, same names as React)

```ts
export { registerCellType, getCellType, resolveColumnType }
export type { CellRenderProps, EditorRenderProps, CellTypeDefinition, BuiltInCellType }
export { TextCell, NumberCell, BooleanCell, SelectCell }
export { TextEditor, NumberEditor, SelectEditor }
```

**Column types & tokens**

```ts
export type { VueColumnDef, ObjectRow, SelectOption }
export { injectTokens }
```

**Core re-exports** — identical set to `packages/react/src/index.ts:35-54` (matrix/object adapters, validators, virtualization primitives, `cellKey`). Vue users get the same one-stop surface React users get.

### SSR & Nuxt module

**SSR safety in `@sheetgrid/vue`** (works with or without Nuxt):

- No `window`, `document`, or `ResizeObserver` access at module scope.
- All DOM reads live inside `onMounted` or scroll/resize listeners — client-only.
- On the server, `useVirtualWindow` returns `{ virtualItems: [], padStart: 0, padEnd: 0, totalSize: 0 }` (viewport size unknown). The client renders the same on first paint, then `onMounted` reads the viewport and populates. **Hydration matches by construction** — no `<ClientOnly>` wrapper needed for correctness.
- `SheetGrid.vue` renders the header + an empty tbody server-side; the body materializes post-mount. Users who want SSR skeletons render their own in a `<template #skeleton>` slot.

**`@sheetgrid/nuxt` module** — a thin `defineNuxtModule` wrapper:

```ts
// packages/nuxt/src/module.ts
export default defineNuxtModule({
  meta: { name: "@sheetgrid/nuxt", configKey: "sheetgrid" },
  setup() {
    const { resolve } = createResolver(import.meta.url)

    addImports([
      { name: "useVirtualWindow", from: "@sheetgrid/vue" },
      { name: "useGridStore",     from: "@sheetgrid/vue" },
    ])

    addComponent({ name: "SheetGrid",  export: "SheetGrid",  filePath: "@sheetgrid/vue" })
    addComponent({ name: "SortHeader", export: "SortHeader", filePath: "@sheetgrid/vue" })

    const nuxt = useNuxt()
    nuxt.options.build.transpile.push("@sheetgrid/vue")
  },
})
```

- No custom plugin needed — the base package is already SSR-safe.
- `nuxt/kit` is a dev-dep; `nuxt >=3.10` is the peer.

## Testing

**Stack** — same as `@sheetgrid/react`: `vitest` + `jsdom`. Add `@vue/test-utils` for component mount + interaction. `@testing-library/user-event` continues to work on the mounted DOM.

**Coverage rule** — every React test in `packages/react/src/**/*.test.tsx` gets a Vue counterpart, ported per milestone:

- `useVirtualWindow.test.ts` — port existing hook tests one-to-one (windowing, `pinKeys`, `padStart`/`padEnd`, `measureElement`, `horizontal`, `scrollToIndex`).
- `SheetGrid.test.ts` — port `Grid.test.tsx`, `column-virtual.test.tsx`, `groups.test.tsx`, `sort.test.tsx`, `clipboard.test.tsx`, `cell-types.test.tsx`, `bugfix-qa.test.tsx` (split across milestones 2–4).
- `useGridStore.test.ts` — reactivity smoke (mutate store, assert `rows` computed updates, unsubscribe on unmount).
- `ssr.test.ts` — `renderToString(SheetGrid)` produces markup without touching `window`; hydration check via `@vue/server-renderer` + `createSSRApp` + jsdom mount.

**Nuxt module test** — `packages/nuxt/test/module.test.ts` uses `@nuxt/test-utils` (`setup({ rootDir: 'test/nuxt-fixture' })`) to boot a real Nuxt app, `$fetch('/')` the page, and assert SSR HTML + client hydration are both clean.

## Build

- **`tsup`** — config identical in shape to `packages/react/tsup.config.ts` (ESM + CJS + `.d.ts`, `sideEffects: false`).
- **Vue SFCs** compiled via `unplugin-vue` (tsup plugin) — outputs plain JS + type declarations.
- **`publish:check`** in the root `package.json` script updated to include `pnpm --filter @sheetgrid/vue publish --dry-run --no-git-checks` and the same for `@sheetgrid/nuxt`.

## Local dev

- Reuse `apps/demo` (React) as-is.
- Add `apps/demo-vue` in milestone 2 as a smoke harness so contributors can `pnpm dev:demo-vue` and see the Vue grid running. Not published.

## Milestone plan

Each milestone is one PR into `main`. `@sheetgrid/vue` stays on `0.0.x` until milestone 6 tags `0.1.0`.

| # | PR title | Scope | Ships when |
|---|---|---|---|
| **1** | `` `@sheetgrid/vue`: scaffold + `useVirtualWindow` `` | `packages/vue/` skeleton (package.json, tsup, vitest, biome pass), `useVirtualWindow.ts` composable, tests ported 1:1 from React, README, CHANGELOG entry, `publish:check` updated. | Composable behaves identically to React hook across ported test suite. |
| **2** | `` `@sheetgrid/vue`: `<SheetGrid>` — data, selection, keyboard, clipboard `` | `SheetGrid.vue`, `useGridStore`, `VueColumnDef`, `injectTokens`, `useKeyboard`, TSV clipboard. Object + matrix data. `apps/demo-vue`. Ported `Grid.test.tsx`, `column-virtual.test.tsx`, `clipboard.test.tsx`. | Grid renders/navigates/pastes with parity to React's `<Grid>` for the same props subset. |
| **3** | `` `@sheetgrid/vue`: cell/editor registry + built-in cells `` | `registry.ts`, `TextCell/NumberCell/BooleanCell/SelectCell` + editors, per-column overrides, `registerCellType`. Ported `cell-types.test.tsx`. | All four built-in types work + custom cell type registration verified. |
| **4** | `` `@sheetgrid/vue`: sort header, groups, formulas `` | `SortHeader.vue`, column groups, formulas UI (delegating to `@sheetgrid/core`'s formula engine). Ported `sort.test.tsx`, `groups.test.tsx`, `formula-point.test.ts`, `bugfix-qa.test.tsx`. | Full feature parity with React's `<Grid>`. |
| **5** | `` `@sheetgrid/nuxt`: module `` | `packages/nuxt/` skeleton, `module.ts`, `test/nuxt-fixture/`, `@nuxt/test-utils` SSR + hydration test, `ssr.test.ts` in `packages/vue`. Docs: Nuxt install/usage recipe. | Nuxt fixture renders SSR + hydrates without warnings. |
| **6** | `` `@sheetgrid/vue`: docs + parity checklist + `0.1.0` `` | Root README section, `packages/vue/README.md` polish, docs/recipes ported (BYO table, matrix, cell types, formulas, sort, groups, theming), CHANGELOG `0.1.0`, `publish:check` green. | Full docs, tag `0.1.0`. |

## Guarantees across all milestones

- Every PR keeps `pnpm build && pnpm test` green (CI enforces).
- No changes to `@sheetgrid/core` or `@sheetgrid/react` — Vue is purely additive.
- No AI / agent attribution in commits or PR bodies.
- Feature branches named `feat/vue-<slug>` (for example `feat/vue-scaffold-virtual-window`).

## Open questions

None at spec time. Milestone 1 will surface any concrete decisions (tsup + `unplugin-vue` configuration, exact SFC output shape) that inform later milestones — those get resolved inside that PR.
