import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ── ANSI helpers ───────────────────────────────────────────────────────────────
const green  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const bold   = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim    = (s: string) => `\x1b[2m${s}\x1b[0m`;
const cyan   = (s: string) => `\x1b[36m${s}\x1b[0m`;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ── Registry ─────────────────────────────────────────────────────────────────
interface Exercise { id: string; name: string; levels: number; }

interface Category {
  id: string;
  name: string;
  exercises: Exercise[];
  /** Absolute path to the file the learner edits (watched to rerun tests). */
  solutionPath: (id: string) => string;
  /** Full shell command that emits Jest-compatible JSON on stdout. */
  testCommand: (id: string) => string;
  /** React categories get a live browser preview. */
  preview: boolean;
}

const LEETCODE: Exercise[] = [
  { id: "exercise_0", name: "Warm-up: Simple Sum", levels: 2 },
  { id: "exercise_1", name: "Parking Garage",      levels: 4 },
  { id: "exercise_2", name: "Banking System",      levels: 4 },
  { id: "exercise_3", name: "Task Manager",        levels: 4 },
  { id: "exercise_4", name: "Library System",      levels: 3 },
  { id: "exercise_5", name: "Online Store",        levels: 4 },
  { id: "exercise_6", name: "Rate Limiter",        levels: 4 },
  { id: "exercise_7", name: "LRU/LFU Cache",       levels: 4 },
  { id: "exercise_8", name: "Expression Evaluator",levels: 4 },
  { id: "exercise_9", name: "Task Scheduler",      levels: 4 },
  { id: "exercise_10", name: "Event Bus",          levels: 4 },
];

const REACT: Exercise[] = [
  { id: "01_counter",       name: "Counter",         levels: 4 },
  { id: "02_star_rating",   name: "Star Rating",     levels: 3 },
  { id: "03_todo_list",     name: "Todo List",       levels: 4 },
  { id: "04_search_filter", name: "Searchable List", levels: 3 },
  { id: "05_tabs",          name: "Tabs",            levels: 3 },
];

const CATEGORIES: Category[] = [
  {
    id: "leetcode",
    name: "LeetCode — TypeScript algorithms & design",
    exercises: LEETCODE,
    solutionPath: id => path.join(__dirname, id, "solution.ts"),
    testCommand: id => `npx jest ${id} --json --forceExit --silent`,
    preview: false,
  },
  {
    id: "react",
    name: "React — build components (RTL + live preview)",
    exercises: REACT,
    solutionPath: id => path.join(__dirname, "react", id, "solution.tsx"),
    testCommand: id => `npx vitest run react/${id} --reporter=json --silent`,
    preview: true,
  },
];

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
  testResults: Array<{ assertionResults?: AssertionResult[]; testResults?: AssertionResult[]; }>;
}

function runTests(cat: Category, ex: Exercise, level: number): TestResult | null {
  try {
    const stdout = execSync(cat.testCommand(ex.id), {
      encoding: "utf-8",
      env: { ...process.env, LEVEL: String(level) },
      stdio: ["pipe", "pipe", "pipe"],
    });
    return JSON.parse(stdout);
  } catch (e: any) {
    try { return JSON.parse(e.stdout); } catch { return null; }
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
  preview: Preview | null
): Promise<void> {
  return new Promise(resolve => {
    const solutionPath = cat.solutionPath(ex.id);
    let watcher: fs.FSWatcher | null = null;
    let debounce: NodeJS.Timeout | null = null;
    let resolved = false;

    const check = () => {
      const spinner = renderSpinner(ex);
      const result = runTests(cat, ex, level);
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
async function runFrom(cat: Category, exerciseIndex: number) {
  for (let i = exerciseIndex; i < cat.exercises.length; i++) {
    const ex = cat.exercises[i];
    const preview = cat.preview ? startPreview(ex.id) : null;

    for (let level = 1; level <= ex.levels; level++) {
      await watchUntilPassed(cat, ex, level, preview);

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
      await runFrom(cat, exChoice);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
