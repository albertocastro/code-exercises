import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";

// Dev server for the live browser preview of React exercises.
// `npm run preview:web` (or the CLI) serves react/preview/index.html, which
// mounts the demo for the exercise named in VITE_EXERCISE.
export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "react/preview"),
  // Inject the selected exercise so the preview app knows what to mount.
  define: {
    "import.meta.env.VITE_EXERCISE": JSON.stringify(
      process.env.VITE_EXERCISE ?? "01_counter"
    ),
  },
  server: {
    port: 5173,
    open: false,
  },
});
