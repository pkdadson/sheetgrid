import { expectTypeOf, test } from "vitest";
import type {
  GridController,
  OpResult,
  AgentOp,
  GridEvent,
  Snapshot,
  AuthorizeFn,
  WhereClause,
} from "./index.js";

test("all public types exported", () => {
  expectTypeOf<GridController>().not.toBeAny();
  expectTypeOf<OpResult>().not.toBeAny();
  expectTypeOf<AgentOp>().not.toBeAny();
  expectTypeOf<GridEvent>().not.toBeAny();
  expectTypeOf<Snapshot>().not.toBeAny();
  expectTypeOf<AuthorizeFn>().not.toBeAny();
  expectTypeOf<WhereClause>().not.toBeAny();
});
