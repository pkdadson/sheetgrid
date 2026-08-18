import { expectTypeOf, test } from "vitest";
import type { OpErrorCode, OpResult } from "./op-result.js";

test("OpResult discriminates ok from error", () => {
  const success: OpResult<{ rowId: string }> = {
    ok: true,
    value: { rowId: "r1" },
  };
  expectTypeOf(success).toMatchTypeOf<OpResult<{ rowId: string }>>();
  const failure: OpResult = {
    ok: false,
    code: "not_found",
    message: "row missing",
  };
  expectTypeOf(failure).toMatchTypeOf<OpResult>();
});

test("OpErrorCode enumerates known error codes", () => {
  const codes: OpErrorCode[] = [
    "not_found",
    "validation_failed",
    "read_only",
    "invalid_argument",
    "conflict",
    "unsupported",
    "detached",
    "internal",
  ];
  expectTypeOf(codes).toMatchTypeOf<OpErrorCode[]>();
});
