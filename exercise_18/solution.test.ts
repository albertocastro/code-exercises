import { crawl as _crawl, crawlSettled as _crawlSettled } from "./solution";

// The starter ships incomplete types/bodies; cast to any so the harness always
// compiles and we assert purely on runtime behavior.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const crawl = _crawl as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const crawlSettled = _crawlSettled as any;

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

// A promise whose resolution/rejection we control by hand. Resolving these in a
// chosen order is how every test below stays deterministic without real timers.
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // Safety net: mark the promise as handled so that a starter which never calls
  // fetchOne (and therefore never attaches its own handler) fails cleanly on the
  // assertions instead of crashing the worker with an unhandled rejection. The
  // real implementation still observes the rejection through its own handler.
  promise.catch(() => {});
  return { promise, resolve, reject };
}

// Let all currently-queued microtasks run. A handful of ticks drains the short
// promise chains the pool creates when a fetch settles and the next is
// scheduled. Freeing one slot can only start one more fetch, so flushing
// generously never masks a broken concurrency bound.
const flushPromises = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

const urls = (n: number) => Array.from({ length: n }, (_, i) => `u${i}`);

// ── Level 1: Ordered results ──────────────────────────────────────────────────

level(1, "Ordered results", () => {
  test("aligns results to input index even when fetches resolve out of order", async () => {
    const ds = urls(5).map(() => deferred<string>());
    const fetchOne = (_url: string, index: number) => ds[index].promise;

    const promise = crawl(urls(5), fetchOne, { concurrency: 5 });

    // Resolve in a scrambled order; the output must still be input-ordered.
    for (const i of [2, 0, 4, 1, 3]) ds[i].resolve(`r${i}`);

    await expect(promise).resolves.toEqual(["r0", "r1", "r2", "r3", "r4"]);
  });

  test("passes the url and its index to fetchOne", async () => {
    const fetchOne = jest.fn(async (url: string, index: number) => `${url}:${index}`);

    const results = await crawl(["a", "b"], fetchOne, { concurrency: 2 });

    expect(results).toEqual(["a:0", "b:1"]);
    expect(fetchOne).toHaveBeenCalledWith("a", 0);
    expect(fetchOne).toHaveBeenCalledWith("b", 1);
  });

  test("an empty url list resolves to an empty array without fetching", async () => {
    const fetchOne = jest.fn();

    await expect(crawl([], fetchOne, { concurrency: 3 })).resolves.toEqual([]);
    expect(fetchOne).not.toHaveBeenCalled();
  });
});

// ── Level 2: Bounded concurrency ──────────────────────────────────────────────

level(2, "Bounded concurrency", () => {
  test("never runs more than options.concurrency fetches at once", async () => {
    const ds = urls(5).map(() => deferred<string>());
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchOne = jest.fn((_url: string, index: number) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      return ds[index].promise.finally(() => {
        inFlight--;
      });
    });

    const promise = crawl(urls(5), fetchOne, { concurrency: 2 });

    // Only `concurrency` fetches may have started synchronously.
    expect(fetchOne).toHaveBeenCalledTimes(2);
    expect(inFlight).toBe(2);

    // The 3rd fetch must not start until a running fetch resolves.
    ds[0].resolve("r0");
    await flushPromises();
    expect(fetchOne).toHaveBeenCalledTimes(3);

    ds[1].resolve("r1");
    ds[2].resolve("r2");
    ds[3].resolve("r3");
    ds[4].resolve("r4");

    await expect(promise).resolves.toEqual(["r0", "r1", "r2", "r3", "r4"]);
    // The bound held for the whole crawl.
    expect(maxInFlight).toBe(2);
  });

  test("starts each queued url only as capacity frees up", async () => {
    const ds = urls(4).map(() => deferred<string>());
    const fetchOne = jest.fn((_url: string, index: number) => ds[index].promise);

    const promise = crawl(urls(4), fetchOne, { concurrency: 1 });

    // Concurrency 1: exactly one fetch runs at a time.
    expect(fetchOne).toHaveBeenCalledTimes(1);

    ds[0].resolve("r0");
    await flushPromises();
    expect(fetchOne).toHaveBeenCalledTimes(2);

    ds[1].resolve("r1");
    await flushPromises();
    expect(fetchOne).toHaveBeenCalledTimes(3);

    ds[2].resolve("r2");
    ds[3].resolve("r3");
    await expect(promise).resolves.toEqual(["r0", "r1", "r2", "r3"]);
  });
});

