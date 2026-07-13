import { AsyncCache as _AsyncCache } from "./solution";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AsyncCache = _AsyncCache as any;

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

// A hand-driven clock so TTL behavior is deterministic (no real time / fake timers).
function fakeClock(start = 0) {
  let t = start;
  const now = () => t;
  const advance = (ms: number) => {
    t += ms;
  };
  return { now, advance };
}

// ── Level 1: Cache-aside ──────────────────────────────────────────────────────

level(1, "Cache-aside", () => {
  test("loads on a miss and returns the loaded value", async () => {
    const cache = new AsyncCache();
    const loader = jest.fn(async () => "value");

    await expect(cache.get("k", loader)).resolves.toBe("value");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  test("serves a cached value on a hit without calling the loader again", async () => {
    const cache = new AsyncCache();
    const loader = jest.fn(async () => "value");

    await cache.get("k", loader);
    await expect(cache.get("k", loader)).resolves.toBe("value");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  test("caches per key independently", async () => {
    const cache = new AsyncCache();
    await cache.get("a", async () => "A");
    await cache.get("b", async () => "B");

    expect(cache.peek("a")).toBe("A");
    expect(cache.peek("b")).toBe("B");
    expect(cache.size()).toBe(2);
  });

  test("peek returns undefined for an unknown key and does not load", () => {
    const cache = new AsyncCache();
    const loader = jest.fn(async () => "value");

    expect(cache.peek("missing")).toBeUndefined();
    expect(loader).not.toHaveBeenCalled();
  });

  test("a rejected load is not cached — the next get retries", async () => {
    const cache = new AsyncCache();
    const loader = jest
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("recovered");

    await expect(cache.get("k", loader)).rejects.toThrow("boom");
    expect(cache.peek("k")).toBeUndefined();
    await expect(cache.get("k", loader)).resolves.toBe("recovered");
    expect(loader).toHaveBeenCalledTimes(2);
  });
});

// ── Level 2: Single-flight dedupe ─────────────────────────────────────────────

level(2, "Single-flight dedupe", () => {
  test("concurrent misses for the same key share one loader call", async () => {
    const cache = new AsyncCache();
    const d = deferred<string>();
    const loader = jest.fn(() => d.promise);

    const p1 = cache.get("k", loader);
    const p2 = cache.get("k", loader);
    const p3 = cache.get("k", loader);

    expect(loader).toHaveBeenCalledTimes(1);

    d.resolve("shared");
    await expect(Promise.all([p1, p2, p3])).resolves.toEqual([
      "shared",
      "shared",
      "shared",
    ]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  test("different keys load concurrently and independently", async () => {
    const cache = new AsyncCache();
    const a = deferred<string>();
    const b = deferred<string>();

    const pa = cache.get("a", () => a.promise);
    const pb = cache.get("b", () => b.promise);

    b.resolve("B");
    a.resolve("A");
    await expect(Promise.all([pa, pb])).resolves.toEqual(["A", "B"]);
  });

  test("once an in-flight load settles, a later get starts a fresh load", async () => {
    const cache = new AsyncCache();
    const d1 = deferred<string>();
    const loader = jest.fn().mockReturnValueOnce(d1.promise).mockResolvedValueOnce("second");

    const p1 = cache.get("k", loader);
    d1.resolve("first");
    await p1;

    // cached now — no new load
    await expect(cache.get("k", loader)).resolves.toBe("first");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  test("all concurrent callers reject when the shared load fails, and nothing is cached", async () => {
    const cache = new AsyncCache();
    const d = deferred<string>();
    const loader = jest.fn(() => d.promise);

    const p1 = cache.get("k", loader);
    const p2 = cache.get("k", loader);
    expect(loader).toHaveBeenCalledTimes(1);

    d.reject(new Error("shared failure"));
    await expect(p1).rejects.toThrow("shared failure");
    await expect(p2).rejects.toThrow("shared failure");
    expect(cache.peek("k")).toBeUndefined();
  });
});

// ── Level 3: TTL expiry ───────────────────────────────────────────────────────

level(3, "TTL expiry", () => {
  test("a value within its TTL is a hit", async () => {
    const clock = fakeClock();
    const cache = new AsyncCache({ ttlMs: 100, now: clock.now });
    const loader = jest.fn(async () => "value");

    await cache.get("k", loader);
    clock.advance(50);
    await expect(cache.get("k", loader)).resolves.toBe("value");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  test("an expired value reloads (expiry is inclusive at exactly ttlMs)", async () => {
    const clock = fakeClock();
    const cache = new AsyncCache({ ttlMs: 100, now: clock.now });
    const loader = jest
      .fn()
      .mockResolvedValueOnce("old")
      .mockResolvedValueOnce("new");

    await cache.get("k", loader);
    clock.advance(100);
    await expect(cache.get("k", loader)).resolves.toBe("new");
    expect(loader).toHaveBeenCalledTimes(2);
    expect(cache.peek("k")).toBe("new");
  });

  test("peek and size treat an expired entry as gone", async () => {
    const clock = fakeClock();
    const cache = new AsyncCache({ ttlMs: 100, now: clock.now });
    await cache.get("k", async () => "value");

    expect(cache.size()).toBe(1);
    clock.advance(100);
    expect(cache.peek("k")).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  test("invalidate forces a reload; clear empties the cache", async () => {
    const cache = new AsyncCache({ ttlMs: 1000 });
    const loader = jest
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");

    await cache.get("k", loader);
    cache.invalidate("k");
    await expect(cache.get("k", loader)).resolves.toBe("second");
    expect(loader).toHaveBeenCalledTimes(2);

    cache.clear();
    expect(cache.peek("k")).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  test("getStats counts hits, misses, and loader invocations", async () => {
    const cache = new AsyncCache({ ttlMs: 1000 });
    const loader = jest.fn(async () => "value");

    await cache.get("k", loader); // miss + load
    await cache.get("k", loader); // hit
    await cache.get("k", loader); // hit

    expect(cache.getStats()).toEqual({ hits: 2, misses: 1, loads: 1 });
  });
});

// ── Level 4: Stale-while-revalidate ───────────────────────────────────────────

level(4, "Stale-while-revalidate", () => {
  test("within the stale window, get returns the stale value immediately and refreshes in the background", async () => {
    const clock = fakeClock();
    const cache = new AsyncCache({ ttlMs: 100, staleMs: 100, now: clock.now });
    const loader = jest
      .fn()
      .mockResolvedValueOnce("v1")
      .mockResolvedValueOnce("v2");

    await cache.get("k", loader); // v1 cached
    clock.advance(120); // now stale (100 <= age < 200)

    await expect(cache.get("k", loader)).resolves.toBe("v1"); // served stale immediately
    expect(loader).toHaveBeenCalledTimes(2); // background refresh kicked off

    await flushPromises();
    expect(cache.peek("k")).toBe("v2"); // refreshed
  });

  test("a single stale read triggers only one background refresh even under concurrency", async () => {
    const clock = fakeClock();
    const cache = new AsyncCache({ ttlMs: 100, staleMs: 100, now: clock.now });
    const d = deferred<string>();
    const loader = jest
      .fn()
      .mockResolvedValueOnce("v1")
      .mockReturnValueOnce(d.promise);

    await cache.get("k", loader);
    clock.advance(120);

    await cache.get("k", loader);
    await cache.get("k", loader);
    await cache.get("k", loader);
    expect(loader).toHaveBeenCalledTimes(2); // 1 initial + 1 refresh, not 4

    d.resolve("v2");
    await flushPromises();
    expect(cache.peek("k")).toBe("v2");
  });

  test("past the stale window the read is a hard miss and awaits a fresh load", async () => {
    const clock = fakeClock();
    const cache = new AsyncCache({ ttlMs: 100, staleMs: 100, now: clock.now });
    const loader = jest
      .fn()
      .mockResolvedValueOnce("v1")
      .mockResolvedValueOnce("v2");

    await cache.get("k", loader);
    clock.advance(200); // age == ttl + stale → hard-expired

    expect(cache.peek("k")).toBeUndefined();
    await expect(cache.get("k", loader)).resolves.toBe("v2");
  });

  test("if the background refresh fails, the stale value keeps being served until hard expiry", async () => {
    const clock = fakeClock();
    const cache = new AsyncCache({ ttlMs: 100, staleMs: 100, now: clock.now });
    const loader = jest
      .fn()
      .mockResolvedValueOnce("v1")
      .mockRejectedValueOnce(new Error("refresh failed"));

    await cache.get("k", loader);
    clock.advance(120);

    await expect(cache.get("k", loader)).resolves.toBe("v1"); // stale served
    await flushPromises(); // background refresh rejects (swallowed)

    expect(cache.peek("k")).toBe("v1"); // still serving stale, not evicted
  });
});
