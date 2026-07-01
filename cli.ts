import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { CATALOG, CategoryMeta, ExerciseMeta } from "./catalog";

// ── ANSI helpers ───────────────────────────────────────────────────────────────
const green  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const bold   = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim    = (s: string) => `\x1b[2m${s}\x1b[0m`;
const cyan   = (s: string) => `\x1b[36m${s}\x1b[0m`;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ── Registry ─────────────────────────────────────────────────────────────────
// Exercise/category metadata lives in catalog.ts (shared with the web IDE).
// Here we attach the Node-only runner behaviour for each category.
type Exercise = ExerciseMeta;
type ExerciseLanguage = "typescript" | "java";

interface Category extends CategoryMeta {
  /** Absolute path to the file the learner edits (watched to rerun tests). */
  solutionPath: (id: string, language: ExerciseLanguage) => string;
  /** Full shell command that emits parseable JSON on stdout. */
  testCommand: (id: string, language: ExerciseLanguage, level: number) => string;
  hasJava: (id: string) => boolean;
}

function javaExerciseFiles(id: string) {
  const dir = path.join(__dirname, id);
  if (!fs.existsSync(dir)) return { solution: null, test: null };

  const files = fs.readdirSync(dir).filter(file => file.endsWith(".java")).sort();
  return {
    solution: files.find(file => file !== "Main.java" && !file.endsWith("Test.java")) ?? null,
    test: files.find(file => file.endsWith("Test.java")) ?? null,
  };
}

const CATEGORIES: Category[] = CATALOG.map(meta =>
  meta.runner === "jest"
    ? {
        ...meta,
        solutionPath: (id, language) =>
          language === "java"
            ? path.join(__dirname, id, javaExerciseFiles(id).solution ?? "Solution.java")
            : path.join(__dirname, id, "solution.ts"),
        testCommand: (id, language, level) =>
          language === "java"
            ? `node scripts/runtime.mjs java-test ${id} ${level}`
            : `npx jest ${id} --json --forceExit --silent`,
        hasJava: id => {
          const files = javaExerciseFiles(id);
          return files.solution !== null && files.test !== null;
        },
      }
    : {
        ...meta,
        solutionPath: id => path.join(__dirname, "react", id, "solution.tsx"),
        testCommand: id => `npx vitest run react/${id} --reporter=json --silent`,
        hasJava: () => false,
      }
);

// ── Arrow-key menu ─────────────────────────────────────────────────────────────
const BACK = Symbol("back");

function menu(
  title: string,
  items: { id: string; name: string }[],
  opts: { footer: string; allowBack: boolean }
): Promise<number | typeof BACK> {
  return new Promise(resolve => {
    let cursor = 0;

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    const draw = () => {
      console.clear();
      console.log(bold(`\n  ${title}\n`));
      items.forEach((it, i) => {
        if (i === cursor) {
          console.log(`  ${cyan("❯")} ${bold(it.id)}  ${dim(it.name)}`);
        } else {
          console.log(`    ${dim(it.id)}  ${dim(it.name)}`);
        }
      });
      console.log(dim(`\n  ${opts.footer}\n`));
    };

    draw();

    const onKey = (_: string, key: readline.Key) => {
      if (key.ctrl && key.name === "c") process.exit(0);
      if (key.name === "up")   cursor = Math.max(0, cursor - 1);
      if (key.name === "down") cursor = Math.min(items.length - 1, cursor + 1);
      if (opts.allowBack && (key.name === "left" || key.name === "escape" || key.name === "b")) {
        process.stdin.removeListener("keypress", onKey);
        resolve(BACK);
        return;
      }
      if (key.name === "return") {
        process.stdin.removeListener("keypress", onKey);
        resolve(cursor);
        return;
      }
      draw();
    };

    process.stdin.on("keypress", onKey);
  });
}

// ── Live preview server (React only) ─────────────────────────────────────────
interface Preview { url: string | null; stop: () => void; }

function openBrowser(url: string) {
  try {
    if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
    } else {
      const cmd = process.platform === "darwin" ? "open" : "xdg-open";
      spawn(cmd, [url], { stdio: "ignore", detached: true }).unref();
    }
  } catch { /* no browser available — the URL is still printed in the footer */ }
}

function openEditor(dir: string) {
  try {
    spawn("code", [dir], { stdio: "ignore", detached: true }).unref();
  } catch { /* the `code` CLI isn't on PATH — skip silently */ }
}

