import type { GridController } from "../types/controller.js";
import type { AgentOp } from "../types/agent-op.js";

export function replayOp(controller: GridController, op: AgentOp): void {
  switch (op.type) {
    case "grid.set_cell":
      controller.setCell(op.rowId, op.columnId, op.value);
      return;
    case "grid.set_cells":
      controller.setCells(op.patches);
      return;
    case "grid.add_row":
      controller.addRow(op.values, op.opts);
      return;
    case "grid.update_row":
      controller.updateRow(op.rowId, op.patch);
      return;
    case "grid.delete_row":
      controller.deleteRow(op.rowId);
      return;
    case "grid.move_row":
      controller.moveRow(op.rowId, op.toIndex);
      return;
    case "grid.add_column":
      controller.addColumn(op.def, op.opts);
      return;
    case "grid.delete_column":
      controller.deleteColumn(op.columnId);
      return;
    case "grid.move_column":
      controller.moveColumn(op.columnId, op.toIndex);
      return;
    case "grid.update_column":
      controller.updateColumn(op.columnId, op.patch);
      return;
    case "grid.set_sort":
      controller.setSort(op.specs);
      return;
    case "grid.clear_sort":
      controller.clearSort();
      return;
    case "grid.set_filter":
      controller.setFilter(op.filter);
      return;
    case "grid.select":
      controller.select(op.target);
      return;
    case "grid.set_formula":
      controller.setFormula(op.rowId, op.columnId, op.source);
      return;
    case "grid.clear_formula":
      controller.clearFormula(op.rowId, op.columnId);
      return;
    case "grid.undo":
      controller.undo();
      return;
    case "grid.redo":
      controller.redo();
      return;
    case "grid.restore":
      controller.restore(op.snapshot);
      return;
    // Reads and grid.batch are not queued.
    default:
      return;
  }
}
