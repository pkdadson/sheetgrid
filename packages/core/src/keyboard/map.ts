import type { Dir } from "../selection/selection.js";

export type GridCommand =
  | { type: "move"; dir: Dir; extend: boolean }
  | { type: "edit" }
  | { type: "editReplace"; key: string }
  | { type: "commit" }
  | { type: "cancel" }
  | { type: "selectAll" }
  | { type: "copy" }
  | { type: "cut" }
  | { type: "paste" }
  | { type: "none" };

export interface KeyLike {
  key: string;
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

export function mapKeyToCommand(
  e: KeyLike,
  phase: "navigate" | "edit",
): GridCommand {
  const mod = e.ctrlKey || e.metaKey;

  if (phase === "edit") {
    if (e.key === "Escape") return { type: "cancel" };
    if (e.key === "Enter") return { type: "commit" };
    if (e.key === "Tab") {
      return { type: "commit" };
    }
    return { type: "none" };
  }

  if (mod && e.key.toLowerCase() === "c") return { type: "copy" };
  if (mod && e.key.toLowerCase() === "x") return { type: "cut" };
  if (mod && e.key.toLowerCase() === "v") return { type: "paste" };
  if (mod && e.key.toLowerCase() === "a") return { type: "selectAll" };

  if (e.key === "F2") return { type: "edit" };
  if (e.key === "Enter") return { type: "edit" };
  if (e.key === "Escape") return { type: "cancel" };

  const extend = e.shiftKey;
  switch (e.key) {
    case "ArrowUp":
      return { type: "move", dir: "up", extend };
    case "ArrowDown":
      return { type: "move", dir: "down", extend };
    case "ArrowLeft":
      return { type: "move", dir: "left", extend };
    case "ArrowRight":
      return { type: "move", dir: "right", extend };
    case "Home":
      return { type: "move", dir: "home", extend };
    case "End":
      return { type: "move", dir: "end", extend };
    case "Tab":
      return {
        type: "move",
        dir: e.shiftKey ? "left" : "right",
        extend: false,
      };
  }

  if (
    e.key.length === 1 &&
    !mod &&
    !e.altKey &&
    e.key !== " " // space can be special; treat as replace for now
  ) {
    return { type: "editReplace", key: e.key };
  }
  if (e.key === " ") {
    return { type: "editReplace", key: " " };
  }

  return { type: "none" };
}
