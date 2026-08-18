<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import AgentTab from "./AgentTab.vue";
import MatrixDemo from "./pages/MatrixDemo.vue";
import ObjectsDemo from "./pages/ObjectsDemo.vue";
import PerfDemo from "./pages/PerfDemo.vue";

export type Page = "objects" | "matrix" | "perf" | "agent";
export type Theme = "light" | "dark";
export type Density = "comfortable" | "compact";

function pageFromHash(): Page {
  const raw = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  if (
    raw === "matrix" ||
    raw === "perf" ||
    raw === "objects" ||
    raw === "agent"
  )
    return raw;
  return "objects";
}

function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem("sheetgrid-demo-theme");
    if (v === "dark" || v === "light") return v;
  } catch {
    /* ignore */
  }
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches)
    return "dark";
  return "light";
}

function readStoredDensity(): Density {
  try {
    const v = localStorage.getItem("sheetgrid-demo-density");
    if (v === "compact" || v === "comfortable") return v;
  } catch {
    /* ignore */
  }
  return "comfortable";
}

const page = ref<Page>(pageFromHash());
const theme = ref<Theme>(readStoredTheme());
const density = ref<Density>(readStoredDensity());

watch(
  theme,
  (t) => {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("sheetgrid-demo-theme", t);
    } catch {
      /* ignore */
    }
  },
  { immediate: true },
);

watch(density, (d) => {
  try {
    localStorage.setItem("sheetgrid-demo-density", d);
  } catch {
    /* ignore */
  }
});

watch(page, (p) => {
  const desired = `#${p}`;
  if (window.location.hash !== desired) {
    window.history.replaceState(null, "", desired);
  }
});

function onHash() {
  page.value = pageFromHash();
}

onMounted(() => window.addEventListener("hashchange", onHash));
onUnmounted(() => window.removeEventListener("hashchange", onHash));

function go(next: Page) {
  page.value = next;
  window.location.hash = next;
}

function toggleDensity() {
  density.value = density.value === "compact" ? "comfortable" : "compact";
}

function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
}
</script>

<template>
  <div class="app" :data-theme="theme">
    <a class="skip-link" href="#demo-main">Skip to grid</a>
    <nav class="nav" data-testid="demo-nav" aria-label="Demo">
      <h1>SheetGrid</h1>
      <div class="nav-tabs" role="tablist" aria-label="Demo pages">
        <button
          type="button"
          role="tab"
          :aria-selected="page === 'objects'"
          :class="{ active: page === 'objects' }"
          data-testid="nav-objects"
          @click="go('objects')"
        >Objects</button>
        <button
          type="button"
          role="tab"
          :aria-selected="page === 'matrix'"
          :class="{ active: page === 'matrix' }"
          data-testid="nav-matrix"
          @click="go('matrix')"
        >2D Matrix</button>
        <button
          type="button"
          role="tab"
          :aria-selected="page === 'perf'"
          :class="{ active: page === 'perf' }"
          data-testid="nav-perf"
          @click="go('perf')"
        >10k Perf</button>
        <button
          type="button"
          role="tab"
          :aria-selected="page === 'agent'"
          :class="{ active: page === 'agent' }"
          data-testid="nav-agent"
          @click="go('agent')"
        >Agent</button>
      </div>
      <div class="nav-actions">
        <button
          type="button"
          data-testid="toggle-density"
          :aria-pressed="density === 'compact'"
          @click="toggleDensity"
        >{{ density === "compact" ? "Comfortable" : "Compact" }}</button>
        <button
          type="button"
          data-testid="toggle-theme"
          :aria-pressed="theme === 'dark'"
          @click="toggleTheme"
        >{{ theme === "dark" ? "Light" : "Dark" }}</button>
      </div>
    </nav>
    <main class="main" data-testid="demo-main" id="demo-main">
      <ObjectsDemo v-if="page === 'objects'" :density="density" :theme="theme" />
      <MatrixDemo v-if="page === 'matrix'" :density="density" :theme="theme" />
      <PerfDemo v-if="page === 'perf'" :density="density" :theme="theme" />
      <AgentTab v-if="page === 'agent'" />
    </main>
  </div>
</template>
