import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    // Unmount React trees between tests so getByText queries stay unique.
    setupFiles: ["./vitest.setup.ts"],
  },
});
