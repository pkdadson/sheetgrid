<script setup lang="ts">
import { computed } from "vue";
import type { CellRenderProps } from "./types.js";

const props = defineProps<CellRenderProps>();

const text = computed(() => {
  const v = props.value;
  if (v === null || v === undefined || v === "") return "";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return String(v);
  return String(n);
});
</script>

<template>{{ text }}</template>
