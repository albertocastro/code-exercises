import { transpile } from "./transpile";
import { clearLearnerCss, makeRequire, type LearnerFiles } from "./modules";
import { evalModule } from "./evalModule";
import { expect, makeVi } from "./expectSetup";
import { clearSandbox } from "./rtl";
import { makeCapturedConsole, type ConsoleSink } from "./consoleCapture";
import { createHarness, runTree, type RunResult, type TestRow } from "./testHarness";

// Re-export so existing importers keep resolving these from "./testRunner".
export type { RunResult, TestRow };

const SELF_IMPORT_RE =
  /(?:from\s+["']|require\(\s*["'])(?:\.\/|\/)solution(?:\.[tj]sx?)?["']/;

// Compile the solution, then run its test file gated to `level`, all locally.
export async function runExercise(
  testCode: string,
  solutionCode: string,
  level: number,
  onConsole?: ConsoleSink,
  stylesCode?: string,
  learnerFiles?: LearnerFiles
): Promise<RunResult> {
  // Module-scoped pointer to the currently-running test's display name, set/cleared
  // by `walk` in `runTree` below. Console logs (including ones fired from top-level
  // module code, before any test runs) get stamped with its current value.
  const currentTest: { name?: string } = {};
  const capturedConsole = makeCapturedConsole("tests", onConsole, () => currentTest.name);
  // Drop learner CSS from the previous run so only currently-imported stylesheets
  // affect the graded DOM (matches the live preview).
  clearLearnerCss();
  if (SELF_IMPORT_RE.test(solutionCode)) {
    return {
      rows: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      compileError:
        "solution.tsx — solution code cannot import ./solution. Reset this exercise if solution.tsx is showing test or preview code.",
    };
  }

  let solutionExports: Record<string, unknown>;
  try {
    solutionExports = evalModule(
      transpile(solutionCode),
      makeRequire({
        css: stylesCode,
        learnerFiles,
        moduleGlobals: { console: capturedConsole },
      }),
      { console: capturedConsole }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { rows: [], passed: 0, failed: 0, skipped: 0, compileError: `solution.tsx — ${msg}` };
  }

  const harness = createHarness();
  const proc = { env: { LEVEL: String(level) } };
  const vi = makeVi();
  try {
    evalModule(transpile(testCode), makeRequire({ "./solution": solutionExports }), {
      ...harness.globals,
      expect,
      vi,
      jest: vi, // alias: some exercises are authored with jest.* instead of vi.*
      process: proc,
      console: capturedConsole,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { rows: [], passed: 0, failed: 0, skipped: 0, compileError: `tests — ${msg}` };
  }

  try {
    return await runTree(harness.root, currentTest, clearSandbox);
  } finally {
    vi.__restore(); // always restore real timers, even if a test forgot
  }
}
