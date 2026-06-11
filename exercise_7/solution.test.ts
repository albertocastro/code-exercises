import { Cache as _Cache } from "./solution";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Cache = _Cache as any;

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

// ── Level 1: LRU Basics ────────────────────────────────────────────────────

level(1, "LRU basics", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cache: any;

  beforeEach(() => {
    cache = new Cache(2);
  });

  test("get returns undefined for missing key", () => {
    expect(cache.get("a")).toBeUndefined();
  });

  test("put then get returns the value", () => {
    cache.put("a", 1);
    expect(cache.get("a")).toBe(1);
  });

  test("put updates an existing key's value", () => {
    cache.put("a", 1);
    cache.put("a", 2);
    expect(cache.get("a")).toBe(2);
  });

  test("has returns true for present key without affecting recency", () => {
    cache.put("a", 1);
    cache.put("b", 2);
    expect(cache.has("a")).toBe(true);
    // "a" is now LRU (has() must not refresh it); filling capacity evicts "a"
    cache.put("c", 3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  test("has returns false for missing key", () => {
    expect(cache.has("z")).toBe(false);
  });

  test("size reflects number of entries", () => {
    expect(cache.size()).toBe(0);
    cache.put("a", 1);
    cache.put("b", 2);
    expect(cache.size()).toBe(2);
  });

  test("size never exceeds capacity", () => {
    cache.put("a", 1);
    cache.put("b", 2);
    cache.put("c", 3);
    expect(cache.size()).toBe(2);
  });

  test("put evicts the least-recently-used key when over capacity", () => {
    cache.put("a", 1);
    cache.put("b", 2);
    cache.put("c", 3); // evicts "a" (never touched again, "b" also untouched -> "a" inserted first)
    expect(cache.has("a")).toBe(false);
    expect(cache.has("b")).toBe(true);
    expect(cache.has("c")).toBe(true);
  });

  test("get refreshes recency, protecting a key from eviction", () => {
    cache.put("a", 1);
    cache.put("b", 2);
    cache.get("a"); // "a" becomes most-recently-used; "b" becomes LRU
    cache.put("c", 3); // evicts "b"
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
    expect(cache.has("c")).toBe(true);
  });

  test("updating a key via put refreshes its recency", () => {
    cache.put("a", 1);
    cache.put("b", 2);
    cache.put("a", 10); // "a" becomes most-recently-used; "b" becomes LRU
    cache.put("c", 3); // evicts "b"
    expect(cache.get("a")).toBe(10);
    expect(cache.has("b")).toBe(false);
    expect(cache.has("c")).toBe(true);
  });

  test("evicting and re-adding a key works correctly", () => {
    cache.put("a", 1);
    cache.put("b", 2);
    cache.put("c", 3); // evicts "a"
    cache.put("a", 100);
    expect(cache.get("a")).toBe(100);
    expect(cache.size()).toBe(2);
  });
});

// ── Level 2: TTL ───────────────────────────────────────────────────────────

level(2, "TTL", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cache: any;

  beforeEach(() => {
    cache = new Cache(2);
  });

  test("entry without ttl never expires", () => {
    cache.put("a", 1, undefined, 0);
    expect(cache.get("a", 1_000_000)).toBe(1);
    expect(cache.has("a", 1_000_000)).toBe(true);
  });

  test("get treats expired entry as missing", () => {
    cache.put("a", 1, 100, 0); // ttl 100ms, inserted at t=0
    expect(cache.get("a", 50)).toBe(1); // not yet expired
    expect(cache.get("a", 100)).toBeUndefined(); // now >= insertedAt + ttlMs
    expect(cache.get("a", 200)).toBeUndefined();
  });

  test("has treats expired entry as missing", () => {
    cache.put("a", 1, 100, 0);
    expect(cache.has("a", 99)).toBe(true);
    expect(cache.has("a", 100)).toBe(false);
  });

  test("isExpired returns false before expiry and true after", () => {
    cache.put("a", 1, 100, 0);
    expect(cache.isExpired("a", 50)).toBe(false);
    expect(cache.isExpired("a", 100)).toBe(true);
  });

  test("isExpired returns null for a key that was never present", () => {
    expect(cache.isExpired("nope", 1000)).toBeNull();
  });

  test("isExpired returns false for an entry with no ttl regardless of now", () => {
    cache.put("a", 1, undefined, 0);
    expect(cache.isExpired("a", 999_999_999)).toBe(false);
  });

  test("an expired-but-not-yet-evicted key is still 'present' for isExpired", () => {
    cache.put("a", 1, 100, 0);
    expect(cache.get("a", 200)).toBeUndefined(); // expired
    expect(cache.isExpired("a", 200)).toBe(true); // still present, just expired
  });

  test("get without a now argument never treats entries as expired", () => {
    cache.put("a", 1, 100, 0);
    expect(cache.get("a")).toBe(1);
    expect(cache.has("a")).toBe(true);
  });

  test("put with no ttl argument behaves like Level 1 (never expires)", () => {
    cache.put("a", 1);
    expect(cache.get("a", 999_999_999)).toBe(1);
  });
});

// ── Level 3: Frequency / LFU ───────────────────────────────────────────────

level(3, "Frequency / LFU", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cache: any;

  beforeEach(() => {
    cache = new Cache(2);
  });

  test("getFrequency returns 1 right after insertion", () => {
    cache.put("a", 1);
    expect(cache.getFrequency("a")).toBe(1);
  });

  test("getFrequency increases on get", () => {
    cache.put("a", 1);
    cache.get("a");
    cache.get("a");
    expect(cache.getFrequency("a")).toBe(3);
  });

  test("getFrequency increases on put of an existing key", () => {
    cache.put("a", 1);
    cache.put("a", 2);
    expect(cache.getFrequency("a")).toBe(2);
  });

  test("getFrequency returns null for a missing key", () => {
    expect(cache.getFrequency("nope")).toBeNull();
  });

  test("get on a missing key does not affect any frequency", () => {
    cache.put("a", 1);
    cache.get("z"); // miss
    expect(cache.getFrequency("a")).toBe(1);
  });

  test("eviction picks the least-frequently-used key", () => {
    cache.put("a", 1);
    cache.put("b", 2);
    cache.get("a"); // a: freq 2, b: freq 1
    cache.put("c", 3); // evicts "b" (lowest frequency)
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
    expect(cache.has("c")).toBe(true);
  });

  test("eviction breaks frequency ties using least-recently-used", () => {
    cache.put("a", 1);
    cache.put("b", 2);
    // both "a" and "b" have frequency 1; "a" is LRU (inserted first, never touched)
    cache.put("c", 3); // evicts "a"
    expect(cache.has("a")).toBe(false);
    expect(cache.has("b")).toBe(true);
    expect(cache.has("c")).toBe(true);
  });

  test("a frequently-used key survives multiple evictions", () => {
    cache.put("a", 1);
    cache.get("a");
    cache.get("a");
    cache.get("a"); // a has frequency 4
    cache.put("b", 2); // b: freq 1; evicts "b" immediately on next put
    cache.put("c", 3); // b has freq 1, c has freq 1; b is LRU -> evicts "b"
    expect(cache.has("a")).toBe(true);
  });

  test("touching the previously-LFU key changes the next eviction target", () => {
    cache.put("a", 1);
    cache.put("b", 2); // a: freq 1, b: freq 1, a is LRU
    cache.get("a"); // a: freq 2, b: freq 1 -> b now LFU
    cache.put("c", 3); // evicts "b"
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
    expect(cache.has("c")).toBe(true);
  });
});

