<script setup lang="ts">
import { computed } from "vue";
import type { CellRenderProps } from "./types.js";

const props = defineProps<CellRenderProps>();

const text = computed(() => {
  const v = props.value;
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
});
</script>

<template>{{ text }}</template>
