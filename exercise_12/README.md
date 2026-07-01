# Exercise 12 — Concurrent Work Queue

**Estimated time:** 55–70 minutes
**Levels:** 4
**Goal:** Build a small async work queue with bounded concurrency, retries,
cancellation, and timeout-safe terminal states.

## How to run

```bash
# from the repo root (code-exercises/)
LEVEL=1 npm test -- exercise_12        # run up to level 1
LEVEL=2 npm test -- exercise_12        # run up to level 2
LEVEL=1 npm run watch -- exercise_12   # watch mode, level 1 only
```

In the browser IDE, this exercise also has a LeetCode language toggle:
**JavaScript** uses `solution.ts`, and **Java** uses `WorkQueue.java`.
When Java is selected, `Main.java` is the manual runner/preview file. Use
`Run main` to stream `System.out.println` output into the Console while it runs.

To run the Java harness directly through the same Docker runtime used by the web IDE:

```bash
node scripts/runtime.mjs java-test exercise_12 1
```

---

## Background

Real services often need to accept work now and run it later without letting every
task execute at once. This exercise asks you to implement that kind of queue: callers
add async jobs, the queue starts them under a concurrency limit, and callers can
inspect each job's status.

The tricky part is not the data structure alone. Jobs finish out of order, failures
may retry, cancellation can happen before a job starts, and a promise can still
resolve after your queue has already timed it out. Your implementation must keep the
record for each job coherent through those races.

You'll build this export:

```ts
type JobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "timed_out";

interface JobRecord<T = unknown> {
  id: string;
  status: JobStatus;
  attempts: number;
  result?: T;
  error?: unknown;
}

interface WorkQueueOptions {
  maxConcurrency?: number;
  maxRetries?: number;
  timeoutMs?: number;
}

class WorkQueue<T = unknown> {
  constructor(options?: WorkQueueOptions);

  enqueue(id: string, work: () => Promise<T>): boolean;
  cancel(id: string): boolean;
  start(): void;
  drain(): Promise<void>;

  get(id: string): JobRecord<T> | undefined;
  getAll(): JobRecord<T>[];
  getStats(): Record<JobStatus, number>;
}
```

---

## Level 1 — Queue and status

Implement the basic queue lifecycle.

- `enqueue(id, work)` accepts a new job, stores it with status `"queued"`, and returns
  `true`.
- Duplicate ids are rejected: `enqueue` returns `false` and keeps the original job.
- `drain()` starts the queue, waits for all known jobs to become terminal, and resolves
  when no jobs are queued or running.
- A successful job ends as `"succeeded"` and stores its `result`.
- A rejected job ends as `"failed"` and stores its final `error`.
- `attempts` starts at `0` and increments each time the job's work function is called.
- `get(id)` returns the current record, or `undefined` for an unknown id.
- `getAll()` returns records in enqueue order.

## Level 2 — Concurrency limit

Add bounded parallelism.

- `maxConcurrency` defaults to `1`.
- `start()` begins running jobs but never runs more than `maxConcurrency` jobs at once.
- When a running job finishes, the next queued job starts as soon as capacity is
  available.
- Jobs may finish out of order. Results and statuses must stay attached to the correct
  job id.
- Jobs enqueued after `start()` should run when capacity is available.

## Level 3 — Retries and stats

Add retry behavior and queue introspection.

- `maxRetries` defaults to `0`.
- A failed job may run once initially plus up to `maxRetries` additional attempts.
- A job that eventually succeeds should end as `"succeeded"` with the successful result.
- A job that exhausts all retries should end as `"failed"` with the final error.
- `getStats()` returns a count for every status: `"queued"`, `"running"`,
  `"succeeded"`, `"failed"`, `"cancelled"`, and `"timed_out"`.

## Level 4 — Cancellation and timeouts

Add terminal-state safety.

- `cancel(id)` returns `true` only for a job that is still `"queued"`.
- Cancelling a queued job marks it `"cancelled"` and prevents its work function from
  running.
- `cancel(id)` returns `false` for unknown, running, succeeded, failed, cancelled, or
  timed-out jobs.
- If `timeoutMs` is provided, a running job that does not settle in time becomes
  `"timed_out"` and stores an `Error`.
- A promise that resolves or rejects after timeout must not overwrite the `"timed_out"`
  status, result, or error.
- `drain()` must still resolve once timeouts make all remaining running jobs terminal.

---

## Constraints

- `id` is a string and must be unique within one queue.
- `work` is a function returning a promise. It may resolve, reject, never settle, or
  throw synchronously.
- Terminal statuses are `"succeeded"`, `"failed"`, `"cancelled"`, and `"timed_out"`.
- `start()` is idempotent. Calling `drain()` also starts the queue.
- Levels run cumulatively. Later features must not change the meaning of the earlier
  queue lifecycle.
- Time limit: 6 seconds | Memory limit: 4 GB
