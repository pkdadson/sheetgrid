import path from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // Dev: alias to package sources so composable edits are picked up without a dist rebuild
    alias: {
      "@sheetgrid/vue": path.join(root, "packages/vue/src/index.ts"),
      "@sheetgrid/core": path.join(root, "packages/core/src/index.ts"),
      "@sheetgrid/tokens": path.join(root, "packages/tokens/src/index.ts"),
    },
  },
  server: {
    port: 5178,
    host: "127.0.0.1",
    strictPort: true,
  },
});
