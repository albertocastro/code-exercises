// Shared Web IDE `/api/*` handlers.
//
// This module is the SINGLE source of truth for the Web IDE's backend. Both the
// Vite dev server (vite.web.config.ts) and the standalone production server
// (server/index.mjs) import it, so dev and prod never drift.
//
// Everything here is written against plain Node `http` req/res so it can be
// mounted under either a Connect-style middleware stack (Vite's
// `server.middlewares.use`) or the production server's tiny router. Handlers are
// framework-agnostic functions; `registerApiRoutes(use)` wires them onto any
// `use(path, handler)` sink.
//
// Java execution runs IN-PROCESS inside this container: we invoke the JDK's
// `javac`/`java` binaries (baked into the image) as unprivileged child
// processes in a locked-down per-run temp workdir, with wall-clock timeouts,
// a capped JVM heap, and no network. There is NO host Docker socket and NO
// sibling container — the app container never talks to a Docker daemon. See
// the "Java in-process runner" section below and docs/docker.md for the
// security rationale (this replaced a docker.sock + root design).

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Repo root is one level up from web-api/. The exercise-backend bridge scans
// <root>/react for backend.ts files.
const ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Java in-process runner — configuration
// ---------------------------------------------------------------------------
//
// Untrusted exercise code is compiled and executed locally as a child process.
// Every knob below is a guardrail so a runaway/hostile submission cannot harm
// the container or the host:
//
//  * JAVA_WORK_ROOT — parent dir for per-run mkdtemp workdirs. Defaults to the
//    OS temp dir; the container sets it to a dedicated, non-root-owned,
//    tmpfs-friendly path (/tmp/code-exercises-java) so all Java scratch state is
//    isolated and disposable. Each run gets its own subdir, wiped in `finally`.
//  * JAVA_MAX_HEAP — `-Xmx` cap passed to every `java` invocation so a
//    submission can't exhaust container memory (default 256m).
//  * The `java` launcher additionally gets flags that keep untrusted code
//    contained: a small heap, headless mode, and a fixed locale/timezone for
//    deterministic test output.
//
// `javac` and `java` are resolved from JAVA_HOME (set in the image) so we never
// depend on a Docker daemon or a sibling container.

const JAVA_WORK_ROOT = process.env.JAVA_WORK_ROOT || tmpdir();
const JAVA_MAX_HEAP = process.env.JAVA_MAX_HEAP || "256m";
const JAVA_HOME = process.env.JAVA_HOME || "";

function javaBin(name) {
  return JAVA_HOME ? path.join(JAVA_HOME, "bin", name) : name;
}

// Flags applied to every untrusted `java` launch: cap the heap, run headless,
// and pin locale/timezone so test output is stable regardless of the host.
function javaHardeningFlags() {
  return [
    `-Xmx${JAVA_MAX_HEAP}`,
    "-XX:+UseSerialGC",
    "-Djava.awt.headless=true",
    "-Duser.language=en",
    "-Duser.country=US",
    "-Duser.timezone=UTC",
  ];
}

// Create an isolated per-run scratch dir under JAVA_WORK_ROOT.
function makeJavaWorkdir(prefix) {
  if (JAVA_WORK_ROOT !== tmpdir() && !existsSync(JAVA_WORK_ROOT)) {
    // Best-effort: create the configured root if it doesn't exist yet.
    try {
      mkdirSync(JAVA_WORK_ROOT, { recursive: true });
    } catch {
      /* fall through to mkdtemp, which will throw a clear error if unusable */
    }
  }
  return mkdtempSync(path.join(JAVA_WORK_ROOT, prefix));
}

// ---------------------------------------------------------------------------
// Small process helpers
// ---------------------------------------------------------------------------

