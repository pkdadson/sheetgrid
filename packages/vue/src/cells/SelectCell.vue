<script setup lang="ts">
import { computed } from "vue";
import type { CellRenderProps } from "./types.js";

const props = defineProps<CellRenderProps>();

const text = computed(() => {
  const options = props.column.selectOptions ?? [];
  const match = options.find(
    (o) => o.value === props.value || o.value === String(props.value),
  );
  if (match) return match.label;
  if (props.value === null || props.value === undefined) return "";
  return String(props.value);
});
</script>

<template>{{ text }}</template>