// ── Level 4: Stats ─────────────────────────────────────────────────────────

level(4, "Stats", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cache: any;

  beforeEach(() => {
    cache = new Cache(2);
  });

  test("getStats starts at zero with hitRate 0", () => {
    expect(cache.getStats()).toEqual({ hits: 0, misses: 0, hitRate: 0 });
  });

  test("a successful get counts as a hit", () => {
    cache.put("a", 1);
    cache.get("a");
    expect(cache.getStats()).toEqual({ hits: 1, misses: 0, hitRate: 1 });
  });

  test("a get on a missing key counts as a miss", () => {
    cache.get("z");
    expect(cache.getStats()).toEqual({ hits: 0, misses: 1, hitRate: 0 });
  });

  test("a get on an expired key counts as a miss", () => {
    cache.put("a", 1, 100, 0);
    cache.get("a", 200); // expired -> miss
    expect(cache.getStats()).toEqual({ hits: 0, misses: 1, hitRate: 0 });
  });

  test("hitRate reflects cumulative hits and misses", () => {
    cache.put("a", 1);
    cache.get("a"); // hit
    cache.get("z"); // miss
    cache.get("a"); // hit
    cache.get("z"); // miss
    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(2);
    expect(stats.hitRate).toBe(0.5);
  });

  test("stats accumulate across evictions", () => {
    cache.put("a", 1);
    cache.put("b", 2);
    cache.put("c", 3); // evicts one of a/b
    cache.get("a");
    cache.get("b");
    cache.get("c");
    const stats = cache.getStats();
    expect(stats.hits + stats.misses).toBe(3);
    expect(stats.hitRate).toBeCloseTo(stats.hits / 3);
  });

  test("put does not affect hit/miss stats", () => {
    cache.put("a", 1);
    cache.put("b", 2);
    cache.put("c", 3);
    expect(cache.getStats()).toEqual({ hits: 0, misses: 0, hitRate: 0 });
  });
});
