import { BooleanCell } from "./BooleanCell.js";
import { NumberCell } from "./NumberCell.js";
import { SelectCell } from "./SelectCell.js";
import { TextCell } from "./TextCell.js";
import type { BuiltInCellType, CellTypeDefinition } from "./types.js";
import { NumberEditor } from "../editors/NumberEditor.js";
import { SelectEditor } from "../editors/SelectEditor.js";
import { TextEditor } from "../editors/TextEditor.js";

const registry = new Map<string, CellTypeDefinition>();

function ensureBuiltIns(): void {
  if (registry.has("text")) return;
  registry.set("text", { cell: TextCell, editor: TextEditor });
  registry.set("number", { cell: NumberCell, editor: NumberEditor });
  registry.set("boolean", { cell: BooleanCell }); // toggle in cell, no text editor
  registry.set("select", { cell: SelectCell, editor: SelectEditor });
}

/** Register or override a cell type used via `column.type`. */
export function registerCellType(
  name: string,
  definition: CellTypeDefinition,
): void {
  ensureBuiltIns();
  registry.set(name, definition);
}

export function getCellType(name: string): CellTypeDefinition | undefined {
  ensureBuiltIns();
  return registry.get(name);
}

export function resolveColumnType(
  type: string | BuiltInCellType | undefined,
): CellTypeDefinition {
  ensureBuiltIns();
  if (!type) return registry.get("text")!;
  return registry.get(type) ?? registry.get("text")!;
}

export type { BuiltInCellType, CellTypeDefinition };
