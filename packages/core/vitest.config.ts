import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    typecheck: {
      include: ["**/*.test-d.ts"],
    },
  },
});
