import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Dev/e2e: use package sources so editor/grid fixes are picked up without a dist rebuild
    alias: {
      "@sheetgrid/react": path.join(root, "packages/react/src/index.ts"),
      "@sheetgrid/core": path.join(root, "packages/core/src/index.ts"),
      "@sheetgrid/tokens": path.join(root, "packages/tokens/src/index.ts"),
    },
  },
  server: {
    port: 5177,
    host: "127.0.0.1",
    strictPort: true,
  },
});
