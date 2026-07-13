# Exercise 20 — Async Cache

**Difficulty:** Hard
**Estimated time:** 45–60 minutes
**Levels:** 4
**Goal:** Build a caching layer that wraps an async loader — cache-aside, then
**single-flight** request deduplication, then TTL expiry, then stale-while-revalidate.

This is the "wrap a slow async function in a cache" problem that shows up constantly in
real services (and interviews). The interesting part is not the map — it's the
**concurrency**: what happens when ten callers ask for the same missing key at the same
instant, and how a value transitions through fresh → stale → expired over time.

Read all four levels **before** you start. The representation you pick in Level 1 (how you
track an in-flight load separately from a stored value) is what makes Levels 2 and 4 easy
or painful.

## How to run

```bash
# from the repo root (code-exercises/)
LEVEL=1 npm test -- exercise_20     # grade only Level 1
LEVEL=2 npm test -- exercise_20
LEVEL=3 npm test -- exercise_20
LEVEL=4 npm test -- exercise_20
npm test -- exercise_20             # grade everything (default)
```

All levels run cumulatively by default — a later level may never break an earlier
level's contract.

## The contract

You implement one class. The signatures below are what the tests call — keep them exactly.

```ts
interface AsyncCacheOptions {
  ttlMs?: number;   // absent → entries never expire
  staleMs?: number; // absent → past ttlMs is a hard miss
  now?: () => number; // injectable clock; defaults to Date.now
}

class AsyncCache<K, V> {
  constructor(options?: AsyncCacheOptions);

  get(key: K, loader: () => Promise<V>): Promise<V>;
  peek(key: K): V | undefined;   // synchronous, never loads
  invalidate(key: K): void;
  clear(): void;
  size(): number;                // live (non-hard-expired) entries
  getStats(): { hits: number; misses: number; loads: number };
}
```

The tests drive time through the injected `now` and drive loads through hand-resolved
promises, so everything is deterministic — no real timers.

---

## Level 1 — Cache-aside

- On a **miss**, call `loader`, store the resolved value, and return it.
- On a **hit**, return the stored value **without calling `loader`**.
- Each key is cached independently.
- `peek` returns the stored value, or `undefined` for an unknown key, and never loads.
- A **rejected** load must **not** be cached: `peek` stays `undefined` and the next `get`
  calls `loader` again.

## Level 2 — Single-flight dedupe

When several `get` calls for the **same key** happen while a load is already in flight,
they must all share **one** `loader` invocation.

- Concurrent misses for one key ⇒ `loader` is called **exactly once**; every caller
  resolves with that one result.
- If the shared load **rejects**, every waiting caller rejects, and nothing is cached
  (the next `get` retries).
- Different keys still load concurrently and independently.
- Once an in-flight load settles, the key is no longer "in flight" — a later miss starts a
  fresh load.

## Level 3 — TTL expiry

Add `ttlMs` and cache introspection.

- A stored value is **fresh** while its age is `< ttlMs`, and **expired** once its age is
  `>= ttlMs` (expiry is inclusive at exactly `ttlMs`). An expired key is a miss and
  reloads.
- `peek` and `size` treat an expired entry as gone.
- `invalidate(key)` drops one entry; `clear()` drops all.
- `getStats()` returns cumulative `hits`, `misses`, and `loads` (loader invocations).
  A served cached value counts as a hit; a foreground load counts as a miss; each actual
  `loader` call counts as one load.

## Level 4 — Stale-while-revalidate

Add `staleMs`. A value's age now falls into three bands:

- `age < ttlMs` → **fresh**: served as a hit, no load.
- `ttlMs <= age < ttlMs + staleMs` → **stale**: return the stale value **immediately**
  (a hit) **and** kick off a background refresh. The refresh reuses your single-flight
  machinery — many stale reads in a row trigger at most **one** refresh.
- `age >= ttlMs + staleMs` → **hard-expired**: a miss; the caller awaits a fresh load, and
  `peek` returns `undefined`.

If a background refresh **fails**, keep serving the existing stale value (don't evict it)
until it hard-expires.

---

## Constraints & edge cases

- `get` always returns a promise, even on a hit.
- The clock only moves forward within a test; `now` may be called as often as you like.
- A background refresh must never reject the caller that triggered it, and must not
  produce an unhandled rejection.
- `invalidate`/`clear` only forget stored values; a load already in flight may still
  populate the cache when it settles.
- Levels run cumulatively. With no `ttlMs`, entries never expire; with no `staleMs`, there
  is no stale band (past `ttlMs` is a hard miss).
- Time limit: 6 seconds | Memory limit: 4 GB
