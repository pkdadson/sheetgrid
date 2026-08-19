import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Dev/e2e: use package sources so editor/grid fixes are picked up without a dist rebuild
    // Note: more-specific sub-path aliases must come before the root package alias.
    alias: [
      {
        find: "@sheetgrid/core/commands",
        replacement: path.join(
          root,
          "packages/core/src/model/commands/index.ts",
        ),
      },
      {
        find: "@sheetgrid/react/agent",
        replacement: path.join(root, "packages/react/src/agent.ts"),
      },
      {
        find: "@sheetgrid/react",
        replacement: path.join(root, "packages/react/src/index.ts"),
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
    port: 5177,
    host: "127.0.0.1",
    strictPort: true,
  },
});
