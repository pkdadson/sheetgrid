import { describe, expect, it } from "vitest";
// Simulate a downstream consumer importing from the barrel.
import * as cmds from "./index.js";

describe("commands barrel", () => {
  it("exports all 13 command classes", () => {
    expect(typeof cmds.SetCellCommand).toBe("function");
    expect(typeof cmds.CompoundCommand).toBe("function");
    expect(typeof cmds.RestoreCommand).toBe("function");
  });
});
