import { expectTypeOf, test } from "vitest";
import type { AuthorizeFn } from "./authorize.js";

test("AuthorizeFn returns true or a rejection message", () => {
  const allow: AuthorizeFn = () => true;
  const deny: AuthorizeFn = () => "not allowed";
  const conditional: AuthorizeFn = (op) =>
    op.type === "grid.delete_row" ? "deletes are locked" : true;
  expectTypeOf(allow).toMatchTypeOf<AuthorizeFn>();
  expectTypeOf(deny).toMatchTypeOf<AuthorizeFn>();
  expectTypeOf(conditional).toMatchTypeOf<AuthorizeFn>();
});