// ── Level 3: Fail-fast on first rejection ─────────────────────────────────────

level(3, "Fail-fast on first rejection", () => {
  test("rejects with the first error and schedules no new fetches", async () => {
    const ds = urls(5).map(() => deferred<string>());
    const fetchOne = jest.fn((_url: string, index: number) => ds[index].promise);
    const boom = new Error("boom");

    const promise = crawl(urls(5), fetchOne, { concurrency: 2 });

    // Indices 0 and 1 are in flight.
    expect(fetchOne).toHaveBeenCalledTimes(2);

    ds[0].reject(boom);
    await expect(promise).rejects.toBe(boom);

    // The still-in-flight url 1 may settle, but urls 2–4 must never be fetched.
    ds[1].resolve("r1");
    await flushPromises();

    expect(fetchOne).toHaveBeenCalledTimes(2);
    expect(fetchOne).not.toHaveBeenCalledWith("u2", 2);
    expect(fetchOne).not.toHaveBeenCalledWith("u3", 3);
    expect(fetchOne).not.toHaveBeenCalledWith("u4", 4);
  });
});

// ── Level 4: Settle semantics ─────────────────────────────────────────────────

level(4, "Settle semantics", () => {
  test("returns one ordered settled entry per input and never rejects", async () => {
    const ds = urls(5).map(() => deferred<string>());
    const fetchOne = jest.fn((_url: string, index: number) => ds[index].promise);
    const fail2 = new Error("fail-2");

    const promise = crawlSettled(urls(5), fetchOne, { concurrency: 2 });

    // Settle in a scrambled order with a mix of fulfil/reject. Each url is
    // already in flight before we settle it, so nothing goes unhandled.
    ds[0].resolve("r0");
    await flushPromises();
    ds[1].resolve("r1");
    await flushPromises();
    ds[2].reject(fail2);
    await flushPromises();
    ds[3].resolve("r3");
    await flushPromises();
    ds[4].resolve("r4");

    await expect(promise).resolves.toEqual([
      { status: "fulfilled", value: "r0" },
      { status: "fulfilled", value: "r1" },
      { status: "rejected", reason: fail2 },
      { status: "fulfilled", value: "r3" },
      { status: "fulfilled", value: "r4" },
    ]);
  });

  test("bounds concurrency and never rejects even when every fetch fails", async () => {
    const ds = urls(4).map(() => deferred<string>());
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchOne = jest.fn((_url: string, index: number) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      return ds[index].promise.finally(() => {
        inFlight--;
      });
    });

    const promise = crawlSettled(urls(4), fetchOne, { concurrency: 2 });

    // Unbounded would fetch all 4 up front; the pool starts only 2.
    expect(fetchOne).toHaveBeenCalledTimes(2);

    // Reject each url once it is in flight, freeing a slot for the next.
    ds[0].reject(new Error("e0"));
    await flushPromises();
    ds[1].reject(new Error("e1"));
    await flushPromises();
    ds[2].reject(new Error("e2"));
    await flushPromises();
    ds[3].reject(new Error("e3"));

    const results = await promise;

    expect(maxInFlight).toBe(2);
    expect(results.map((r: PromiseSettledResult<string>) => r.status)).toEqual([
      "rejected",
      "rejected",
      "rejected",
      "rejected",
    ]);
  });

  test("an empty url list resolves to an empty array", async () => {
    const fetchOne = jest.fn();

    await expect(crawlSettled([], fetchOne, { concurrency: 3 })).resolves.toEqual([]);
    expect(fetchOne).not.toHaveBeenCalled();
  });
});
