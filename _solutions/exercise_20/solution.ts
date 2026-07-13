// Exercise 20 — Async Cache. REFERENCE SOLUTION (not shipped to the IDE).
// Cache-aside → single-flight dedupe → TTL → stale-while-revalidate.

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

interface Entry<V> {
  value: V;
  storedAt: number;
}

export class AsyncCache<K, V> {
  private readonly ttlMs?: number;
  private readonly staleMs?: number;
  private readonly clock: () => number;

  private readonly entries = new Map<K, Entry<V>>();
  private readonly inflight = new Map<K, Promise<V>>();
  private stats = { hits: 0, misses: 0, loads: 0 };

  constructor(options: AsyncCacheOptions = {}) {
    this.ttlMs = options.ttlMs;
    this.staleMs = options.staleMs;
    this.clock = options.now ?? Date.now;
  }

  /**
   * Return the cached value for `key`, or load it with `loader` on a miss.
   * Concurrent misses for the same key share a single `loader` call.
   */
  get(key: K, loader: () => Promise<V>): Promise<V> {
    const entry = this.entries.get(key);
    if (entry) {
      const age = this.clock() - entry.storedAt;
      if (this.ttlMs === undefined || age < this.ttlMs) {
        this.stats.hits++;
        return Promise.resolve(entry.value); // fresh
      }
      if (this.staleMs !== undefined && age < this.ttlMs + this.staleMs) {
        this.stats.hits++;
        void this.load(key, loader).catch(() => {}); // stale: refresh in background
        return Promise.resolve(entry.value);
      }
      // hard-expired: fall through to a foreground load
    }
    this.stats.misses++;
    return this.load(key, loader);
  }

  /** Synchronous peek: the value if present and not hard-expired, else undefined. */
  peek(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    return this.isLive(entry) ? entry.value : undefined;
  }

  /** Drop the cached value for `key` (an in-flight load still repopulates). */
  invalidate(key: K): void {
    this.entries.delete(key);
  }

  /** Drop all cached values. */
  clear(): void {
    this.entries.clear();
  }

  /** Count of live (non-hard-expired) cached entries. */
  size(): number {
    let n = 0;
    for (const entry of this.entries.values()) if (this.isLive(entry)) n++;
    return n;
  }

  getStats(): { hits: number; misses: number; loads: number } {
    return { ...this.stats };
  }

  private isLive(entry: Entry<V>): boolean {
    if (this.ttlMs === undefined) return true;
    const max = this.ttlMs + (this.staleMs ?? 0);
    return this.clock() - entry.storedAt < max;
  }

  private load(key: K, loader: () => Promise<V>): Promise<V> {
    const existing = this.inflight.get(key);
    if (existing) return existing;

    this.stats.loads++;
    let base: Promise<V>;
    try {
      base = Promise.resolve(loader());
    } catch (err) {
      base = Promise.reject(err);
    }
    const p = base.then(
      (value) => {
        this.entries.set(key, { value, storedAt: this.clock() });
        this.inflight.delete(key);
        return value;
      },
      (err) => {
        this.inflight.delete(key); // failures are NOT cached
        throw err;
      },
    );
    this.inflight.set(key, p);
    return p;
  }
}
