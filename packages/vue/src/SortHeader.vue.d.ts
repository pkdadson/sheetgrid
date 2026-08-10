import type { DefineComponent } from "vue";

export interface SortHeaderProps {
  label: string;
  direction: "asc" | "desc" | null;
  priority?: number;
}

declare const SortHeader: DefineComponent<
  SortHeaderProps,
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  { sort: () => void; shiftSort: () => void }
>;
export default SortHeader;
