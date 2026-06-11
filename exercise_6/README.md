# Exercise 6 — Rate Limiter

**Estimated time:** 30–40 minutes  
**Levels:** 4

## How to run

```bash
# from the repo root (code-exercises/)
LEVEL=1 npm test -- exercise_6
LEVEL=2 npm test -- exercise_6
LEVEL=1 npm run watch -- exercise_6
```

---

## Level 1 — Fixed Window

Implement a `RateLimiter` class.

```ts
class RateLimiter {
  configure(key: string, limit: number, windowMs: number): boolean
  // Registers `key` for fixed-window rate limiting
  // Returns false if `key` is already configured (by configure or configureBucket)

  allow(key: string, now: number): boolean
  // Returns false if `key` is not configured
  // The current fixed window is [floor(now / windowMs) * windowMs, +windowMs),
  // i.e. windows are aligned to epoch time, not to the first request
  // Returns false if `limit` requests have already been consumed in the
  // current window; otherwise consumes one slot and returns true

  getRemaining(key: string, now: number): number | null
  // Requests still available in the current window; null if not configured
}
```

**Examples:**

| Operations | Result |
|---|---|
| `configure("api", 3, 1000)` | `true` |
| `configure("api", 5, 2000)` | `false` (already configured) |
| `allow("api", 500)` → `allow("api", 600)` → `allow("api", 700)` | `true`, `true`, `true` |
| `allow("api", 999)` | `false` (still window `[0, 1000)`, limit reached) |
| `getRemaining("api", 999)` | `0` |
| `allow("api", 1000)` | `true` (new window `[1000, 2000)`) |
| `getRemaining("api", 1000)` | `2` |

---

## Level 2 — Window Introspection and Control

```ts
class RateLimiter {
  // ...previous methods...
  getResetTime(key: string, now: number): number | null
  // The ms timestamp at which the current window resets, i.e.
  // floor(now / windowMs) * windowMs + windowMs
  // null if not configured

  resetKey(key: string): boolean
  // Manually clears the current window's usage (as if no requests had been
  // made in this window); returns false if not configured

  getUsage(key: string, now: number): number | null
  // Number of requests consumed in the current window; null if not configured
}
```

**Examples:**

| Operations | Result |
|---|---|
| `getResetTime("api", 250)` | `1000` |
| `getResetTime("api", 1500)` | `2000` |
| `allow("api", 0)` → `getUsage("api", 0)` | `1` |
| `getUsage("api", 1000)` | `0` (new window) |
| `resetKey("api")` after using up the limit | `true`, and `allow` succeeds again immediately |

---

## Level 3 — Token Bucket

A second, independent rate-limiting strategy with its own key namespace and
its own configuration method. A given `key` may only be configured once,
**by either `configure` or `configureBucket`** — not both.

```ts
class RateLimiter {
  // ...previous methods...
  configureBucket(key: string, capacity: number, refillPerSecond: number): boolean
  // Registers `key` for token-bucket rate limiting, starting at full capacity
  // Returns false if `key` is already configured (by configure or configureBucket)

  allowBucket(key: string, now: number, cost?: number): boolean
  // Returns false if `key` is not configured (as a bucket)
  // Lazily refills tokens based on elapsed time since the last check
  // (elapsedSeconds * refillPerSecond), capped at `capacity`
  // `cost` defaults to 1
  // If at least `cost` tokens are available after refilling, consumes them
  // and returns true; otherwise leaves the bucket unchanged and returns false

  getTokens(key: string, now: number): number | null
  // Current token count after lazily refilling; null if not configured as a bucket
}
```

**Examples:**

| Operations | Result |
|---|---|
| `configureBucket("upload", 10, 2)` | `true` (capacity 10, refills 2 tokens/sec) |
| `getTokens("upload", 0)` | `10` |
| `allowBucket("upload", 0, 4)` | `true`; `getTokens("upload", 0)` → `6` |
| Drain to 0, then `getTokens("upload", 1000)` | `2` (1s × 2/sec refill) |
| `getTokens("upload", 5000)` from full | `10` (capped at capacity) |
| `configure("upload", 3, 1000)` | `false` (key already used by `configureBucket`) |

---

## Level 4 — Stats Across Both Systems

```ts
class RateLimiter {
  // ...previous methods...
  getStats(key: string): { allowed: number; denied: number } | null
  // Cumulative counts of allow/allowBucket calls for `key` since it was
  // configured (across both the fixed-window and token-bucket systems)
  // null if `key` was never configured by configure or configureBucket
  // resetKey does NOT reset these cumulative stats
}
```

**Examples:**

| Operations | Result |
|---|---|
| `getStats("unknown")` | `null` |
| `configure("api", 2, 1000)` then `getStats("api")` | `{ allowed: 0, denied: 0 }` |
| `allow` twice then a 3rd denied call, `getStats("api")` | `{ allowed: 2, denied: 1 }` |
| `allowBucket` calls on a bucket key | tracked in the same way via `getStats` |

---

## Constraints

- `limit`, `capacity` are always ≥ 1; `windowMs` and `refillPerSecond` are always > 0
- `now` values passed to a given key's methods are non-decreasing (time moves forward)
- `cost` for `allowBucket` is always ≥ 1 (when provided)
- `configure` and `configureBucket` share a single namespace of keys: a key
  used by one cannot later be used by the other
- `getResetTime` is purely a function of `now` and `windowMs` — it does not
  depend on whether any requests have been made
- `resetKey` only affects the current window's usage count (Level 1/2
  fixed-window state); it has no effect on token buckets and does not reset
  the cumulative stats from Level 4
- Time limit: 6 seconds | Memory limit: 4 GB