// Run a child process to completion, capturing stdout/stderr, with a hard
// wall-clock timeout. On timeout we kill the ENTIRE process group (detached +
// `-pid`) so a `java` process that spawned threads/children can't linger.
function runCommand(command, args, cwd, timeoutMs, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true, // own process group → we can kill the whole tree on timeout
      env: options.env || process.env,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const killTree = (signal) => {
      try {
        process.kill(-proc.pid, signal);
      } catch {
        try {
          proc.kill(signal);
        } catch {
          /* already gone */
        }
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      killTree("SIGKILL");
      resolve({ code: null, stdout, stderr: `${stderr}\nTimed out after ${timeoutMs}ms.`.trim(), timedOut });
    }, timeoutMs);

    proc.stdout.on("data", (data) => (stdout += data));
    proc.stderr.on("data", (data) => (stderr += data));
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (!timedOut) resolve({ code, stdout, stderr, timedOut });
    });
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function writeJsonLine(res, value) {
  res.write(`${JSON.stringify(value)}\n`);
}

// ---------------------------------------------------------------------------
// Java: compile diagnostics
// ---------------------------------------------------------------------------

// Turn `javac` stderr into structured diagnostics. javac prints a header line
// (`File.java:12: error: message`) optionally followed by the offending source
// line and a `^` caret whose position gives us the column.
function parseJavacDiagnostics(stderr) {
  const lines = stderr.split(/\r?\n/);
  const header = /^(.+\.java):(\d+): (error|warning): (.*)$/;
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = header.exec(lines[i]);
    if (!m) continue;
    let column = 1;
    const caret = lines[i + 2];
    if (caret && /^\s*\^\s*$/.test(caret)) column = caret.indexOf("^") + 1;
    out.push({
      file: path.basename(m[1]),
      line: Number(m[2]),
      column,
      severity: m[3],
      message: m[4].trim(),
    });
  }
  return out;
}

