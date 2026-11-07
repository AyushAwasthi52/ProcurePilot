import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    env: {
      DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
      NODE_ENV: "test",
      AUTH_SECRET: "procurepilot-test-secret-at-least-32-chars-long",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
    },
  },
});
