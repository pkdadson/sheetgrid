import {
  type CreateGridStoreInput,
  type GridStore,
  createGridStore,
} from "@sheetgrid/core";
import type { CellError, ColumnDef, GridRow } from "@sheetgrid/core";
import type { ComputedRef, MaybeRefOrGetter } from "vue";
import { computed, onScopeDispose, shallowRef, toValue, watch } from "vue";

export interface UseGridStoreOptions {
  /**
   * When true, watches the reactive input and calls `store.replaceRows()` /
   * `store.replaceColumns()` when it changes. Default false — the caller
   * (typically `<SheetGrid>`) manages replacement explicitly to keep control
   * over commit reasons and change emission.
   */
  autoWatch?: boolean;
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
  options?: UseGridStoreOptions,
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

  if (options?.autoWatch) {
    watch(
      () => toValue(input),
      (next) => {
        store.replaceColumns(next.columns);
        store.replaceRows(next.rows);
      },
      { deep: true },
    );
  }

  return { store, rows, columns, errors };
}
