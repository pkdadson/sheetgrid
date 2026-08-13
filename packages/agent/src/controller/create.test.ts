import { describe, expect, it } from "vitest";
import { createGridController } from "./create.js";

describe("createGridController stub (M3)", () => {
  it("throws a clear error until M4 implements the runtime", () => {
    expect(() => createGridController()).toThrow(/not yet implemented/i);
  });
});
