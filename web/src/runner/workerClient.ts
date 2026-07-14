import type { ConsoleSink } from "./consoleCapture";
import type { RunResult } from "./testHarness";
import type { RunRequest, WorkerOutbound } from "./workerProtocol";

// How long a single leetcode run may execute before the parent kills the worker.
// A correct solution finishes in a few ms; this only ever trips on an infinite
// loop or a runaway allocation.
export const RUN_TIMEOUT_MS = 5000;

export interface WorkerRun {
  // Always resolves (never rejects) so the caller renders every outcome — results,
  // timeout, user-stop, or worker crash — through the same RunResult path.
  promise: Promise<RunResult>;
  // Kill the in-flight worker now. `reason` tunes the surfaced message:
  // "user" → the Stop button; "cancel" → a newer run superseded this one (silent).
  terminate: (reason?: "user" | "cancel") => void;
}

function stoppedResult(message: string): RunResult {
  return { rows: [], passed: 0, failed: 0, skipped: 0, compileError: message };
}

// Run a plain-TS exercise in a FRESH Web Worker. Whichever happens first wins:
// a result message (clear the timer, resolve) or the hard timeout (terminate the
// worker, resolve with a timed-out error). The worker is always torn down before
// the promise settles, so nothing leaks between runs.
export function runExerciseInWorker(
  testCode: string,
  solutionCode: string,
  level: number,
  onConsole?: ConsoleSink,
  learnerFiles?: Record<string, string>,
  timeoutMs: number = RUN_TIMEOUT_MS
): WorkerRun {
  const worker = new Worker(new URL("./testWorker.ts", import.meta.url), { type: "module" });

  let settled = false;
  let resolveResult!: (result: RunResult) => void;
  const promise = new Promise<RunResult>((resolve) => {
    resolveResult = resolve;
  });

  const cleanup = () => {
    window.clearTimeout(timer);
    worker.terminate();
  };

  const settle = (result: RunResult) => {
    if (settled) return;
    settled = true;
    cleanup();
    resolveResult(result);
  };

  const timer = window.setTimeout(() => {
    settle(
      stoppedResult(
        `execution timed out (>${Math.round(timeoutMs / 1000)}s) and was stopped — check for an infinite loop.`
      )
    );
  }, timeoutMs);

  worker.onmessage = (event: MessageEvent<WorkerOutbound>) => {
    const msg = event.data;
    if (msg.type === "console") {
      onConsole?.(msg.entry);
    } else if (msg.type === "result") {
      settle(msg.result);
    }
  };

  // A hard crash inside the worker (syntax error in a worker dep, etc.) surfaces
  // as an error event rather than a result message.
  worker.onerror = (event) => {
    event.preventDefault?.();
    settle(stoppedResult(`worker error — ${event.message || "the test runner crashed."}`));
  };

  const terminate = (reason: "user" | "cancel" = "user") => {
    settle(
      stoppedResult(
        reason === "user" ? "execution stopped." : "run cancelled — a newer run started."
      )
    );
  };

  // Kick off the run. Handlers + timer are already armed above, so a result or a
  // timeout can win from here on.
  const request: RunRequest = { testCode, solutionCode, level, learnerFiles };
  worker.postMessage(request);

  return { promise, terminate };
}
