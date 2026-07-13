// Exercise 21 — Async Primitives. See README.md for the per-level spec.
// You implement the exports below. The tests import them by name, so keep the names
// and signatures; fill in the bodies. Later levels build ON these primitives — e.g.
// Mutex is naturally a Semaphore(1), and mapLimit is naturally a Semaphore(limit).

// ── Level 1: Deferred + Semaphore ─────────────────────────────────────────────

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

/**
 * Create a promise together with its `resolve`/`reject`, so they can be called
 * from outside the executor. (This is the building block for every wait below.)
 */
export function createDeferred<T>(): Deferred<T> {
  // TODO Level 1: capture resolve/reject out of a new Promise's executor.
  throw new Error("not implemented");
}

export class Semaphore {
  constructor(permits: number) {
    // TODO Level 1: store the permit count and prepare a FIFO waiter list.
  }

  /** Available permits right now. */
  get available(): number {
    // TODO Level 1: report the current permit count.
    return 0;
  }

  /**
   * Resolve once a permit is held. If one is free, take it immediately;
   * otherwise wait, and waiters must be released in FIFO order.
   */
  acquire(): Promise<void> {
    // TODO Level 1: fast path when a permit is free, else queue a waiter.
    throw new Error("not implemented");
  }

  /** Return a permit — handing it straight to the oldest waiter if there is one. */
  release(): void {
    // TODO Level 1: wake the oldest waiter, or increment the permit count.
  }
}

// ── Level 2: Mutex ────────────────────────────────────────────────────────────

export class Mutex {
  /** True while the lock is held. */
  get locked(): boolean {
    // TODO Level 2: reflect whether the lock is currently held.
    return false;
  }

  /**
   * Acquire the lock; resolve with a release function. The release function must
   * be idempotent — calling it more than once must not free an extra slot.
   */
  acquire(): Promise<() => void> {
    // TODO Level 2: build this on a Semaphore(1); return an idempotent release.
    throw new Error("not implemented");
  }

  /** Run `fn` under the lock, releasing even if `fn` throws. Returns `fn`'s result. */
  runExclusive<T>(fn: () => T | Promise<T>): Promise<T> {
    // TODO Level 2: acquire, run in try/finally, release, propagate result/error.
    throw new Error("not implemented");
  }
}

// ── Level 3: AsyncQueue with backpressure ─────────────────────────────────────

export class AsyncQueue<T> {
  constructor(capacity: number = Infinity) {
    // TODO Level 3: set up the buffer plus waiting-puller and waiting-pusher lists.
  }

  /** Number of buffered items (not counting waiting pushers). */
  get size(): number {
    // TODO Level 3: report buffered item count.
    return 0;
  }

  /**
   * Resolve once the item is delivered to a waiting consumer or buffered. If the
   * buffer is full, wait for a consumer to make room. Reject if the queue is closed.
   */
  push(item: T): Promise<void> {
    // TODO Level 3: hand off to a waiting puller, else buffer, else wait for space.
    throw new Error("not implemented");
  }

  /**
   * Resolve with the next item in FIFO order. If none is available, wait for a
   * push. Reject if the queue is closed and fully drained.
   */
  pull(): Promise<T> {
    // TODO Level 3: take from the buffer (letting a waiting pusher fill the slot),
    //   else take a handed-off item, else wait for a push.
    throw new Error("not implemented");
  }

  /** Close the queue: buffered items stay drainable; all current waiters reject. */
  close(): void {
    // TODO Level 3: mark closed and reject every waiting puller and pusher.
  }
}

// ── Level 4: Combinators ──────────────────────────────────────────────────────

/** Reject if `promise` has not settled within `ms`; clear the timer once it settles. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  // TODO Level 4: race the promise against a setTimeout; clear the timer on settle.
  throw new Error("not implemented");
}

export interface RetryOptions {
  /** Extra attempts after the first. Total calls = retries + 1. Default 3. */
  retries?: number;
  /** Called after each failed attempt with the error and 0-based attempt index. */
  onError?: (error: unknown, attempt: number) => void;
}

/** Call `fn`, retrying on rejection up to `retries` times; reject with the last error. */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  // TODO Level 4: loop attempts 0..retries; on failure record error + call onError.
  throw new Error("not implemented");
}

/**
 * Map `items` through `fn` with at most `limit` running at once. Results are in
 * input order. Fails fast: reject with the first error encountered.
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  // TODO Level 4: gate each task through a Semaphore(limit); write results[i] in place.
  throw new Error("not implemented");
}
