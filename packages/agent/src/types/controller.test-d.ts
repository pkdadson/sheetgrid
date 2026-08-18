import { expectTypeOf, test } from "vitest";
import type { GridController } from "./controller.js";
import type { OpResult } from "./op-result.js";

test("GridController exposes read + write + history methods with correct return types", () => {
  type C = GridController;
  expectTypeOf<C["getSchema"]>().returns.toMatchTypeOf<{
    columns: unknown[];
    rowIdField: string;
    rowCount: number;
    mode: "objects" | "matrix";
  }>();
  expectTypeOf<C["setCell"]>().returns.toMatchTypeOf<OpResult>();
  expectTypeOf<C["undo"]>().returns.toMatchTypeOf<OpResult<{ op: unknown }>>();
  expectTypeOf<C["batch"]>().returns.toMatchTypeOf<
    Promise<OpResult<unknown>>
  >();
  expectTypeOf<C["canUndo"]>().returns.toEqualTypeOf<boolean>();
});
