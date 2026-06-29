import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { spawn } from "child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "fs";
import type { IncomingMessage, ServerResponse } from "http";
import { tmpdir } from "os";
import * as path from "path";

type ReviewMessage = { role: "user" | "assistant"; content: string };
type ReviewPayload = {
  categoryId?: string;
  exerciseId?: string;
  level?: number;
  solution?: string;
  readme?: string;
  perfSpec?: string;
  messages?: ReviewMessage[];
  previousActionItems?: Array<{ text?: string; status?: "open" | "done"; note?: string; claimed?: boolean }>;
};

// On-demand AI review/chat: POST /api/review { categoryId, exerciseId, level,
// solution, readme, messages? }. Writes the solution to a temp dir and runs an
// agent CLI there. The command/model are configurable (EXERCISE_AGENT_CMD or
// EXERCISE_AGENT_MODEL). Dev-only (no server in the static build).
function reviewBridge(): Plugin {
  return {
    name: "exercise-review-bridge",
    configureServer(server) {
      const handleAgentRequest = (kind: "review" | "score", req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end("Method Not Allowed");
        }
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          let payload: ReviewPayload;
          try {
            payload = JSON.parse(body || "{}");
          } catch {
            res.statusCode = 400;
            return res.end(JSON.stringify({ ok: false, error: "Invalid JSON" }));
          }
          const run = kind === "score" ? runAgentScore : runAgentReview;
          run(payload)
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
      };

      server.middlewares.use("/api/review", (req, res) => handleAgentRequest("review", req, res));
      server.middlewares.use("/api/score", (req, res) => handleAgentRequest("score", req, res));
    },
  };
}

// Inline the spec + solution directly into the prompt. The files are still
// written to the temp dir (for EXERCISE_AGENT_CMD compatibility), but embedding
// them here lets codex answer in a single turn instead of spending extra
// model round-trips opening solution.<ext> and README.md itself.
function inlineContext(p: ReviewPayload, ext: string) {
  return (
    `\n\n--- README.md ---\n${p.readme ?? ""}\n` +
    (p.perfSpec?.trim() ? `\n--- perf.ts (hidden performance target) ---\n${p.perfSpec}\n` : "") +
    `\n--- solution.${ext} ---\n${p.solution ?? ""}\n`
  );
}

function buildReviewPrompt(p: ReviewPayload, ext: string) {
  const messages = p.messages?.filter((m) => m.content.trim()) ?? [];
  if (!messages.length) {
    return (
      `You are a patient programming tutor reviewing the solution below for this coding exercise. ` +
      `Your main goal is to teach the learner how to reason about ` +
      `their code, not merely correct it or optimize it. Give a short review for level ${p.level}. ` +
      `The learner is working through the exercise incrementally and is only expected to have ` +
      `implemented levels 1 through ${p.level} so far; treat anything described for higher levels as ` +
      `out of scope, not as a mistake or a missing piece. Cover ` +
      `what they did well, the key concept involved, time/space complexity when relevant, and one ` +
      `or two directional next steps. Ask a guiding question if it would help. Do not rewrite the ` +
      `solution or paste a full answer unless explicitly asked. Max 6 short bullet points.` +
      inlineContext(p, ext)
    );
  }

  const transcript = messages
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
    .join("\n\n");

  return (
    `You are continuing an exercise-review chat. Act as a patient programming tutor. ` +
    `Your main goal is to teach the learner how to reason about their code, not merely correct it or optimize it. ` +
    `The exercise spec and the user's current solution are inlined below. ` +
    `Answer the latest user message using the code and spec as context. ` +
    `Be concise, concrete, and educational. Use questions, small examples, and directional hints by default; ` +
    `do not paste a full rewritten solution unless the user explicitly asks for one.` +
    inlineContext(p, ext) +
    `\nConversation so far:\n${transcript}`
  );
}

function runAgentReview(p: ReviewPayload): Promise<string> {
  const ext = p.categoryId === "react" ? "tsx" : "ts";
  return runAgent(p, ext, buildReviewPrompt(p, ext), "review-output.txt");
}

