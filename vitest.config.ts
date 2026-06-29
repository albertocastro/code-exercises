import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// React exercises (*.test.tsx) plus the web IDE's own unit tests (web/src
// **/*.test.ts). The leetcode exercises (*.test.ts at the repo root) stay on
// Jest; Vitest's include is scoped so the two runners never collide.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["react/**/*.test.tsx", "web/src/**/*.test.ts"],
    css: false,
  },
});
