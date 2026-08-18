import { describe, expect, it } from "vitest";
import { mapKeyToCommand } from "./map.js";

const base = {
  code: "",
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
};

describe("mapKeyToCommand", () => {
  it("maps arrows and shift extend", () => {
    expect(
      mapKeyToCommand(
        { ...base, key: "ArrowDown", code: "ArrowDown" },
        "navigate",
      ),
    ).toEqual({ type: "move", dir: "down", extend: false });
    expect(
      mapKeyToCommand(
        { ...base, key: "ArrowDown", code: "ArrowDown", shiftKey: true },
        "navigate",
      ),
    ).toEqual({ type: "move", dir: "down", extend: true });
  });

  it("maps edit and clipboard", () => {
    expect(
      mapKeyToCommand({ ...base, key: "F2", code: "F2" }, "navigate"),
    ).toEqual({
      type: "edit",
    });
    expect(
      mapKeyToCommand(
        { ...base, key: "c", code: "KeyC", metaKey: true },
        "navigate",
      ),
    ).toEqual({ type: "copy" });
    expect(
      mapKeyToCommand(
        { ...base, key: "v", code: "KeyV", ctrlKey: true },
        "navigate",
      ),
    ).toEqual({ type: "paste" });
  });

  it("maps printable to editReplace", () => {
    expect(
      mapKeyToCommand({ ...base, key: "a", code: "KeyA" }, "navigate"),
    ).toEqual({
      type: "editReplace",
      key: "a",
    });
  });

  it("edit phase commit/cancel", () => {
    expect(
      mapKeyToCommand({ ...base, key: "Enter", code: "Enter" }, "edit"),
    ).toEqual({
      type: "commit",
    });
    expect(
      mapKeyToCommand({ ...base, key: "Escape", code: "Escape" }, "edit"),
    ).toEqual({ type: "cancel" });
  });
});