export async function compileJava(payload) {
  const files = (payload.files ?? []).filter((f) => !!f?.name && typeof f.content === "string");
  if (!files.length) return { ok: true, diagnostics: [] };

  const dir = makeJavaWorkdir("exercise-java-compile-");
  try {
    const javaNames = [];
    for (const f of files) {
      const base = path.basename(f.name);
      writeFileSync(path.join(dir, base), f.content);
      if (base.endsWith(".java")) javaNames.push(base);
    }
    if (!javaNames.length) return { ok: true, diagnostics: [] };

    // Compile all .java files in the isolated workdir (cwd = dir), so class
    // files land beside the sources and nothing escapes the scratch dir.
    const compile = await runCommand(
      javaBin("javac"),
      ["-encoding", "UTF-8", "-Xlint:none", ...javaNames],
      dir,
      15_000
    );
    return { ok: true, diagnostics: parseJavacDiagnostics(compile.stderr || compile.stdout) };
  } catch (e) {
    return { ok: false, error: javaErrorMessage(e), diagnostics: [] };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Java: run a test class
// ---------------------------------------------------------------------------

export async function runJavaTests(payload) {
  const dir = makeJavaWorkdir("exercise-java-");
  const solutionFileName = payload.solutionFileName || "Solution.java";
  const testFileName = payload.testFileName || "SolutionTest.java";
  const testClass = testFileName.replace(/\.java$/, "");
  try {
    writeFileSync(path.join(dir, solutionFileName), payload.solutionCode ?? "");
    writeFileSync(path.join(dir, testFileName), payload.testCode ?? "");

    const compile = await runCommand(
      javaBin("javac"),
      ["-encoding", "UTF-8", solutionFileName, testFileName],
      dir,
      10_000
    );
    if (compile.code !== 0) {
      return {
        ok: true,
        result: {
          rows: [],
          passed: 0,
          failed: 0,
          skipped: 0,
          compileError: `javac — ${(compile.stderr || compile.stdout).trim() || "Compilation failed."}`,
        },
      };
    }

    // Run the test class in-process: cwd = dir puts the compiled classes on the
    // default classpath; hardening flags cap heap and keep it headless.
    const run = await runCommand(
      javaBin("java"),
      [...javaHardeningFlags(), testClass, String(payload.level ?? 1)],
      dir,
      12_000
    );
    const output = run.stdout.trim();
    const jsonLine = output
      .split("\n")
      .reverse()
      .find((line) => line.trim().startsWith("{"));
    if (run.code !== 0 || !jsonLine) {
      return {
        ok: true,
        result: {
          rows: [],
          passed: 0,
          failed: 0,
          skipped: 0,
          compileError: `java — ${(run.stderr || run.stdout).trim() || "Test process failed."}`,
        },
      };
    }

    return {
      ok: true,
      result: JSON.parse(jsonLine),
      console: output.split("\n").slice(0, -1).filter(Boolean),
    };
  } catch (e) {
    return { ok: false, error: javaErrorMessage(e) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Java: stream `Main.java` stdout/stderr as NDJSON
// ---------------------------------------------------------------------------

export async function streamJavaMain(payload, res) {
  const dir = makeJavaWorkdir("exercise-java-main-");
  let activeProc = null;
  let closed = false;
  const solutionFileName = payload.solutionFileName || "Solution.java";
  const mainFileName = payload.mainFileName || "Main.java";
  const mainClass = mainFileName.replace(/\.java$/, "");

  // Kill the whole process group so a `java` process that spawned threads or
  // child processes is fully torn down.
  const killActive = (signal = "SIGKILL") => {
    if (!activeProc) return;
    try {
      process.kill(-activeProc.pid, signal);
    } catch {
      try {
        activeProc.kill(signal);
      } catch {
        /* already gone */
      }
    }
  };

  const cleanup = async () => {
    killActive();
    rmSync(dir, { recursive: true, force: true });
  };

  res.on("close", () => {
    closed = true;
    killActive();
  });

  try {
    writeFileSync(path.join(dir, solutionFileName), payload.solutionCode ?? "");
    writeFileSync(path.join(dir, mainFileName), payload.mainCode ?? "");

    const compile = await runCommand(
      javaBin("javac"),
      ["-encoding", "UTF-8", solutionFileName, mainFileName],
      dir,
      10_000
    );
    if (compile.code !== 0) {
      writeJsonLine(res, { type: "stderr", text: (compile.stderr || compile.stdout).trim() || "Compilation failed." });
      return;
    }

    await new Promise((resolve) => {
      const proc = spawn(
        javaBin("java"),
        [...javaHardeningFlags(), mainClass],
        { cwd: dir, stdio: ["ignore", "pipe", "pipe"], detached: true }
      );
      activeProc = proc;
      const timer = setTimeout(() => {
        killActive();
        if (!closed) writeJsonLine(res, { type: "stderr", text: "Main.java timed out after 30s." });
      }, 30_000);

      proc.stdout.on("data", (data) => {
        for (const line of data.toString().split(/\r?\n/)) {
          if (line && !closed) writeJsonLine(res, { type: "stdout", text: line });
        }
      });
      proc.stderr.on("data", (data) => {
        for (const line of data.toString().split(/\r?\n/)) {
          if (line && !closed) writeJsonLine(res, { type: "stderr", text: line });
        }
      });
      proc.on("error", (e) => {
        clearTimeout(timer);
        if (!closed) writeJsonLine(res, { type: "error", error: e.message });
        resolve();
      });
      proc.on("close", (code) => {
        clearTimeout(timer);
        activeProc = null;
        if (!closed && code && code !== 0) writeJsonLine(res, { type: "stderr", text: `Main exited with code ${code}.` });
        resolve();
      });
    });
  } catch (e) {
    writeJsonLine(res, { type: "error", error: javaErrorMessage(e) });
  } finally {
    await cleanup();
    if (!closed) res.end();
  }
}

// Normalize errors from the in-process Java runner. A missing `javac`/`java`
// binary (ENOENT) means the JDK isn't on PATH / JAVA_HOME is unset — surface a
// clear, actionable message instead of a raw spawn error.
function javaErrorMessage(e) {
  const message = e instanceof Error ? e.message : String(e);
  if (message.includes("ENOENT")) {
    return "Java toolchain unavailable: the JDK (javac/java) was not found. Ensure a JDK is installed and JAVA_HOME is set.";
  }
  return message;
}

// ---------------------------------------------------------------------------
// AI review / score (shell out to `codex`)
// ---------------------------------------------------------------------------

function inlineContext(p, ext) {
  return (
    `\n\n--- README.md ---\n${p.readme ?? ""}\n` +
    (p.perfSpec?.trim() ? `\n--- perf.ts (hidden performance target) ---\n${p.perfSpec}\n` : "") +
    `\n--- solution.${ext} ---\n${p.solution ?? ""}\n`
  );
}

function buildReviewPrompt(p, ext) {
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

function solutionExt(p) {
  if (p.language === "java") return "java";
  return p.categoryId === "react" ? "tsx" : "ts";
}

function buildScorePrompt(p, ext) {
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

function normalizeScoreOutput(output) {
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
      ? parsed.strengths.filter((item) => typeof item === "string").slice(0, 2)
      : [],
    improvements: Array.isArray(parsed.improvements)
      ? parsed.improvements.filter((item) => typeof item === "string").slice(0, 2)
      : [],
    studyPlan: Array.isArray(parsed.studyPlan)
      ? parsed.studyPlan
          .filter((item) => typeof item === "object" && item !== null && typeof item.topic === "string")
          .map((item) => ({
            topic: item.topic.trim(),
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
              typeof parsed.analysis.summary === "string" ? parsed.analysis.summary : "Analysis unavailable.",
            expected: typeof parsed.analysis.expected === "string" ? parsed.analysis.expected.trim() : "",
            actual: typeof parsed.analysis.actual === "string" ? parsed.analysis.actual.trim() : "",
            verdict: typeof parsed.analysis.verdict === "string" ? parsed.analysis.verdict : "unknown",
            bullets: Array.isArray(parsed.analysis.bullets)
              ? parsed.analysis.bullets.filter((item) => typeof item === "string").slice(0, 3)
              : [],
          }
        : undefined,
    actionItems: Array.isArray(parsed.actionItems)
      ? parsed.actionItems
          .filter((item) => typeof item === "object" && item !== null && typeof item.text === "string")
          .map((item) => ({
            text: item.text.trim(),
            status: item.status === "done" ? "done" : "open",
            note: typeof item.note === "string" ? item.note.trim() : "",
            claimed: item.claimed === true,
          }))
          .filter((item) => item.text)
          .slice(0, 3)
      : [],
  });
}

function runAgent(p, ext, prompt, outputFile) {
  const dir = mkdtempSync(path.join(tmpdir(), "exercise-review-"));
  const outputPath = path.join(dir, outputFile);
  writeFileSync(path.join(dir, `solution.${ext}`), p.solution ?? "");
  writeFileSync(path.join(dir, "README.md"), p.readme ?? "");
  if (p.perfSpec?.trim()) writeFileSync(path.join(dir, "perf.ts"), p.perfSpec);

  const configuredCmd = process.env.EXERCISE_AGENT_CMD;
  const model = process.env.EXERCISE_AGENT_MODEL || "gpt-5.4-mini";
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

export function runAgentReview(p) {
  const ext = solutionExt(p);
  return runAgent(p, ext, buildReviewPrompt(p, ext), "review-output.txt");
}

export async function runAgentScore(p) {
  const ext = solutionExt(p);
  const output = await runAgent(p, ext, buildScorePrompt(p, ext), "score-output.txt");
  return normalizeScoreOutput(output);
}

function buildPrReviewPrompt(p, ext) {
  const currentLevel = p.level ?? "unknown";
  const solution = p.solution ?? "";
  const lineCount = solution.length ? solution.split("\n").length : 0;

  return (
    `You are a patient programming tutor performing a GitHub-pull-request-style review of the ` +
    `solution below for a coding exercise. Your main goal is to teach the learner how to REASON ` +
    `about their code, not to hand over a finished rewrite. Prefer guiding questions and directional ` +
    `hints over solutions — this is a LEARNING platform. ` +
    `The learner is working through the exercise INCREMENTALLY, one level at a time, and is ` +
    `currently on level ${currentLevel}. The README's "Levels" section lists the levels as a ` +
    `numbered list, where item n describes the requirements introduced at level n. ` +
    `Evaluate ONLY the requirements for levels 1 through ${currentLevel} (inclusive). ` +
    `Any functionality described for levels ABOVE ${currentLevel} is OUT OF SCOPE and is not ` +
    `expected to exist yet: its absence, incompleteness, or stubbed/placeholder state must NOT ` +
    `be flagged as a mistake, a missing piece, or a weakness. ` +
    `(When the current level is the last level, this naturally means the entire spec is in scope.)\n\n` +
    `Leave inline comments anchored to specific lines of the submitted solution file, exactly like a ` +
    `human reviewer would on a pull request. Each comment targets one 1-based line number that exists ` +
    `in the submitted solution.${lineCount ? ` The submitted solution.${ext} has ${lineCount} lines; ` +
      `every "line" you return MUST be between 1 and ${lineCount}.` : ""} ` +
    `Keep it tight: at most 5 comments total, and include at least 1 "praise" comment when the code ` +
    `deserves it. Use "severity" of "praise" for encouragement, "nit" for small style/clarity points, ` +
    `and "suggestion" for something worth reconsidering. In each "body", coach the learner: ask a ` +
    `question or point at what to inspect rather than dictating the exact fix. ` +
    `Only include a "suggestion" field when a concrete single-line or small-block replacement is ` +
    `genuinely apt; it should be the replacement text for that line/block and nothing else. Omit it otherwise.\n\n` +
    `Also give an overall "verdict": "approve" when the in-scope work is solid, "comment" for neutral ` +
    `observations with nothing blocking, or "changes" when something in scope should be reconsidered. ` +
    `The "summary" is one or two sentences of empathetic, high-level feedback.\n\n` +
    `Respond with the JSON object ONLY — no reasoning, no preamble, no markdown fences. ` +
    `Return only a JSON object with this exact shape and no markdown:\n` +
    `{"verdict":"approve|comment|changes","summary":"string","comments":[{"line":number,"severity":"praise|nit|suggestion","body":"string","suggestion":"string"}]}\n\n` +
    `Reminder: the learner is on level ${currentLevel}; judge only levels 1 through ${currentLevel} and ` +
    `treat any higher levels as not yet expected (no penalty for unimplemented future levels).` +
    inlineContext(p, ext)
  );
}

function normalizePrReviewOutput(output) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("PR review agent did not return JSON.");
  }

  const parsed = JSON.parse(output.slice(start, end + 1));
  const verdict =
    parsed.verdict === "approve" || parsed.verdict === "changes" ? parsed.verdict : "comment";

  return JSON.stringify({
    verdict,
    summary: typeof parsed.summary === "string" ? parsed.summary : "Review is ready.",
    comments: Array.isArray(parsed.comments)
      ? parsed.comments
          .filter((c) => typeof c === "object" && c !== null && typeof c.body === "string")
          .map((c) => {
            const line = Math.max(1, Math.round(Number(c.line)));
            return {
              line: Number.isFinite(line) ? line : 1,
              severity:
                c.severity === "praise" || c.severity === "nit" ? c.severity : "suggestion",
              body: c.body.trim(),
              suggestion:
                typeof c.suggestion === "string" && c.suggestion.trim()
                  ? c.suggestion.replace(/\n+$/, "")
                  : undefined,
            };
          })
          .filter((c) => c.body)
          .slice(0, 5)
      : [],
  });
}

export async function runAgentPrReview(p) {
  const ext = solutionExt(p);
  const output = await runAgent(p, ext, buildPrReviewPrompt(p, ext), "pr-review-output.txt");
  return normalizePrReviewOutput(output);
}

// ---------------------------------------------------------------------------
// Per-exercise backends (/api/ex/<id>/*)
// ---------------------------------------------------------------------------

// id (numeric prefix) -> absolute path to its backend.ts, discovered by scanning
// <root>/react. Mirrors the Vite exerciseBackendBridge. Each backend.ts exports
// `handle({ method, path, query, body })`. We load it with tsx's `tsImport`
// (on-the-fly TS transpilation) so there is no build step and no Vite dependency
// in production — the same source runs in dev and prod.
function discoverBackends() {
  const reactDir = path.join(ROOT, "react");
  const backends = new Map();
  if (existsSync(reactDir)) {
    for (const name of readdirSync(reactDir)) {
      const file = path.join(reactDir, name, "backend.ts");
      if (existsSync(file)) backends.set(name.split("_")[0], file);
    }
  }
  return backends;
}

// Cache resolved backend modules so we only transpile each once per process.
const backendModuleCache = new Map();
async function loadBackend(file) {
  if (!backendModuleCache.has(file)) {
    backendModuleCache.set(file, tsImport(file, import.meta.url));
  }
  return backendModuleCache.get(file);
}

// ---------------------------------------------------------------------------
// Route registration — mount the handlers onto any Connect-style `use` sink.
// ---------------------------------------------------------------------------

// `use(path, handler)` matches Vite's `server.middlewares.use` and the tiny
// prod router in server/index.mjs: handler receives (req, res) and `req.url` is
// the path relative to the mounted prefix.
export function registerApiRoutes(use) {
  const agentHandler = (kind) => (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      return res.end("Method Not Allowed");
    }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let payload;
      try {
        payload = JSON.parse(body || "{}");
      } catch {
        res.statusCode = 400;
        return res.end(JSON.stringify({ ok: false, error: "Invalid JSON" }));
      }
      const run =
        kind === "score" ? runAgentScore : kind === "pr-review" ? runAgentPrReview : runAgentReview;
      run(payload)
        .then((output) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true, output }));
        })
        .catch((e) => {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: e.message }));
        });
    });
  };

  use("/api/review", agentHandler("review"));
  use("/api/score", agentHandler("score"));
  use("/api/pr-review", agentHandler("pr-review"));

  use("/api/java-test", async (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      return res.end("Method Not Allowed");
    }
    try {
      const payload = await readJsonBody(req);
      const result = await runJavaTests(payload);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(result));
    } catch (e) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  });

  use("/api/java-compile", async (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      return res.end("Method Not Allowed");
    }
    try {
      const payload = await readJsonBody(req);
      const result = await compileJava(payload);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(result));
    } catch (e) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: e.message, diagnostics: [] }));
    }
  });

  use("/api/java-main", async (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      return res.end("Method Not Allowed");
    }
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    try {
      const payload = await readJsonBody(req);
      await streamJavaMain(payload, res);
    } catch (e) {
      writeJsonLine(res, { type: "error", error: e.message });
      res.end();
    }
  });

  // Per-exercise REST backends. `req.url` here is relative to /api/ex/ →
  // "<id>/<path>?<query>".
  const backends = discoverBackends();
  use("/api/ex/", (req, res) => {
    const raw = req.url ?? "";
    const url = new URL(raw, "http://localhost");
    const [, id, ...rest] = url.pathname.split("/");
    const file = backends.get(id);
    if (!file) {
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: `No backend for exercise ${id}` }));
    }

    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      let parsed;
      if (body) {
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }
      }
      try {
        const mod = await loadBackend(file);
        const result = await mod.handle({
          method: req.method ?? "GET",
          path: "/" + rest.join("/"),
          query: url.searchParams,
          body: parsed,
        });
        res.statusCode = result.status ?? 200;
        if (result.json !== undefined) {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result.json));
        } else {
          res.end(result.text ?? "");
        }
      } catch (e) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  });
}
