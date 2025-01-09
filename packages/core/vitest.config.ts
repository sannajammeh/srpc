import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: "./src/test/globalSetup.ts",
    typecheck: {
      enabled: true,
      checker: "tsc",
    },
    testTimeout: 30 * 1000,
  },
});
