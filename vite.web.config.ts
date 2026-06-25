import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { spawn } from "child_process";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import * as path from "path";

// On-demand AI review: POST /api/review { categoryId, exerciseId, level, solution,
// readme }. Writes the solution to a temp dir and runs an agent CLI there. The
// command is configurable (EXERCISE_AGENT_CMD, default "codex exec"); it must be
// on PATH. Dev-only (no server in the static build) and only runs when invoked.
function reviewBridge(): Plugin {
  return {
    name: "exercise-review-bridge",
    configureServer(server) {
      server.middlewares.use("/api/review", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end("Method Not Allowed");
        }
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          let payload: { categoryId?: string; level?: number; solution?: string; readme?: string };
          try {
            payload = JSON.parse(body || "{}");
          } catch {
            res.statusCode = 400;
            return res.end(JSON.stringify({ ok: false, error: "Invalid JSON" }));
          }
          runAgentReview(payload)
            .then((output) => {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: true, output }));
            })
            .catch((e: Error) => {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: false, error: e.message }));
            });
        });
      });
    },
  };
}

function runAgentReview(p: {
  categoryId?: string;
  level?: number;
  solution?: string;
  readme?: string;
}): Promise<string> {
  const dir = mkdtempSync(path.join(tmpdir(), "exercise-review-"));
  const ext = p.categoryId === "react" ? "tsx" : "ts";
  writeFileSync(path.join(dir, `solution.${ext}`), p.solution ?? "");
  writeFileSync(path.join(dir, "README.md"), p.readme ?? "");

  const prompt =
    `Review solution.${ext} for this coding exercise (the spec is in README.md). ` +
    `Give a short, encouraging review for level ${p.level}: time/space complexity, ` +
    `idiomatic quality, and whether a cleaner or faster approach exists. ` +
    `Give DIRECTIONAL hints only — do not rewrite the solution or paste a full answer. ` +
    `Max 6 short bullet points.`;

  const cmd = process.env.EXERCISE_AGENT_CMD || "codex exec";
  const full = `${cmd} ${JSON.stringify(prompt)}`;

  return new Promise((resolve, reject) => {
    const proc = spawn(full, { cwd: dir, shell: true });
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (err += d));
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("The review agent timed out (120s)."));
    }, 120_000);
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`Could not run "${cmd.split(" ")[0]}". Install it or set EXERCISE_AGENT_CMD. (${e.message})`));
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (out.trim()) resolve(out.trim());
      else reject(new Error(err.trim() || `Agent exited with code ${code} and no output.`));
    });
  });
}

// Dev/build config for the browser IDE (web/). Separate from vite.config.ts,
// which serves the lightweight component preview used by the CLI.
export default defineConfig({
  plugins: [react(), reviewBridge()],
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
