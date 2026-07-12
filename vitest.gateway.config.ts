import { defineConfig } from "vitest/config";

// Server-side tests for the AI Gateway migration (EXERCISE_AGENT_MODE). Kept in
// a DEDICATED config, separate from vitest.config.ts (react/web, jsdom) and the
// root Jest suite (leetcode *.test.ts), so:
//   - these run in the Node environment (real fetch, child_process, no jsdom);
//   - the include never collides with the other two runners.
// Run with `npm run test:gateway`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["web-api/**/*.test.mjs"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
