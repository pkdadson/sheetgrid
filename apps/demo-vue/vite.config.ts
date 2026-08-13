import path from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // Dev: alias to package sources so composable edits are picked up without a dist rebuild
    // Note: more-specific sub-path aliases must come before the root package alias.
    alias: [
      {
        find: "@sheetgrid/core/commands",
        replacement: path.join(root, "packages/core/src/model/commands/index.ts"),
      },
      {
        find: "@sheetgrid/vue",
        replacement: path.join(root, "packages/vue/src/index.ts"),
      },
      {
        find: "@sheetgrid/core",
        replacement: path.join(root, "packages/core/src/index.ts"),
      },
      {
        find: "@sheetgrid/tokens",
        replacement: path.join(root, "packages/tokens/src/index.ts"),
      },
      {
        find: "@sheetgrid/agent",
        replacement: path.join(root, "packages/agent/src/index.ts"),
      },
    ],
  },
  server: {
    port: 5178,
    host: "127.0.0.1",
    strictPort: true,
  },
});
