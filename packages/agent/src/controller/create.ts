import type { AuthorizeFn } from "../types/authorize.js";
import type { GridController } from "../types/controller.js";

export interface CreateGridControllerOptions {
  readOnly?: boolean;
  authorize?: AuthorizeFn;
  historyLimit?: number;
}

export function createGridController(
  _options: CreateGridControllerOptions = {},
): GridController {
  throw new Error(
    "createGridController is not yet implemented (M3 scaffold only — see M4/M5 plans)",
  );
}