function buildScorePrompt(p: ReviewPayload, ext: string) {
  const priorItems = (p.previousActionItems ?? [])
    .filter((item) => item?.text?.trim())
    .map((item) => ({
      text: item.text?.trim(),
      status: item.status === "done" ? "done" : "open",
      note: item.note?.trim() || undefined,
      claimed: item.claimed === true,
    }));
  const claimedItems = priorItems.filter((item) => item.claimed);

  const categoryAnalysis =
    p.categoryId === "leetcode"
      ? `Include an "analysis" object focused on algorithmic efficiency. If perf.ts is present, use it as the expected target. ` +
        `Set "kind" to "complexity". Fill "title", "summary", optional "expected", optional "actual", ` +
        `optional "verdict" ("meets" | "close" | "slower" | "unknown"), and "bullets" with up to 2 short observations. ` +
        `Compare the current approach against the expected complexity target when you can infer it.`
      : `Include an "analysis" object focused on React rendering/performance. Set "kind" to "react-performance". ` +
        `Fill "title", "summary", optional "verdict" ("healthy" | "watch" | "risky" | "unknown"), and "bullets" ` +
        `with up to 2 short observations about rerender churn, derived state, effect loops, unstable handlers, or unnecessary work.`;

  const currentLevel = p.level ?? "unknown";

  return (
    `You are scoring the code quality of the solution below for a coding exercise. ` +
    `The learner is working through the exercise INCREMENTALLY, one level at a time, and is ` +
    `currently on level ${currentLevel}. The README's "Levels" section lists the levels as a ` +
    `numbered list, where item n describes the requirements introduced at level n. ` +
    `Evaluate ONLY the requirements for levels 1 through ${currentLevel} (inclusive). ` +
    `Any functionality described for levels ABOVE ${currentLevel} is OUT OF SCOPE and is not ` +
    `expected to exist yet: its absence, incompleteness, or stubbed/placeholder state must NOT ` +
    `lower the score and must NOT be reported as a weakness, improvement, study topic, or action item. ` +
    `(When the current level is the last level, this naturally means the entire spec is in scope.) ` +
    `Within that in-scope range, evaluate the solution for correctness against the spec, ` +
    `clarity, React/state or algorithmic design as relevant, type safety, accessibility when relevant, ` +
    `edge cases, and maintainability. Be fair: passing tests is good, but hidden contract issues, brittle ` +
    `state, poor naming, missing controlled-component behavior, or avoidable complexity should lower the score.\n\n` +
    `You may also produce optional coaching action items. These are score-improvement suggestions, not required fixes. ` +
    `They must be helpful and directional, but they must not give away the answer or provide step-by-step implementation instructions. ` +
    `Focus on what to inspect or reason about, not exactly what code to write.\n\n` +
    (priorItems.length
      ? `Previously suggested action items (revalidate them against the latest submission):\n${JSON.stringify(priorItems, null, 2)}\n\n`
      : "") +
    (claimedItems.length
      ? `The learner has self-reported the following items as addressed (claimed=true). ` +
        `Treat each as a claim to verify, not as fact: set its "status" to "done" ONLY if the latest code ` +
        `actually confirms the fix, otherwise keep it "open" and explain briefly in the note. ` +
        `Carry the "claimed" flag through unchanged on each returned item.\n\n`
      : "") +
    `Always produce a study plan: 2-3 topics the learner should study next, derived from the weaknesses ` +
    `you found (or, if the solution is excellent, adjacent topics to deepen mastery). Each topic is a short ` +
    `topic name plus one sentence on why it matters. Topics only — do NOT include URLs.\n\n` +
    `Respond with the JSON object ONLY — no reasoning, no preamble, no markdown fences. ` +
    `Keep every string to a single concise sentence. ` +
    `Return only a JSON object with this exact shape and no markdown:\n` +
    `{"score":number,"summary":"string","strengths":["string"],"improvements":["string"],"studyPlan":[{"topic":"string","why":"string"}],"analysis":{"kind":"complexity|react-performance","title":"string","summary":"string","expected":"string","actual":"string","verdict":"string","bullets":["string"]},"actionItems":[{"text":"string","status":"open|done","note":"string","claimed":boolean}]}\n\n` +
    `Score from 0 to 100. Use 90-100 for excellent, 75-89 for solid with small issues, 55-74 for working but ` +
    `meaningfully rough, and below 55 for fragile or incomplete. Keep summary empathetic and concise. ` +
    `Use at most 2 strengths, 2 improvements, and 3 action items. ` +
    `Unless the score is 90 or above, include at least 2 action items — concrete retake goals the learner ` +
    `can work toward and check off. Only an excellent solution (90+) may have zero action items. ` +
    `For a resubmission, mark prior items as "done" when the issue appears addressed, keep "open" when it remains, ` +
    `drop items that are no longer relevant, and add new ones only if necessary. ` +
    `${categoryAnalysis} ` +
    `Each action item note should be one short sentence explaining why it still matters or acknowledging progress. ` +
    `Every part of the response — score, summary, strengths, improvements, study plan, action items, and analysis — ` +
    `must reflect ONLY levels 1 through ${currentLevel}. ` +
    `Reminder: the learner is on level ${currentLevel}; judge only levels 1 through ${currentLevel} and treat ` +
    `any higher levels as not yet expected (no penalty for unimplemented future levels).` +
    inlineContext(p, ext)
  );
}

