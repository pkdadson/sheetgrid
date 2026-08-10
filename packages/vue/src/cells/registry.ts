import NumberEditor from "../editors/NumberEditor.vue";
import SelectEditor from "../editors/SelectEditor.vue";
import TextEditor from "../editors/TextEditor.vue";
import BooleanCell from "./BooleanCell.vue";
import NumberCell from "./NumberCell.vue";
import SelectCell from "./SelectCell.vue";
import TextCell from "./TextCell.vue";
import type { BuiltInCellType, CellTypeDefinition } from "./types.js";

const registry = new Map<string, CellTypeDefinition>();

function ensureBuiltIns(): void {
  if (registry.has("text")) return;
  registry.set("text", { cell: TextCell, editor: TextEditor });
  registry.set("number", { cell: NumberCell, editor: NumberEditor });
  registry.set("boolean", { cell: BooleanCell }); // toggle in cell, no text editor
  registry.set("select", { cell: SelectCell, editor: SelectEditor });
}

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
  // biome-ignore lint/style/noNonNullAssertion: text is always seeded by ensureBuiltIns
  if (!type) return registry.get("text")!;
  // biome-ignore lint/style/noNonNullAssertion: text is always seeded by ensureBuiltIns
  return registry.get(type) ?? registry.get("text")!;
}

export type { BuiltInCellType, CellTypeDefinition };
