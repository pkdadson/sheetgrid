import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "@sheetgrid/core", "@sheetgrid/tokens"],
  banner: {
    // React Server Components: everything here is client-side (hooks, DOM
    // measurement), so ship the directive instead of making every Next.js
    // app-router consumer write a wrapper file.
    js: '"use client";',
  },
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
