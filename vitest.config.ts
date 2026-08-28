import { defineConfig } from "vitest/config";

// Standalone config: engine/view-geometry tests are pure TypeScript and don't
// need the React or router plugins from vite.config.ts.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
    },
  },
});
