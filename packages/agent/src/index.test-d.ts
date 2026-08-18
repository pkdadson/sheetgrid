import { expectTypeOf, test } from "vitest";
import type {
  AgentOp,
  AuthorizeFn,
  GridController,
  GridEvent,
  OpResult,
  Snapshot,
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