function startPreview(exerciseId: string): Preview {
  const handle: Preview = { url: null, stop: () => {} };
  const proc = spawn("npx", ["vite", "--clearScreen", "false"], {
    cwd: __dirname,
    env: { ...process.env, VITE_EXERCISE: exerciseId },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const scan = (buf: Buffer) => {
    const m = /(https?:\/\/localhost:\d+\/?)/.exec(buf.toString());
    if (m && !handle.url) {
      handle.url = m[1];
      openBrowser(handle.url); // open the dev server as soon as it's ready
    }
  };
  proc.stdout?.on("data", scan);
  proc.stderr?.on("data", scan);
  handle.stop = () => { try { proc.kill(); } catch { /* already gone */ } };
  return handle;
}

// ── Jest/Vitest result parsing ───────────────────────────────────────────────
interface AssertionResult {
  status: "passed" | "failed" | "pending";
  title: string;
  failureMessages: string[];
}
interface TestResult {
  numFailedTests: number;
  numPassedTests: number;
  numPendingTests?: number;
  testResults: Array<{ assertionResults?: AssertionResult[]; testResults?: AssertionResult[]; }>;
}

function normalizeJavaResult(stdout: string): TestResult | null {
  const jsonLine = stdout
    .trim()
    .split("\n")
    .reverse()
    .find(line => line.trim().startsWith("{"));
  if (!jsonLine) return null;
  const parsed = JSON.parse(jsonLine);
  return {
    numFailedTests: parsed.failed ?? 0,
    numPassedTests: parsed.passed ?? 0,
    numPendingTests: parsed.skipped ?? 0,
    testResults: [
      {
        assertionResults: (parsed.rows ?? []).map((row: any) => ({
          status: row.status === "pass" ? "passed" : row.status === "skip" ? "pending" : "failed",
          title: row.name,
          failureMessages: row.error ? [row.error] : [],
        })),
      },
    ],
  };
}

function runTests(cat: Category, ex: Exercise, level: number, language: ExerciseLanguage): TestResult | null {
  try {
    const stdout = execSync(cat.testCommand(ex.id, language, level), {
      encoding: "utf-8",
      env: { ...process.env, LEVEL: String(level) },
      stdio: ["pipe", "pipe", "pipe"],
    });
    return language === "java" ? normalizeJavaResult(stdout) : JSON.parse(stdout);
  } catch (e: any) {
    try {
      return language === "java" ? normalizeJavaResult(e.stdout) : JSON.parse(e.stdout);
    } catch {
      return null;
    }
  }
}

// ── UI ─────────────────────────────────────────────────────────────────────────
function renderResults(
  ex: Exercise,
  level: number,
  result: TestResult | null,
  previewUrl: string | null
) {
  console.clear();

  console.log(bold(`\n  ${ex.id} — ${ex.name}`));
  const dots = Array.from({ length: ex.levels }, (_, i) => {
    if (i + 1 < level)  return green("●");
    if (i + 1 === level) return cyan("●");
    return dim("○");
  }).join("  ");
  console.log(`  ${dots}   ${dim(`level ${level} / ${ex.levels}`)}\n`);

  if (!result) {
    console.log(red("  Error: could not parse test output\n"));
    return;
  }

  const failing = result.testResults
    .flatMap(s => s.assertionResults ?? s.testResults ?? [])
    .filter(t => t?.status === "failed");

  if (result.numFailedTests === 0 && result.numPassedTests > 0) {
    console.log(green(bold(`  ✓ ${result.numPassedTests} tests passing\n`)));
  } else {
    console.log(
      `  ${green(`✓ ${result.numPassedTests} passing`)}   ${red(`✗ ${result.numFailedTests} failing`)}\n`
    );
    failing.slice(0, 8).forEach(t => {
      console.log(red(`  ✗ ${t.title}`));
      const lines = (t.failureMessages[0] ?? "")
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith("at ") && !l.startsWith("●") && l !== "");
      lines.slice(0, 2).forEach(l => console.log(dim(`    ${l}`)));
    });
    if (failing.length > 8) console.log(dim(`\n  … and ${failing.length - 8} more`));
    console.log();
  }

  if (previewUrl) console.log(cyan(`  ◆ live preview: ${previewUrl}\n`));
  console.log(dim("  Watching solution — save to rerun   ctrl+c to quit\n"));
}

function renderSpinner(ex: Exercise): NodeJS.Timeout {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  console.clear();
  console.log(bold(`\n  ${ex.id} — ${ex.name}\n`));
  return setInterval(() => {
    process.stdout.write(`\r  ${cyan(frames[i++ % frames.length])} Running tests...`);
  }, 80);
}

// ── Watch loop ─────────────────────────────────────────────────────────────────
function watchUntilPassed(
  cat: Category,
  ex: Exercise,
  level: number,
  preview: Preview | null,
  language: ExerciseLanguage
): Promise<void> {
  return new Promise(resolve => {
    const solutionPath = cat.solutionPath(ex.id, language);
    let watcher: fs.FSWatcher | null = null;
    let debounce: NodeJS.Timeout | null = null;
    let resolved = false;

    const check = () => {
      const spinner = renderSpinner(ex);
      const result = runTests(cat, ex, level, language);
      clearInterval(spinner);

      renderResults(ex, level, result, preview?.url ?? null);

      if (result && result.numFailedTests === 0 && result.numPassedTests > 0) {
        resolved = true;
        watcher?.close();
        resolve();
      }
    };

    check();
    if (resolved) return;

    const dir = path.dirname(solutionPath);
    const filename = path.basename(solutionPath);
    watcher = fs.watch(dir, (_, changed) => {
      if (changed !== filename) return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(check, 200);
    });
  });
}

// ── Run a category from a chosen exercise to the end ─────────────────────────
interface RunOptions { openVSCode: boolean; openBrowser: boolean; language: ExerciseLanguage; }

async function runFrom(cat: Category, exerciseIndex: number, opts: RunOptions) {
  if (opts.openVSCode) {
    openEditor(path.dirname(cat.solutionPath(cat.exercises[exerciseIndex].id, opts.language)));
  }

  for (let i = exerciseIndex; i < cat.exercises.length; i++) {
    const ex = cat.exercises[i];
    const language = opts.language === "java" && !cat.hasJava(ex.id) ? "typescript" : opts.language;
    const preview = cat.preview && opts.openBrowser ? startPreview(ex.id) : null;

    for (let level = 1; level <= ex.levels; level++) {
      await watchUntilPassed(cat, ex, level, preview, language);

      if (level < ex.levels) {
        console.log(green(bold(`\n  ✓ Level ${level} complete!`)));
        console.log(`  ${dim("→")} Level ${level + 1} unlocked\n`);
        await sleep(1800);
      }
    }

    preview?.stop();

    console.clear();
    console.log(green(bold(`\n  ✓ ${ex.name} — all levels complete!\n`)));

    if (i + 1 < cat.exercises.length) {
      console.log(`  Next up: ${bold(cat.exercises[i + 1].id)} — ${cat.exercises[i + 1].name}\n`);
      await sleep(2200);
    }
  }

  console.clear();
  console.log(bold(green(`\n  ✓ ${cat.name} — category complete! 🎉\n`)));
  await sleep(1600);
}

// ── Main flow ──────────────────────────────────────────────────────────────────
async function main() {
  while (true) {
    const catChoice = await menu(
      "code-exercises",
      CATEGORIES.map(c => ({ id: c.id, name: c.name })),
      { footer: "↑↓ navigate   enter select   ctrl+c quit", allowBack: false }
    );
    if (catChoice === BACK) continue;
    const cat = CATEGORIES[catChoice];

    while (true) {
      const exChoice = await menu(
        cat.name,
        cat.exercises,
        { footer: "↑↓ navigate   enter select   ←/esc back   ctrl+c quit", allowBack: true }
      );
      if (exChoice === BACK) break;
      const ex = cat.exercises[exChoice];
      let language: ExerciseLanguage = "typescript";
      if (cat.hasJava(ex.id)) {
        const langChoice = await menu(
          `${ex.name} — language`,
          [
            { id: "typescript", name: "JavaScript / TypeScript" },
            { id: "java", name: "Java" },
          ],
          { footer: "↑↓ navigate   enter select   ←/esc back   ctrl+c quit", allowBack: true }
        );
        if (langChoice === BACK) continue;
        language = langChoice === 1 ? "java" : "typescript";
      }

      // Prestep: choose what to open before the exercise starts.
      const preItems = cat.preview
        ? [
            { id: "both",    name: "Open browser + VS Code in this exercise" },
            { id: "browser", name: "Open browser only" },
            { id: "none",    name: "Just run tests (open nothing)" },
          ]
        : [
            { id: "vscode",  name: "Open VS Code in this exercise" },
            { id: "none",    name: "Just run tests (open nothing)" },
          ];
      const pre = await menu(
        `${ex.name} — before we start`,
        preItems,
        { footer: "↑↓ navigate   enter select   ←/esc back   ctrl+c quit", allowBack: true }
      );
      if (pre === BACK) continue;

      const opts: RunOptions = cat.preview
        ? { openVSCode: pre === 0, openBrowser: pre === 0 || pre === 1, language }
        : { openVSCode: pre === 0, openBrowser: false, language };
      await runFrom(cat, exChoice, opts);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
