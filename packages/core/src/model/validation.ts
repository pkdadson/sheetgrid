import { cellKey } from "../data/cell-key.js";
import type {
  ColumnId,
  RowId,
  ValidationMode,
  ValidationResult,
} from "../types.js";
import type { GridStore } from "./grid-store.js";

export interface CommitCellInput {
  rowId: RowId;
  columnId: ColumnId;
  value: unknown;
  mode: ValidationMode;
  reason?: "edit" | "paste" | "cut" | "api";
}

export async function commitCell(
  store: GridStore,
  input: CommitCellInput,
): Promise<ValidationResult> {
  const { rowId, columnId, value, mode } = input;
  const reason = input.reason ?? "edit";
  const columns = store.getColumns();
  const column = columns.find((c) => c.id === columnId);
  const rows = store.getRows();
  const row = rows.find((r) => r.id === rowId);

  if (!column || !row) {
    return { ok: false, message: "Unknown cell", code: "not_found" };
  }

  let result: ValidationResult = { ok: true };
  if (column.validate) {
    result = await column.validate(value, {
      rowId,
      columnId,
      row,
      rows,
    });
  }

  const writeValue = (v: unknown) => {
    if (
      store.isFormulasEnabled() &&
      store.getFormulaEntry() === "auto-equals" &&
      typeof v === "string" &&
      v.trimStart().startsWith("=")
    ) {
      store.setFormula(rowId, columnId, v);
      return;
    }
    store.setCell(rowId, columnId, v, reason);
  };

  if (result.ok) {
    writeValue(value);
    store.clearError(rowId, columnId);
    return result;
  }

  if (mode === "commit-with-error") {
    writeValue(value);
    store.setError(rowId, columnId, {
      message: result.message,
      code: result.code,
    });
    return result;
  }

  // reject: do not write value; surface error
  store.setError(rowId, columnId, {
    message: result.message,
    code: result.code,
  });
  // ensure key exists for tests
  void cellKey(rowId, columnId);
  return result;
}
