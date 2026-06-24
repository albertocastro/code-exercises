import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";

// Dev/build config for the browser IDE (web/). Separate from vite.config.ts,
// which serves the lightweight component preview used by the CLI.
export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "web"),
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
