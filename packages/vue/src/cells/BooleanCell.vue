<script setup lang="ts">
import { computed } from "vue";
import type { CellRenderProps } from "./types.js";

const props = defineProps<CellRenderProps>();

const checked = computed(() => Boolean(props.value));

const disabled = computed(() => {
  const e = props.column.editable;
  if (e === undefined) return false;
  if (typeof e === "function") return false;
  return !e;
});

function onChange(event: Event) {
  event.stopPropagation();
  const target = event.target as HTMLInputElement;
  props.onCommitValue(target.checked);
}

function stop(event: Event) {
  event.stopPropagation();
}
</script>

<template>
  <input
    type="checkbox"
    class="eg-checkbox"
    :checked="checked"
    :disabled="disabled"
    :aria-label="String(column.header ?? column.id)"
    @change="onChange"
    @click="stop"
    @mousedown="stop"
  />
</template>
