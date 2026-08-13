import { useRef } from "react";
import {
  createGridController,
  type CreateGridControllerOptions,
  type GridController,
} from "@sheetgrid/agent";

/**
 * Create a memoized GridController. The controller is stable across the
 * component's lifetime — options passed on subsequent renders are ignored
 * (create a new component to change options). This matches how consumers
 * typically want to think about "the agent's handle to this grid".
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
  return ref.current;
}
