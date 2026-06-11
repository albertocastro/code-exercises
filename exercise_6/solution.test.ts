import { RateLimiter as _RateLimiter } from "./solution";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RateLimiter = _RateLimiter as any;

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

// ── Level 1: Fixed Window ──────────────────────────────────────────────────

level(1, "Fixed window", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let limiter: any;

  beforeEach(() => {
    limiter = new RateLimiter();
    limiter.configure("api", 3, 1000); // 3 requests per 1000ms window
  });

  test("configure returns true for new key", () => {
    expect(limiter.configure("other", 5, 1000)).toBe(true);
  });

  test("configure returns false for duplicate key", () => {
    expect(limiter.configure("api", 10, 5000)).toBe(false);
  });

  test("allow returns true while under limit", () => {
    expect(limiter.allow("api", 0)).toBe(true);
    expect(limiter.allow("api", 100)).toBe(true);
    expect(limiter.allow("api", 200)).toBe(true);
  });

  test("allow returns false once limit is exceeded in the same window", () => {
    limiter.allow("api", 0);
    limiter.allow("api", 100);
    limiter.allow("api", 200);
    expect(limiter.allow("api", 300)).toBe(false);
  });

  test("allow returns false for unconfigured key", () => {
    expect(limiter.allow("unknown", 0)).toBe(false);
  });

  test("allow resets count in a new fixed window", () => {
    limiter.allow("api", 0);
    limiter.allow("api", 100);
    limiter.allow("api", 200);
    expect(limiter.allow("api", 300)).toBe(false);
    // Next window starts at 1000
    expect(limiter.allow("api", 1000)).toBe(true);
  });

  test("windows are aligned to epoch, not to first request", () => {
    // First request at 500 — window is [0, 1000)
    expect(limiter.allow("api", 500)).toBe(true);
    expect(limiter.allow("api", 600)).toBe(true);
    expect(limiter.allow("api", 700)).toBe(true);
    // Still in window [0, 1000) — should be denied
    expect(limiter.allow("api", 999)).toBe(false);
    // New window [1000, 2000)
    expect(limiter.allow("api", 1000)).toBe(true);
  });

  test("getRemaining returns limit minus consumed in current window", () => {
    limiter.allow("api", 0);
    expect(limiter.getRemaining("api", 100)).toBe(2);
  });

  test("getRemaining returns full limit at start of a new window", () => {
    limiter.allow("api", 0);
    limiter.allow("api", 100);
    expect(limiter.getRemaining("api", 1000)).toBe(3);
  });

  test("getRemaining returns 0 when limit exhausted", () => {
    limiter.allow("api", 0);
    limiter.allow("api", 0);
    limiter.allow("api", 0);
    expect(limiter.getRemaining("api", 0)).toBe(0);
  });

  test("getRemaining returns null for unconfigured key", () => {
    expect(limiter.getRemaining("unknown", 0)).toBeNull();
  });

  test("multiple keys track independently", () => {
    limiter.configure("other", 1, 1000);
    expect(limiter.allow("api", 0)).toBe(true);
    expect(limiter.allow("other", 0)).toBe(true);
    expect(limiter.allow("other", 0)).toBe(false);
    expect(limiter.allow("api", 0)).toBe(true); // still has budget
  });
});

// ── Level 2: Window Introspection / Control ────────────────────────────────

level(2, "Window introspection and control", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let limiter: any;

  beforeEach(() => {
    limiter = new RateLimiter();
    limiter.configure("api", 3, 1000); // 3 requests per 1000ms window
  });

  test("getResetTime returns the end of the current window", () => {
    expect(limiter.getResetTime("api", 250)).toBe(1000);
  });

  test("getResetTime advances with new windows", () => {
    expect(limiter.getResetTime("api", 1500)).toBe(2000);
  });

  test("getResetTime returns null for unconfigured key", () => {
    expect(limiter.getResetTime("unknown", 0)).toBeNull();
  });

  test("getResetTime is independent of whether allow has been called", () => {
    // Per spec: window = [floor(now/windowMs)*windowMs, +windowMs), aligned to epoch
    expect(limiter.getResetTime("api", 999)).toBe(1000);
  });

  test("getUsage returns 0 with no requests yet", () => {
    expect(limiter.getUsage("api", 0)).toBe(0);
  });

  test("getUsage returns count of consumed requests in current window", () => {
    limiter.allow("api", 0);
    limiter.allow("api", 100);
    expect(limiter.getUsage("api", 200)).toBe(2);
  });

  test("getUsage returns 0 in a fresh window even if previous window was used", () => {
    limiter.allow("api", 0);
    limiter.allow("api", 0);
    expect(limiter.getUsage("api", 1000)).toBe(0);
  });

  test("getUsage returns null for unconfigured key", () => {
    expect(limiter.getUsage("unknown", 0)).toBeNull();
  });

  test("resetKey clears current window usage", () => {
    limiter.allow("api", 0);
    limiter.allow("api", 0);
    expect(limiter.resetKey("api")).toBe(true);
    expect(limiter.getUsage("api", 0)).toBe(0);
    expect(limiter.getRemaining("api", 0)).toBe(3);
  });

  test("resetKey allows full quota again immediately", () => {
    limiter.allow("api", 0);
    limiter.allow("api", 0);
    limiter.allow("api", 0);
    expect(limiter.allow("api", 0)).toBe(false);
    limiter.resetKey("api");
    expect(limiter.allow("api", 0)).toBe(true);
  });

  test("resetKey returns false for unconfigured key", () => {
    expect(limiter.resetKey("unknown")).toBe(false);
  });
});

