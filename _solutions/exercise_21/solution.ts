// Exercise 21 — Async Primitives. REFERENCE SOLUTION (not shipped to the IDE).
// Deferred + Semaphore → Mutex → AsyncQueue (backpressure) → combinators.

// ── Level 1: Deferred + Semaphore ─────────────────────────────────────────────

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

export function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export class Semaphore {
  private permits: number;
  private readonly waiters: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  /** Available permits right now. */
  get available(): number {
    return this.permits;
  }

  /** Resolves once a permit is held. Waiters are served FIFO. */
  acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => this.waiters.push(resolve));
  }

  /** Return a permit — handing it directly to the oldest waiter if any. */
  release(): void {
    const next = this.waiters.shift();
    if (next) {
      next(); // hand the permit straight to the waiter; count stays consumed
    } else {
      this.permits++;
    }
  }
}

// ── Level 2: Mutex ────────────────────────────────────────────────────────────

export class Mutex {
  private readonly sem = new Semaphore(1);
  private _locked = false;

  get locked(): boolean {
    return this._locked;
  }

  /** Acquire the lock; resolves with an idempotent release function. */
  async acquire(): Promise<() => void> {
    await this.sem.acquire();
    this._locked = true;
    let released = false;
    return () => {
      if (released) return; // idempotent: a double release must not over-grant
      released = true;
      this.sem.release();
      // If a waiter immediately took the freed permit, we're still locked (by them);
      // otherwise the permit is back and the mutex is free.
      this._locked = this.sem.available === 0;
    };
  }

  /** Run `fn` under the lock, releasing even if it throws. */
  async runExclusive<T>(fn: () => T | Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

// ── Level 3: AsyncQueue with backpressure ─────────────────────────────────────

interface PendingPush<T> {
  item: T;
  resolve: () => void;
  reject: (reason?: unknown) => void;
}

export class AsyncQueue<T> {
  private readonly buffer: T[] = [];
  private readonly pullers: Array<{
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
  }> = [];
  private readonly pushers: Array<PendingPush<T>> = [];
  private closed = false;

  constructor(private readonly capacity: number = Infinity) {}

  /** Number of buffered items (not counting waiting pushers). */
  get size(): number {
    return this.buffer.length;
  }

  /** Resolves once the item is delivered or buffered; rejects if the queue is closed. */
  push(item: T): Promise<void> {
    if (this.closed) return Promise.reject(new Error("queue closed"));

    const waiter = this.pullers.shift();
    if (waiter) {
      waiter.resolve(item); // hand straight to a waiting consumer
      return Promise.resolve();
    }
    if (this.buffer.length < this.capacity) {
      this.buffer.push(item);
      return Promise.resolve();
    }
    // full: wait for a consumer to make room
    return new Promise<void>((resolve, reject) => {
      this.pushers.push({ item, resolve, reject });
    });
  }

  /** Resolves with the next item (FIFO); rejects if closed and drained. */
  pull(): Promise<T> {
    if (this.buffer.length > 0) {
      const item = this.buffer.shift() as T;
      const pending = this.pushers.shift();
      if (pending) {
        this.buffer.push(pending.item); // freed slot goes to the oldest waiting pusher
        pending.resolve();
      }
      return Promise.resolve(item);
    }
    // buffer empty but a pusher is waiting (capacity 0 / unbuffered handoff)
    const pending = this.pushers.shift();
    if (pending) {
      pending.resolve();
      return Promise.resolve(pending.item);
    }
    if (this.closed) return Promise.reject(new Error("queue closed"));
    return new Promise<T>((resolve, reject) => {
      this.pullers.push({ resolve, reject });
    });
  }

  /** Close the queue: buffered items stay drainable; all waiters are rejected. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const p of this.pullers) p.reject(new Error("queue closed"));
    this.pullers.length = 0;
    for (const p of this.pushers) p.reject(new Error("queue closed"));
    this.pushers.length = 0;
  }
}

// ── Level 4: Combinators ──────────────────────────────────────────────────────

/** Reject if `promise` has not settled within `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
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
  const { retries = 3, onError } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (onError) onError(err, attempt);
    }
  }
  throw lastError;
}

/**
 * Map `items` through `fn` with at most `limit` running at once. Results are in
 * input order. Fails fast: rejects with the first error encountered.
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const sem = new Semaphore(limit);
  await Promise.all(
    items.map(async (item, i) => {
      await sem.acquire();
      try {
        results[i] = await fn(item, i);
      } finally {
        sem.release();
      }
    }),
  );
  return results;
}
