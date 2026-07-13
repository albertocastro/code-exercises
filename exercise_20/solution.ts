// Exercise 20 — Async Cache. See README.md for the per-level spec.
// You implement the class below. The tests import `AsyncCache` by name, so keep the
// name and the method signatures; fill in the bodies.

export interface AsyncCacheOptions {
  /** Entries older than this (ms) are stale. Absent → entries never expire. */
  ttlMs?: number;
  /**
   * Extra window (ms) past `ttlMs` during which a stale value is served
   * immediately while a background refresh runs. Absent → past `ttlMs` is a
   * hard miss (the caller awaits a fresh load).
   */
  staleMs?: number;
  /** Injectable clock for deterministic tests. Defaults to `Date.now`. */
  now?: () => number;
}

export class AsyncCache<K, V> {
  constructor(options: AsyncCacheOptions = {}) {
    // TODO Level 1: stash the options (ttlMs/staleMs/now) and set up your
    //   internal storage. Default the clock to `Date.now`.
  }

  /**
   * Return the cached value for `key`, or load it with `loader` on a miss.
   *
   * Level 1: on a miss, call `loader`, cache the resolved value, and return it;
   *   on a hit, return the cached value WITHOUT calling `loader`. A rejected
   *   load must NOT be cached (the next `get` retries).
   * Level 2: concurrent misses for the same key must share a SINGLE `loader`
   *   call — all callers resolve (or reject) from that one in-flight load.
   * Level 3: a value older than `ttlMs` is expired and must be reloaded.
   * Level 4: a value in `[ttlMs, ttlMs + staleMs)` is returned immediately while
   *   a single background refresh runs; older than that is a hard miss.
   */
  get(key: K, loader: () => Promise<V>): Promise<V> {
    // TODO Level 1: implement cache-aside (load on miss, serve on hit).
    // TODO Level 2: dedupe concurrent in-flight loads per key (single-flight).
    // TODO Level 4: serve stale immediately + refresh in the background.
    throw new Error("not implemented");
  }

  /**
   * Synchronous peek: the cached value if present and not hard-expired, else
   * `undefined`. Never triggers a load.
   */
  peek(key: K): V | undefined {
    // TODO Level 1: return the stored value (Level 3: honor expiry).
    return undefined;
  }

  /** Drop the cached value for `key` (an in-flight load still repopulates). */
  invalidate(key: K): void {
    // TODO Level 3: forget the entry for `key`.
  }

  /** Drop all cached values. */
  clear(): void {
    // TODO Level 3: forget every entry.
  }

  /** Count of live (non-hard-expired) cached entries. */
  size(): number {
    // TODO Level 1: number of cached entries (Level 3: exclude expired ones).
    return 0;
  }

  /** Running totals since construction. */
  getStats(): { hits: number; misses: number; loads: number } {
    // TODO Level 3: report cumulative hits, misses, and loader invocations.
    return { hits: 0, misses: 0, loads: 0 };
  }
}