// ── Level 3: Token Bucket ───────────────────────────────────────────────────

level(3, "Token bucket", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let limiter: any;

  beforeEach(() => {
    limiter = new RateLimiter();
    limiter.configureBucket("upload", 10, 2); // capacity 10, refill 2 tokens/sec
  });

  test("configureBucket returns true for new key", () => {
    expect(limiter.configureBucket("other", 5, 1)).toBe(true);
  });

  test("configureBucket returns false for duplicate bucket key", () => {
    expect(limiter.configureBucket("upload", 20, 5)).toBe(false);
  });

  test("configureBucket returns false if key already used by configure", () => {
    limiter.configure("api", 3, 1000);
    expect(limiter.configureBucket("api", 5, 1)).toBe(false);
  });

  test("configure returns false if key already used by configureBucket", () => {
    expect(limiter.configure("upload", 3, 1000)).toBe(false);
  });

  test("bucket starts full at capacity", () => {
    expect(limiter.getTokens("upload", 0)).toBe(10);
  });

  test("allowBucket consumes one token by default", () => {
    expect(limiter.allowBucket("upload", 0)).toBe(true);
    expect(limiter.getTokens("upload", 0)).toBe(9);
  });

  test("allowBucket consumes a custom cost", () => {
    expect(limiter.allowBucket("upload", 0, 4)).toBe(true);
    expect(limiter.getTokens("upload", 0)).toBe(6);
  });

  test("allowBucket returns false when not enough tokens", () => {
    expect(limiter.allowBucket("upload", 0, 11)).toBe(false);
    expect(limiter.getTokens("upload", 0)).toBe(10); // unchanged
  });

  test("allowBucket returns false for unconfigured key", () => {
    expect(limiter.allowBucket("unknown", 0)).toBe(false);
  });

  test("tokens refill lazily based on elapsed time", () => {
    // Drain the bucket
    for (let i = 0; i < 10; i++) limiter.allowBucket("upload", 0);
    expect(limiter.getTokens("upload", 0)).toBe(0);
    // 1 second later, refill at 2/sec -> 2 tokens
    expect(limiter.getTokens("upload", 1000)).toBe(2);
  });

  test("refill is capped at capacity", () => {
    // bucket starts full; wait 5 seconds (would refill 10 more tokens)
    expect(limiter.getTokens("upload", 5000)).toBe(10);
  });

  test("allowBucket refills before checking cost", () => {
    for (let i = 0; i < 10; i++) limiter.allowBucket("upload", 0);
    expect(limiter.allowBucket("upload", 0, 1)).toBe(false);
    // After 1 second, 2 tokens available
    expect(limiter.allowBucket("upload", 1000, 2)).toBe(true);
    expect(limiter.getTokens("upload", 1000)).toBe(0);
  });

  test("getTokens returns null for unconfigured key", () => {
    expect(limiter.getTokens("unknown", 0)).toBeNull();
  });
});

// ── Level 4: Stats ──────────────────────────────────────────────────────────

level(4, "Stats across both systems", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let limiter: any;

  beforeEach(() => {
    limiter = new RateLimiter();
    limiter.configure("api", 2, 1000);
    limiter.configureBucket("upload", 2, 1);
  });

  test("getStats returns null for never-configured key", () => {
    expect(limiter.getStats("unknown")).toBeNull();
  });

  test("getStats starts at zero counts", () => {
    expect(limiter.getStats("api")).toEqual({ allowed: 0, denied: 0 });
  });

  test("getStats counts allowed calls for fixed window", () => {
    limiter.allow("api", 0);
    limiter.allow("api", 100);
    expect(limiter.getStats("api")).toEqual({ allowed: 2, denied: 0 });
  });

  test("getStats counts denied calls for fixed window", () => {
    limiter.allow("api", 0);
    limiter.allow("api", 0);
    limiter.allow("api", 0); // denied
    limiter.allow("api", 0); // denied
    expect(limiter.getStats("api")).toEqual({ allowed: 2, denied: 2 });
  });

  test("getStats counts allowed and denied calls for token bucket", () => {
    limiter.allowBucket("upload", 0); // allowed, 1 token left
    limiter.allowBucket("upload", 0); // allowed, 0 tokens left
    limiter.allowBucket("upload", 0); // denied
    expect(limiter.getStats("upload")).toEqual({ allowed: 2, denied: 1 });
  });

  test("getStats persists across resetKey", () => {
    limiter.allow("api", 0);
    limiter.allow("api", 0);
    limiter.allow("api", 0); // denied
    limiter.resetKey("api");
    expect(limiter.getStats("api")).toEqual({ allowed: 2, denied: 1 });
  });

  test("getStats does not mix counts between different keys", () => {
    limiter.allow("api", 0);
    limiter.allowBucket("upload", 0);
    expect(limiter.getStats("api")).toEqual({ allowed: 1, denied: 0 });
    expect(limiter.getStats("upload")).toEqual({ allowed: 1, denied: 0 });
  });
});
