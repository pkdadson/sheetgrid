<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { EditorRenderProps } from "../cells/types.js";

const props = defineProps<EditorRenderProps>();
const selectRef = ref<HTMLSelectElement | null>(null);
let skipBlurCommit = false;

onMounted(() => {
  selectRef.value?.focus();
});

const display = computed(() =>
  props.value === null || props.value === undefined ? "" : String(props.value),
);

const options = computed(() => props.column.selectOptions ?? []);

function onChange(e: Event) {
  const next = (e.target as HTMLSelectElement).value;
  props.onChange(next);
  skipBlurCommit = true;
  props.onCommit(next);
}

function onBlur() {
  if (skipBlurCommit) return;
  props.onCommit();
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    skipBlurCommit = true;
    props.onCancel();
  }
}
</script>

<template>
  <select
    ref="selectRef"
    class="eg-editor eg-select"
    :value="display"
    :aria-invalid="error ? true : undefined"
    :title="error"
    @change="onChange"
    @blur="onBlur"
    @keydown="onKeyDown"
  >
    <option value="">—</option>
    <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
  </select>
</template>
