export type {
  CellCoord,
  CellError,
  CellRange,
  CellValue,
  ColumnDef,
  ColumnGroupDef,
  ColumnId,
  CommitReason,
  GridRow,
  RowId,
  SelectionMode,
  SelectionState,
  ValidateCtx,
  ValidationMode,
  ValidationResult,
} from "./types.js";

export { cellKey, parseCellKey } from "./data/cell-key.js";
export { fromMatrix } from "./data/from-matrix.js";
export type { FromMatrixOptions } from "./data/from-matrix.js";
export { toMatrix } from "./data/to-matrix.js";
export type { ToMatrixOptions } from "./data/to-matrix.js";
export { fromObjects, toObjects } from "./data/from-objects.js";

export { sortRows } from "./sort/sort-rows.js";
export { pickDefaultComparator, withNullsLast } from "./sort/comparators.js";
export type { SortSpec, SortDirection, Comparator } from "./types.js";
export type { FilterOp, FilterClause } from "./types.js";

export { createGridStore } from "./model/grid-store.js";
export type {
  CreateGridStoreInput,
  FormulaEntryMode,
  GridStore,
} from "./model/grid-store.js";

export {
  parseFormula,
  evaluateAst,
  defaultFormulaLimits,
  mergeFormulaLimits,
  formulaError,
  isFormulaError,
  formatFormulaError,
  formulaDisplayValue,
  listFunctions,
  getFunction,
  tokenize,
  collectDeps,
  recalcFormulas,
  formatA1,
  formatA1Range,
  colIndexToLetters,
  lettersToColIndex,
} from "./formula/index.js";
export type {
  FormulaValue,
  FormulaError,
  FormulaErrorType,
  FormulaLimits,
  FormulaEngineOptions,
  FormulaRecord,
  EvalContext,
  AstNode,
} from "./formula/index.js";
export { commitCell } from "./model/validation.js";
export type { CommitCellInput } from "./model/validation.js";
export { max, min, number, pattern, required } from "./model/validators.js";

export { moveItem, swapItems } from "./layout/reorder.js";
export {
  resolveColumnWidths,
  setColumnWidth,
} from "./layout/column-layout.js";
export {
  buildVisibleRows,
  flattenColumnGroups,
} from "./layout/visible-rows.js";
export type {
  BuildVisibleRowsOpts,
  FlattenColumnGroupsOptions,
  HeaderCellSpan,
  VisibleRow,
} from "./layout/visible-rows.js";

export {
  createSelection,
  emptySelection,
  extendTo,
  isCellSelected,
  moveActive,
  selectAll,
  selectCell,
  selectColumn,
  selectRow,
  toggleCell,
} from "./selection/selection.js";
export type { Dir } from "./selection/selection.js";

export { computeVariableWindow, computeWindow } from "./virtual/window.js";
export type {
  FixedWindowInput,
  VariableWindowInput,
  WindowResult,
} from "./virtual/window.js";

export {
  buildPrefixSums,
  computePads,
  expandWindowForPins,
  offsetOf,
  sizeAt,
  windowFromPrefix,
} from "./virtual/prefix.js";

export { createSizeCache } from "./virtual/size-cache.js";
export type {
  SizeCache,
  SizeCacheOptions,
  SizeSource,
} from "./virtual/size-cache.js";

export { anchorScrollDelta } from "./virtual/scroll-anchor.js";

export {
  applyPaste,
  extractRange,
  parseTsv,
  serializeTsv,
} from "./clipboard/tsv.js";

export { mapKeyToCommand } from "./keyboard/map.js";
export type { GridCommand, KeyLike } from "./keyboard/map.js";

export { History } from "./model/history.js";
export type {
  HistoryEvent,
  HistoryListener,
  HistoryOptions,
} from "./model/history.js";
export type {
  Command,
  CommandResult,
  EventSource,
  GridEvent,
  Snapshot,
  InternalStore,
} from "./model/commands/types.js";
export { takeSnapshot, applySnapshot } from "./model/snapshot.js";
export { evaluateFilter, filterRowIds } from "./model/filter/evaluate.js";
