import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";
// The Web IDE's `/api/*` backend lives in ONE place — web-api/handlers.mjs — so
// the dev server and the standalone production server (server/index.mjs) share a
// single implementation and never drift. Here we just mount those handlers onto
// Vite's Connect middleware stack; in prod server/index.mjs mounts the same
// handlers onto its own tiny router.
import { registerApiRoutes } from "./web-api/handlers.mjs";

// Bridges the shared `/api/*` handlers (java runner, AI review/score, and the
// per-exercise REST backends) into the Vite dev server. `server.middlewares.use`
// is Connect-style — `(path, handler)` with `req.url` relative to the prefix —
// which is exactly the sink shape registerApiRoutes expects.
function webApiBridge(): Plugin {
  return {
    name: "exercise-web-api-bridge",
    configureServer(server) {
      registerApiRoutes((route, handler) => server.middlewares.use(route, handler));
    },
  };
}

// Dev/build config for the browser IDE (web/). Separate from vite.config.ts,
// which serves the lightweight component preview used by the CLI.
export default defineConfig({
  plugins: [react(), webApiBridge()],
  root: path.resolve(__dirname, "web"),
  // The IDE runs React Testing Library tests in the browser, and RTL's render()
  // wraps in act() — which only exists in DEVELOPMENT builds of React. A default
  // `vite build` would bundle production React and every React exercise test
  // would fail with "act(...) is not supported in production builds of React".
  // So pin the bundled NODE_ENV to development even for production builds.
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
  },
  // Pre-bundle the heavy deps at startup so entering the workspace doesn't
  // trigger a mid-session re-optimization (which 504s in-flight Monaco chunks).
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "@testing-library/react",
      "@testing-library/user-event",
      "sucrase",
      "shiki",
      "@shikijs/monaco",
      "canvas-confetti",
    ],
    // Monaco ships its own ESM + workers; pre-bundling its huge TS language
    // service breaks dev. Serve it as native ESM instead.
    exclude: ["monaco-editor", "@monaco-editor/react"],
  },
  server: {
    port: 5180,
    open: false,
    // Allow raw-importing exercise files that live outside web/ (repo root).
    fs: { allow: [path.resolve(__dirname)] },
  },
  build: {
    outDir: path.resolve(__dirname, "dist-web"),
    emptyOutDir: true,
  },
});
