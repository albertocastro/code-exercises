import { execSync } from "child_process";
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

// ── Exercise registry ──────────────────────────────────────────────────────────
const EXERCISES = [
  { id: "exercise_0", name: "Warm-up: Simple Sum", levels: 2 },
  { id: "exercise_1", name: "Parking Garage",      levels: 4 },
  { id: "exercise_2", name: "Banking System",      levels: 4 },
  { id: "exercise_3", name: "Task Manager",        levels: 4 },
  { id: "exercise_4", name: "Library System",      levels: 3 },
  { id: "exercise_5", name: "Online Store",        levels: 4 },
  { id: "exercise_6", name: "Rate Limiter",        levels: 4 },
  { id: "exercise_7", name: "LRU/LFU Cache",       levels: 4 },
];

// ── Arrow-key menu ─────────────────────────────────────────────────────────────
function pickExercise(startAt = 0): Promise<number> {
  return new Promise(resolve => {
    let cursor = startAt;

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    const draw = () => {
      console.clear();
      console.log(bold("\n  code-exercises\n"));
      EXERCISES.forEach((ex, i) => {
        if (i === cursor) {
          console.log(`  ${cyan("❯")} ${bold(ex.id)}  ${dim(ex.name)}`);
        } else {
          console.log(`    ${dim(ex.id)}  ${dim(ex.name)}`);
        }
      });
      console.log(dim("\n  ↑↓ navigate   enter select   ctrl+c quit\n"));
    };

    draw();

    const onKey = (_: string, key: readline.Key) => {
      if (key.ctrl && key.name === "c") process.exit(0);
      if (key.name === "up")    cursor = Math.max(0, cursor - 1);
      if (key.name === "down")  cursor = Math.min(EXERCISES.length - 1, cursor + 1);
      if (key.name === "return") {
        process.stdin.setRawMode(false);
        process.stdin.removeAllListeners("keypress");
        resolve(cursor);
        return;
      }
      draw();
    };

    process.stdin.on("keypress", onKey);
  });
}

// ── Jest runner ────────────────────────────────────────────────────────────────
interface AssertionResult {
  status: "passed" | "failed" | "pending";
  title: string;
  failureMessages: string[];
}

interface JestResult {
  numFailedTests: number;
  numPassedTests: number;
  testResults: Array<{
    assertionResults?: AssertionResult[];
    testResults?: AssertionResult[];
  }>;
}

function runTests(exerciseId: string, level: number): JestResult | null {
  try {
    const stdout = execSync(
      `npx jest ${exerciseId} --json --forceExit --silent`,
      {
        encoding: "utf-8",
        env: { ...process.env, LEVEL: String(level) },
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
    return JSON.parse(stdout);
  } catch (e: any) {
    try { return JSON.parse(e.stdout); } catch { return null; }
  }
}

// ── UI ─────────────────────────────────────────────────────────────────────────
function renderResults(
  ex: (typeof EXERCISES)[number],
  level: number,
  result: JestResult | null
) {
  console.clear();

  // Header
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
      // Show up to 2 meaningful lines: error + expected/received
      lines.slice(0, 2).forEach(l => console.log(dim(`    ${l}`)));
    });
    if (failing.length > 8) console.log(dim(`\n  … and ${failing.length - 8} more`));
    console.log();
  }

  console.log(dim("  Watching solution.ts — save to rerun   ctrl+c to quit\n"));
}

function renderSpinner(ex: (typeof EXERCISES)[number], level: number): NodeJS.Timeout {
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
  ex: (typeof EXERCISES)[number],
  level: number
): Promise<void> {
  return new Promise(resolve => {
    const solutionPath = path.join(__dirname, ex.id, "solution.ts");
    let watcher: fs.FSWatcher | null = null;
    let debounce: NodeJS.Timeout | null = null;
    let resolved = false;

    const check = () => {
      const spinner = renderSpinner(ex, level);
      const result = runTests(ex.id, level);
      clearInterval(spinner);

      renderResults(ex, level, result);

      if (result && result.numFailedTests === 0 && result.numPassedTests > 0) {
        resolved = true;
        watcher?.close();
        resolve();
      }
    };

    check();
    if (resolved) return;

    // Watch the directory (more reliable on macOS with atomic saves)
    const dir = path.dirname(solutionPath);
    const filename = path.basename(solutionPath);
    watcher = fs.watch(dir, (_, changed) => {
      if (changed !== filename) return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(check, 200);
    });
  });
}

// ── Main flow ──────────────────────────────────────────────────────────────────
async function runFrom(exerciseIndex: number) {
  for (let i = exerciseIndex; i < EXERCISES.length; i++) {
    const ex = EXERCISES[i];

    for (let level = 1; level <= ex.levels; level++) {
      await watchUntilPassed(ex, level);

      if (level < ex.levels) {
        console.log(green(bold(`\n  ✓ Level ${level} complete!`)));
        console.log(`  ${dim("→")} Level ${level + 1} unlocked\n`);
        await sleep(1800);
      }
    }

    console.clear();
    console.log(green(bold(`\n  ✓ ${ex.name} — all levels complete!\n`)));

    if (i + 1 < EXERCISES.length) {
      console.log(`  Next up: ${bold(EXERCISES[i + 1].id)} — ${EXERCISES[i + 1].name}\n`);
      await sleep(2200);
    }
  }

  console.clear();
  console.log(bold(green("\n  All exercises complete! 🎉\n")));
}

async function main() {
  const idx = await pickExercise();
  await runFrom(idx);
}

main().catch(err => { console.error(err); process.exit(1); });
