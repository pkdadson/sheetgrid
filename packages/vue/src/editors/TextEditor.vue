<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { EditorRenderProps } from "../cells/types.js";

const props = defineProps<EditorRenderProps>();
const inputRef = ref<HTMLInputElement | null>(null);
let skipBlurCommit = false;

onMounted(() => {
  inputRef.value?.focus();
});

const display = computed(() =>
  props.value === null || props.value === undefined ? "" : String(props.value),
);

function onInput(e: Event) {
  const target = e.target as HTMLInputElement;
  props.onChange(target.value);
}

function onBlur() {
  if (skipBlurCommit) return;
  props.onCommit();
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    skipBlurCommit = true;
    props.onCommit();
  }
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    skipBlurCommit = true;
    props.onCancel();
  }
}
</script>

<template>
  <input
    ref="inputRef"
    class="eg-editor"
    :value="display"
    :aria-invalid="error ? true : undefined"
    :title="error"
    @input="onInput"
    @blur="onBlur"
    @keydown="onKeyDown"
  />
</template>
