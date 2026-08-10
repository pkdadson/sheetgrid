<script setup lang="ts">
export interface SortHeaderProps {
  label: string;
  /** null when this column is not part of the current sort. */
  direction: "asc" | "desc" | null;
  /** Priority within a multi-column sort (1-based). undefined when single-sort or unsorted. */
  priority?: number;
}

const props = defineProps<SortHeaderProps>();
const emit = defineEmits<{
  (e: "sort"): void;
  (e: "shiftSort"): void;
}>();

function onClick(event: MouseEvent) {
  event.stopPropagation();
  if (event.shiftKey) emit("shiftSort");
  else emit("sort");
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  event.stopPropagation();
  if (event.shiftKey) emit("shiftSort");
  else emit("sort");
}
</script>

<template>
  <button
    type="button"
    class="eg-sort-btn"
    :aria-label="`Sort by ${label}`"
    @click="onClick"
    @keydown="onKeyDown"
  >
    <span class="eg-sort-label">{{ label }}</span>
    <span class="eg-sort-arrow" aria-hidden="true">
      {{ direction === "asc" ? "↑" : direction === "desc" ? "↓" : "" }}
    </span>
    <span
      v-if="direction !== null && priority !== undefined"
      class="eg-sort-badge"
      aria-hidden="true"
    >{{ priority }}</span>
  </button>
</template>
