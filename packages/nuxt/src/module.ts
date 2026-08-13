import { addComponent, addImports, createResolver, defineNuxtModule, useNuxt } from "@nuxt/kit";

export interface ModuleOptions {
  /** Prefix for global components. Default: none (registers as `SheetGrid`, `SortHeader`). */
  prefix?: string;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@sheetgrid/nuxt",
    configKey: "sheetgrid",
    compatibility: {
      nuxt: ">=3.10.0",
    },
  },
  defaults: {},
  setup(options, nuxt) {
    const _resolver = createResolver(import.meta.url);
    void _resolver;

    // Auto-import composables from @sheetgrid/vue.
    addImports([
      { name: "useVirtualWindow", from: "@sheetgrid/vue" },
      { name: "useGridStore", from: "@sheetgrid/vue" },
      { name: "useGridController", from: "@sheetgrid/vue" },
      { name: "injectTokens", from: "@sheetgrid/vue" },
      { name: "registerCellType", from: "@sheetgrid/vue" },
      { name: "getCellType", from: "@sheetgrid/vue" },
      { name: "resolveColumnType", from: "@sheetgrid/vue" },
    ]);

    // Register components globally.
    const prefix = options.prefix ?? "";
    addComponent({
      name: `${prefix}SheetGrid`,
      export: "SheetGrid",
      filePath: "@sheetgrid/vue",
    });
    addComponent({
      name: `${prefix}SortHeader`,
      export: "SortHeader",
      filePath: "@sheetgrid/vue",
    });

    // Ensure Nuxt/Vite transpiles the ESM package (handles the SFC output).
    nuxt.options.build.transpile.push("@sheetgrid/vue");
  },
});
