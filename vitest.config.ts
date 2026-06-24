import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// React exercises only. The leetcode exercises (*.test.ts) stay on Jest;
// Vitest is scoped to react/**/*.test.tsx so the two runners never collide.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["react/**/*.test.tsx"],
    css: false,
  },
});
