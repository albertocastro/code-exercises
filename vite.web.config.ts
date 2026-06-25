import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";

// Dev/build config for the browser IDE (web/). Separate from vite.config.ts,
// which serves the lightweight component preview used by the CLI.
export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "web"),
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