function normalizeScoreOutput(output: string) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Score agent did not return JSON.");
  }

  const parsed = JSON.parse(output.slice(start, end + 1));
  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))));
  if (!Number.isFinite(score)) throw new Error("Score agent returned an invalid score.");

  return JSON.stringify({
    score,
    summary: typeof parsed.summary === "string" ? parsed.summary : "Code quality score is ready.",
    strengths: Array.isArray(parsed.strengths)
      ? parsed.strengths.filter((item: unknown) => typeof item === "string").slice(0, 2)
      : [],
    improvements: Array.isArray(parsed.improvements)
      ? parsed.improvements.filter((item: unknown) => typeof item === "string").slice(0, 2)
      : [],
    studyPlan: Array.isArray(parsed.studyPlan)
      ? parsed.studyPlan
          .filter(
            (item: unknown): item is { topic?: string; why?: string } =>
              typeof item === "object" && item !== null && typeof item.topic === "string"
          )
          .map((item) => ({
            topic: item.topic!.trim(),
            why: typeof item.why === "string" ? item.why.trim() : "",
          }))
          .filter((item) => item.topic)
          .slice(0, 4)
      : [],
    analysis:
      parsed.analysis && typeof parsed.analysis === "object"
        ? {
            kind:
              parsed.analysis.kind === "complexity" || parsed.analysis.kind === "react-performance"
                ? parsed.analysis.kind
                : "react-performance",
            title:
              typeof parsed.analysis.title === "string"
                ? parsed.analysis.title
                : parsed.analysis.kind === "complexity"
                  ? "Complexity analysis"
                  : "Performance analysis",
            summary:
              typeof parsed.analysis.summary === "string"
                ? parsed.analysis.summary
                : "Analysis unavailable.",
            expected: typeof parsed.analysis.expected === "string" ? parsed.analysis.expected.trim() : "",
            actual: typeof parsed.analysis.actual === "string" ? parsed.analysis.actual.trim() : "",
            verdict: typeof parsed.analysis.verdict === "string" ? parsed.analysis.verdict : "unknown",
            bullets: Array.isArray(parsed.analysis.bullets)
              ? parsed.analysis.bullets.filter((item: unknown) => typeof item === "string").slice(0, 3)
              : [],
          }
        : undefined,
    actionItems: Array.isArray(parsed.actionItems)
      ? parsed.actionItems
          .filter(
            (item: unknown): item is { text?: string; status?: string; note?: string; claimed?: boolean } =>
              typeof item === "object" && item !== null && typeof item.text === "string"
          )
          .map((item) => ({
            text: item.text!.trim(),
            status: item.status === "done" ? "done" : "open",
            note: typeof item.note === "string" ? item.note.trim() : "",
            claimed: item.claimed === true,
          }))
          .filter((item) => item.text)
          .slice(0, 3)
      : [],
  });
}

async function runAgentScore(p: ReviewPayload): Promise<string> {
  const ext = p.categoryId === "react" ? "tsx" : "ts";
  const output = await runAgent(p, ext, buildScorePrompt(p, ext), "score-output.txt");
  return normalizeScoreOutput(output);
}

function runAgent(p: ReviewPayload, ext: string, prompt: string, outputFile: string): Promise<string> {
  const dir = mkdtempSync(path.join(tmpdir(), "exercise-review-"));
  const outputPath = path.join(dir, outputFile);
  writeFileSync(path.join(dir, `solution.${ext}`), p.solution ?? "");
  writeFileSync(path.join(dir, "README.md"), p.readme ?? "");
  if (p.perfSpec?.trim()) writeFileSync(path.join(dir, "perf.ts"), p.perfSpec);

  const configuredCmd = process.env.EXERCISE_AGENT_CMD;
  const model = process.env.EXERCISE_AGENT_MODEL || "gpt-5.4-mini";
  // Grading/tutoring against a fixed rubric doesn't need deep reasoning, and the
  // hidden reasoning tokens dominate latency for gpt-5.x. Default to "low" effort
  // (override with EXERCISE_AGENT_EFFORT) — the single biggest latency lever here.
  const effort = process.env.EXERCISE_AGENT_EFFORT || "low";
  const cmd = configuredCmd
    ? `${configuredCmd} -`
    : `codex exec --skip-git-repo-check --ephemeral --sandbox read-only --model ${JSON.stringify(
        model
      )} -c ${JSON.stringify(`model_reasoning_effort="${effort}"`)} --output-last-message ${JSON.stringify(
        outputPath
      )} -`;

  return new Promise((resolve, reject) => {
    const proc = spawn("bash", ["-lc", cmd], { cwd: dir, stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    proc.stdin.end(prompt);
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (err += d));
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("The review agent timed out (120s)."));
    }, 120_000);
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`Could not run the review agent. Install codex or set EXERCISE_AGENT_CMD. (${e.message})`));
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      const finalOutput = existsSync(outputPath) ? readFileSync(outputPath, "utf8").trim() : "";
      if (finalOutput) resolve(finalOutput);
      else if (out.trim()) resolve(out.trim());
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
