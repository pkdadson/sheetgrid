import {
  type CreateGridControllerOptions,
  type GridController,
  createGridController,
} from "@sheetgrid/agent";
import { onScopeDispose } from "vue";

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
