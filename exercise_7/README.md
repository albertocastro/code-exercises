# Exercise 7 — LRU/LFU Cache

**Estimated time:** 30–40 minutes
**Levels:** 4

## How to run

```bash
# from the repo root (code-exercises/)
LEVEL=1 npm test -- exercise_7
LEVEL=2 npm test -- exercise_7
LEVEL=1 npm run watch -- exercise_7
```

---

## Level 1 — LRU Basics

Implement a `Cache` class with a fixed capacity that evicts the
least-recently-used entry when full.

```ts
class Cache {
  constructor(capacity: number)

  get(key: string): any
  // Returns the stored value, or undefined if the key is not present.
  // Marks the key as most-recently-used.

  put(key: string, value: any): void
  // Inserts or updates the value for key.
  // If inserting a new key would exceed capacity, evicts the
  // least-recently-used key first.

  has(key: string): boolean
  // Returns whether the key is present. Does NOT affect recency.

  size(): number
  // Number of entries currently stored.
}
```

**Examples:** (`capacity = 2`)

| Operations | Result |
|---|---|
| `put("a", 1)` | — |
| `put("b", 2)` | — |
| `put("c", 3)` | evicts `"a"` (least recently used) |
| `has("a")` | `false` |
| `get("b")` | `2` |
| `put("a", 1); put("b", 2); get("a"); put("c", 3)` | evicts `"b"` (touching `"a"` made `"b"` the LRU) |

---

## Level 2 — TTL (Time To Live)

Entries can optionally expire after a given duration.

```ts
class Cache {
  // ...previous methods...

  put(key: string, value: any, ttlMs?: number, now?: number): void
  // ttlMs is an optional expiry duration in milliseconds, measured from `now`.
  // If ttlMs is omitted, the entry never expires (Level 1 behavior).
  // `now` is the current "time" (an integer); defaults are implementation-defined
  // but tests always pass `now` explicitly when ttlMs is set.

  get(key: string, now?: number): any
  // An entry is treated as expired (and therefore missing) if
  // now >= insertedAt + ttlMs.
  // Entries inserted without a ttl NEVER expire, regardless of `now`.
  // If `now` is omitted, no entry is ever treated as expired
  // (this keeps Level 1's get(key) calls working unchanged).

  has(key: string, now?: number): boolean
  // Same expiry rule as get — an expired entry is treated as not present.

  isExpired(key: string, now: number): boolean | null
  // Returns whether the entry would be considered expired at time `now`.
  // Returns null if the key is not present at all.
  // Note: a key that is expired but has not yet been evicted is still
  // "present" for the purposes of this check (it returns true, not null).
}
```

**Examples:**

| Operations | Result |
|---|---|
| `put("a", 1, 100, 0)` | inserted at t=0 with a 100ms TTL |
| `get("a", 50)` | `1` (not yet expired) |
| `get("a", 100)` | `undefined` (expired: `100 >= 0 + 100`) |
| `isExpired("a", 100)` | `true` (still present, just expired) |
| `isExpired("nope", 100)` | `null` (key never existed) |
| `put("b", 2)` (no ttl) | `get("b", 999999999)` → `2` |

---

## Level 3 — Frequency / LFU

Track how often each key has been "touched" and refine the eviction
policy to be frequency-aware.

```ts
class Cache {
  // ...previous methods...

  getFrequency(key: string): number | null
  // Number of successful get/put touches on that key since it was
  // (most recently) inserted. Returns null if the key is not present.
  // A successful put (insert or update) and a successful get each
  // increase the frequency by 1. A get that misses (key absent or
  // expired) does not affect any key's frequency.
}
```

**Refined eviction policy:** when `put` would exceed capacity, evict the
**least-frequently-used** key. Ties (equal frequency) are broken by
**least-recently-used**.

> **Note on Level 1 compatibility:** Level 1's tests are designed so that
> every key has equal frequency at the moment of eviction, so this
> refined policy degenerates to plain LRU for those tests — Level 1
> continues to pass unchanged.

**Examples:**

| Operations (`capacity = 2`) | Result |
|---|---|
| `put("a",1); put("b",2); get("a"); put("c",3)` | evicts `"b"` (frequency 1, vs `"a"`'s frequency 2) |
| `put("a",1); put("b",2); put("c",3)` | evicts `"a"` (both freq 1, `"a"` is LRU) |
| `getFrequency("a")` after `put("a",1); get("a"); get("a")` | `3` |
| `getFrequency("nope")` | `null` |

---

## Level 4 — Stats

```ts
class Cache {
  // ...previous methods...

  getStats(): { hits: number; misses: number; hitRate: number }
  // Cumulative across every get() call ever made on this cache.
  // A "hit" is a get() that finds a present, non-expired key.
  // A "miss" is any other get() (key absent, or expired).
  // hitRate = hits / (hits + misses), or 0 if no get() calls have been made yet.
  // put(), has(), and isExpired() do not affect these stats.
}
```

**Examples:**

| Operations | Result |
|---|---|
| `new Cache(2).getStats()` | `{ hits: 0, misses: 0, hitRate: 0 }` |
| `put("a",1); get("a"); get("z")` | `getStats()` → `{ hits: 1, misses: 1, hitRate: 0.5 }` |
| `put("a",1,100,0); get("a",200)` | counts as a miss (expired) |

---

## Constraints

- `capacity` is always ≥ 1.
- Keys are always strings; values may be of any type, including `undefined` (but tests do not store `undefined` as a value, since `get` returning `undefined` is used to signal "missing").
- `ttlMs` and `now`, when provided, are non-negative integers.
- `get(key)` and `has(key)` called without `now` never treat any entry as expired — this is what keeps Level 1 callers (which never pass `now`) working after Level 2 is implemented.
- Every successful `get` or `put` (insert or update) on a key increases that key's frequency counter by 1. Frequency is tracked from Level 3 onward but the underlying counter exists from the moment a key is first inserted.
- The eviction policy from Level 3 onward is: least-frequently-used first, ties broken by least-recently-used. Level 1 and Level 2 test scenarios are constructed so this is equivalent to plain LRU.
- Time limit: 6 seconds | Memory limit: 4 GB
