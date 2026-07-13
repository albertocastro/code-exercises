# Exercise 21 — Async Primitives

**Difficulty:** Hard
**Estimated time:** 50–65 minutes
**Levels:** 4
**Goal:** Hand-roll the async coordination primitives that JavaScript doesn't give you —
a `Deferred`, a `Semaphore`, a `Mutex`, a back-pressured `AsyncQueue`, and the
combinators (`withTimeout`, `retry`, `mapLimit`) you build on top of them.

JS has no threads, so "concurrency" here means coordinating overlapping async work with
promises. These are the pieces interviewers pull out mid-problem ("okay, now make sure at
most 3 of these run at once", "now add a timeout"). Each level **builds on the previous
one**: the Mutex is a `Semaphore(1)`, and `mapLimit` is a `Semaphore(limit)`. Reuse your
own primitives rather than re-deriving the bookkeeping.

## How to run

```bash
# from the repo root (code-exercises/)
LEVEL=1 npm test -- exercise_21     # grade only Level 1
LEVEL=2 npm test -- exercise_21
LEVEL=3 npm test -- exercise_21
LEVEL=4 npm test -- exercise_21
npm test -- exercise_21             # grade everything (default)
```

All levels run cumulatively by default.

## The exports

```ts
interface Deferred<T> { promise: Promise<T>; resolve: (v: T) => void; reject: (e?: unknown) => void; }
function createDeferred<T>(): Deferred<T>;

class Semaphore {
  constructor(permits: number);
  get available(): number;
  acquire(): Promise<void>;
  release(): void;
}

class Mutex {
  get locked(): boolean;
  acquire(): Promise<() => void>;        // resolves with an idempotent release fn
  runExclusive<T>(fn: () => T | Promise<T>): Promise<T>;
}

class AsyncQueue<T> {
  constructor(capacity?: number);        // default Infinity
  get size(): number;                    // buffered items
  push(item: T): Promise<void>;
  pull(): Promise<T>;
  close(): void;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T>;
function retry<T>(fn: () => Promise<T>, options?: { retries?: number; onError?: (e: unknown, attempt: number) => void }): Promise<T>;
function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]>;
```

---

## Level 1 — Deferred + Semaphore

- `createDeferred()` returns `{ promise, resolve, reject }` where calling `resolve`/
  `reject` settles `promise` from the outside.
- `Semaphore(permits)`: `acquire()` resolves immediately while permits remain (and
  `available` drops); when none remain it waits. `release()` returns a permit. Blocked
  `acquire` calls must be resolved in **FIFO** order — a released permit goes to the
  **oldest** waiter, not a new caller.

## Level 2 — Mutex

A mutual-exclusion lock, naturally a `Semaphore(1)`.

- `acquire()` resolves with a **release function**. While held, another `acquire()` waits
  until release. `locked` reflects whether it's currently held.
- The release function is **idempotent**: calling it twice must not free an extra slot
  (a second waiter must still be waiting).
- `runExclusive(fn)` acquires, runs `fn`, and releases **even if `fn` throws**, returning
  `fn`'s result (or propagating its error). Overlapping `runExclusive` calls run one at a
  time, in order.

## Level 3 — AsyncQueue with backpressure

A bounded producer/consumer queue.

- `push(item)` resolves once the item is delivered or buffered. `pull()` resolves with the
  next item in **FIFO** order.
- When empty, `pull` **waits** for a push. When the buffer is at `capacity`, `push`
  **waits** for a pull to free a slot (this is the backpressure).
- A `capacity` of `0` means an **unbuffered** channel: every item is handed directly from a
  waiting pusher to a waiting puller.
- `close()` rejects all currently waiting pushers and pullers, but any **already-buffered**
  items remain drainable by later `pull`s; once drained, further `pull`s reject.
- `size` counts buffered items only (not waiting pushers).

## Level 4 — Combinators

Build these on the primitives above.

- `withTimeout(promise, ms)` resolves/rejects with `promise` if it settles within `ms`,
  otherwise rejects with a timeout `Error`. It must **not** leave a timer pending after the
  promise settles first.
- `retry(fn, { retries = 3, onError })` calls `fn`, and on rejection retries up to
  `retries` more times (so **`retries + 1` total calls**). It rejects with the **last**
  error. `onError(error, attempt)` fires after each failed attempt with the 0-based index.
- `mapLimit(items, limit, fn)` maps every item through `fn` running at most `limit` at
  once, returning results **in input order**. It **fails fast** — rejecting with the first
  error.

---

## Constraints & edge cases

- FIFO fairness is required wherever there are waiters (Semaphore, Mutex, AsyncQueue).
- The Mutex release function must be safe to call more than once.
- `withTimeout` is the only primitive that uses real time; the tests drive it with fake
  timers, so make sure the timeout path uses `setTimeout` and the success path clears it.
- `mapLimit` must preserve input→output index order regardless of completion order, and
  must never start more than `limit` tasks simultaneously.
- Levels run cumulatively; later primitives should reuse the earlier ones rather than
  duplicate their bookkeeping.
- Time limit: 6 seconds | Memory limit: 4 GB
