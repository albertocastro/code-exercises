// The postMessage contract between the parent (workerClient) and the Web Worker
// (testWorker). Everything here is plain, structured-clone-safe data: no
// functions, no Error objects, no DOM nodes, no live references. The worker
// flattens all of that to strings before anything crosses this boundary.

import type { ConsoleEntry } from "./consoleCapture";
import type { RunResult } from "./testHarness";

// Parent → worker: the one and only request. A fresh worker handles exactly one
// run then is discarded (terminate leaves no reusable state), so there is no id.
export interface RunRequest {
  testCode: string;
  solutionCode: string;
  level: number;
}

// worker → parent: a captured console line, streamed live as the tests log so the
// console panel updates just like the main-thread path. `entry` is the ConsoleEntry
// minus its `id` (the parent assigns ids), already string-flattened.
export interface ConsoleMessage {
  type: "console";
  entry: Omit<ConsoleEntry, "id">;
}

// worker → parent: the terminal result. `result` is a fully plain RunResult
// (rows with string errors + counts + optional compileError). This is the last
// message a worker sends before the parent discards it.
export interface ResultMessage {
  type: "result";
  result: RunResult;
}

export type WorkerOutbound = ConsoleMessage | ResultMessage;
