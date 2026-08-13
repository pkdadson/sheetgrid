import { useRef, useSyncExternalStore } from "react";
import {
  createGridController,
  type CreateGridControllerOptions,
  type GridController,
} from "@sheetgrid/agent";

// Stable no-op snapshot for server rendering.
const _falseSnapshot = () => false;

/**
 * Create a memoized GridController. The controller is stable across the
 * component's lifetime — options passed on subsequent renders are ignored
 * (create a new component to change options). This matches how consumers
 * typically want to think about "the agent's handle to this grid".
 *
 * Subscribes to the controller's internal state so components using this hook
 * re-render whenever the controller attaches, detaches, or a store mutation
 * propagates — making `controller.isAttached()` and reads like
 * `controller.getSchema()` reactive in the calling component.
 *
 * Pair with `<Grid controller={c} />` to attach.
 *
 * @param options - Passed through to createGridController on first render only.
 */
export function useGridController(
  options?: CreateGridControllerOptions,
): GridController {
  const ref = useRef<GridController | null>(null);
  if (ref.current === null) {
    ref.current = createGridController(options);
  }
  const controller = ref.current;

  // Subscribe so the calling component re-renders on attach/detach and store
  // mutations. The snapshot is the isAttached flag — a cheap sentinel that
  // changes on every relevant controller event.
  useSyncExternalStore(
    controller.subscribe,
    controller.isAttached,
    _falseSnapshot,
  );

  return controller;
}
