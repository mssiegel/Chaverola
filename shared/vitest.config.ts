import { defineConfig } from "vitest/config";

// Mirrors server/vitest.config.ts: plain node environment, colocated tests.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
