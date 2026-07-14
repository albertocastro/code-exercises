// Web Worker entry for plain-TS (leetcode) exercises. The transpile + eval +
// test-run path that used to run on the browser main thread runs HERE instead, so
// a learner's `while(true)` or runaway allocation freezes only this worker — which
// the parent kills with `worker.terminate()` — never the UI tab.
//
// A fresh worker handles exactly ONE run and is then discarded by the parent
// (terminate leaves no reusable state), so there is no per-run bookkeeping here.
//
// Nothing in this module's import graph touches the DOM: it deliberately does NOT
// import ./modules (which pulls in React + rtl.ts, whose top-level
// document.createElement would crash the worker) or ./rtl. React/DOM exercises
// stay on the main-thread path and never reach this file.

import { transpile } from "./transpile";
import { evalModule } from "./evalModule";
import { makeLearnerRequire, type LearnerFiles } from "./learnerModules";
import { createHarness, runTree } from "./testHarness";
import { expect, makeVi } from "./expectSetup";
import { makeCapturedConsole } from "./consoleCapture";
import type { RunRequest, WorkerOutbound } from "./workerProtocol";

// Solution code must not import ./solution (that's a sign the file holds test or
// preview code by mistake) — same guard as the main-thread runner.
const SELF_IMPORT_RE =
  /(?:from\s+["']|require\(\s*["'])(?:\.\/|\/)solution(?:\.[tj]sx?)?["']/;

// DOM-free module resolver for leetcode. `locals` covers exact specifiers the
// runner injects (e.g. "./solution"); `learnerFiles` lets the solution or test
// `import "./helper"` a same-folder file the learner created. Learner .ts/.tsx
// files are transpiled + evaluated through this same require (with a cache + cycle
// guard, see makeLearnerRequire). Anything unresolved throws the exact same message
// the main-thread sandbox uses, so error text is unchanged.
function makeWorkerRequire(
  locals: Record<string, unknown> = {},
  learnerFiles: LearnerFiles = {},
  moduleGlobals: Record<string, unknown> = {}
): (name: string) => unknown {
  const base = (name: string): unknown => {
    if (name in locals) return locals[name];
    // CSS imports are a no-op side effect in the sandbox (leetcode has no styles).
    if (name.endsWith(".css")) return {};
    throw new Error(`Module not available in the exercise sandbox: "${name}"`);
  };
  // No learner files → keep the original minimal resolver (no extra work/allocs).
  if (Object.keys(learnerFiles).length === 0) return base;
  return makeLearnerRequire({ learnerFiles, fallback: base, moduleGlobals });
}

function post(message: WorkerOutbound) {
  (self as unknown as Worker).postMessage(message);
}

function runRequest(req: RunRequest) {
  const { testCode, solutionCode, level } = req;
  const learnerFiles: LearnerFiles = req.learnerFiles ?? {};

  // Module-scoped pointer to the running test's name; console lines get stamped
  // with it and streamed live to the parent (same attribution as main thread).
  const currentTest: { name?: string } = {};
  const capturedConsole = makeCapturedConsole(
    "tests",
    (entry) => post({ type: "console", entry }),
    () => currentTest.name
  );

  if (SELF_IMPORT_RE.test(solutionCode)) {
    post({
      type: "result",
      result: {
        rows: [],
        passed: 0,
        failed: 0,
        skipped: 0,
        compileError:
          "solution.tsx — solution code cannot import ./solution. Reset this exercise if solution.tsx is showing test or preview code.",
      },
    });
    return;
  }

  let solutionExports: Record<string, unknown>;
  try {
    solutionExports = evalModule(
      transpile(solutionCode),
      makeWorkerRequire({}, learnerFiles, { console: capturedConsole }),
      { console: capturedConsole }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    post({
      type: "result",
      result: { rows: [], passed: 0, failed: 0, skipped: 0, compileError: `solution.tsx — ${msg}` },
    });
    return;
  }

  const harness = createHarness();
  const proc = { env: { LEVEL: String(level) } };
  const vi = makeVi();
  try {
    evalModule(
      transpile(testCode),
      makeWorkerRequire({ "./solution": solutionExports }, learnerFiles, {
        console: capturedConsole,
      }),
      {
        ...harness.globals,
        expect,
        vi,
        jest: vi, // alias: some exercises are authored with jest.* instead of vi.*
        process: proc,
        console: capturedConsole,
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    post({
      type: "result",
      result: { rows: [], passed: 0, failed: 0, skipped: 0, compileError: `tests — ${msg}` },
    });
    return;
  }

  // No DOM sandbox in a worker, so the per-test cleanup is a no-op.
  runTree(harness.root, currentTest, () => {})
    .then((result) => post({ type: "result", result }))
    .catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      post({
        type: "result",
        result: { rows: [], passed: 0, failed: 0, skipped: 0, compileError: `tests — ${msg}` },
      });
    })
    .finally(() => vi.__restore());
}

self.addEventListener("message", (event: MessageEvent<RunRequest>) => {
  runRequest(event.data);
});
