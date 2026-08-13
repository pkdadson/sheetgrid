import { describe, expect, it } from "vitest";
import { createInternalStore } from "../internal-store.js";
import { SetErrorCommand } from "./set-error.js";

const src = { kind: "system", reason: "validation-fix" } as const;

describe("SetErrorCommand", () => {
  it("sets and clears errors, and has history=skip", () => {
    const s = createInternalStore({
      rows: [{ id: "r1", values: { a: 1 } }],
      columns: [{ id: "a", header: "A" }],
    });
    const cmd = new SetErrorCommand("r1", "a", { message: "bad" }, src);
    expect(cmd.history).toBe("skip");
    const res = cmd.apply(s);
    if (!res.ok) throw new Error();
    expect(s.errors.getMap().size).toBe(1);
    res.inverse.apply(s);
    expect(s.errors.getMap().size).toBe(0);
  });
});
