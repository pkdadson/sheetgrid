import { onScopeDispose } from "vue";
import {
  createGridController,
  type CreateGridControllerOptions,
  type GridController,
} from "@sheetgrid/agent";

/**
 * Create a GridController tied to the current effect scope. Detaches
 * automatically on scope unmount. Options are consumed only on first call.
 */
export function useGridController(
  options?: CreateGridControllerOptions,
): GridController {
  const controller = createGridController(options);
  onScopeDispose(() => {
    if (controller.isAttached()) controller.__detach();
  });
  return controller;
}
