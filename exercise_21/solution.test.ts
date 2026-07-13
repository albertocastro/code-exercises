import {
  createDeferred as _createDeferred,
  Semaphore as _Semaphore,
  Mutex as _Mutex,
  AsyncQueue as _AsyncQueue,
  withTimeout as _withTimeout,
  retry as _retry,
  mapLimit as _mapLimit,
} from "./solution";

/* eslint-disable @typescript-eslint/no-explicit-any */
const createDeferred = _createDeferred as any;
const Semaphore = _Semaphore as any;
const Mutex = _Mutex as any;
const AsyncQueue = _AsyncQueue as any;
const withTimeout = _withTimeout as any;
const retry = _retry as any;
const mapLimit = _mapLimit as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

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

// ── Level 1: Deferred + Semaphore ─────────────────────────────────────────────

level(1, "Deferred + Semaphore", () => {
  test("createDeferred exposes a promise that its resolve settles", async () => {
    const d = createDeferred();
    let settled = false;
    d.promise.then(() => {
      settled = true;
    });

    await flushPromises();
    expect(settled).toBe(false);

    d.resolve(42);
    await expect(d.promise).resolves.toBe(42);
  });

  test("createDeferred can reject externally", async () => {
    const d = createDeferred();
    d.reject(new Error("nope"));
    await expect(d.promise).rejects.toThrow("nope");
  });

  test("acquire resolves immediately while permits remain, decrementing available", async () => {
    const sem = new Semaphore(2);
    expect(sem.available).toBe(2);

    await sem.acquire();
    expect(sem.available).toBe(1);
    await sem.acquire();
    expect(sem.available).toBe(0);
  });

  test("acquire blocks when no permits remain and resolves on release", async () => {
    const sem = new Semaphore(1);
    await sem.acquire();

    let acquired = false;
    const pending = sem.acquire().then(() => {
      acquired = true;
    });

    await flushPromises();
    expect(acquired).toBe(false);

    sem.release();
    await pending;
    expect(acquired).toBe(true);
  });

  test("waiters are served in FIFO order", async () => {
    const sem = new Semaphore(1);
    await sem.acquire();

    const order: string[] = [];
    sem.acquire().then(() => order.push("a"));
    sem.acquire().then(() => order.push("b"));
    sem.acquire().then(() => order.push("c"));

    await flushPromises();
    expect(order).toEqual([]);

    sem.release();
    await flushPromises();
    expect(order).toEqual(["a"]);

    sem.release();
    await flushPromises();
    expect(order).toEqual(["a", "b"]);

    sem.release();
    await flushPromises();
    expect(order).toEqual(["a", "b", "c"]);
  });

  test("releasing with no waiters returns a permit", async () => {
    const sem = new Semaphore(1);
    await sem.acquire();
    expect(sem.available).toBe(0);
    sem.release();
    expect(sem.available).toBe(1);
  });
});

// ── Level 2: Mutex ────────────────────────────────────────────────────────────

level(2, "Mutex", () => {
  test("only one holder at a time; the next waiter proceeds after release", async () => {
    const mutex = new Mutex();
    const release1 = await mutex.acquire();
    expect(mutex.locked).toBe(true);

    let got2 = false;
    let release2: (() => void) | undefined;
    const pending = mutex.acquire().then((r: () => void) => {
      got2 = true;
      release2 = r;
    });

    await flushPromises();
    expect(got2).toBe(false);

    release1();
    await pending;
    expect(got2).toBe(true);
    release2!();
    expect(mutex.locked).toBe(false);
  });

  test("the release function is idempotent — a double call does not over-grant", async () => {
    const mutex = new Mutex();
    const release1 = await mutex.acquire();
    release1();
    release1(); // must be a no-op

    await mutex.acquire(); // takes the single permit

    let extra = false;
    mutex.acquire().then(() => {
      extra = true;
    });
    await flushPromises();
    expect(extra).toBe(false); // the double-release did not free an extra slot
  });

  test("runExclusive returns the function result", async () => {
    const mutex = new Mutex();
    await expect(mutex.runExclusive(async () => 7)).resolves.toBe(7);
  });

  test("runExclusive releases the lock even when the function throws", async () => {
    const mutex = new Mutex();
    await expect(
      mutex.runExclusive(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(mutex.locked).toBe(false);
    // lock is usable again
    await expect(mutex.runExclusive(async () => "ok")).resolves.toBe("ok");
  });

  test("runExclusive serializes overlapping critical sections", async () => {
    const mutex = new Mutex();
    const d1 = deferred<void>();
    const order: string[] = [];

    const p1 = mutex.runExclusive(async () => {
      order.push("1:start");
      await d1.promise;
      order.push("1:end");
    });
    const p2 = mutex.runExclusive(async () => {
      order.push("2:start");
    });

    await flushPromises();
    expect(order).toEqual(["1:start"]); // second section is blocked

    d1.resolve();
    await Promise.all([p1, p2]);
    expect(order).toEqual(["1:start", "1:end", "2:start"]);
  });
});

// ── Level 3: AsyncQueue with backpressure ─────────────────────────────────────

level(3, "AsyncQueue with backpressure", () => {
  test("pull waits until a push provides an item", async () => {
    const queue = new AsyncQueue();
    let got: string | undefined;
    const pending = queue.pull().then((v: string) => {
      got = v;
    });

    await flushPromises();
    expect(got).toBeUndefined();

    await queue.push("x");
    await pending;
    expect(got).toBe("x");
  });

  test("buffered items come out in FIFO order", async () => {
    const queue = new AsyncQueue();
    await queue.push("a");
    await queue.push("b");
    expect(queue.size).toBe(2);

    await expect(queue.pull()).resolves.toBe("a");
    await expect(queue.pull()).resolves.toBe("b");
    expect(queue.size).toBe(0);
  });

  test("push blocks when the buffer is full and unblocks when a slot frees", async () => {
    const queue = new AsyncQueue(1);
    await queue.push("a"); // buffer now full

    let pushed = false;
    const pending = queue.push("b").then(() => {
      pushed = true;
    });

    await flushPromises();
    expect(pushed).toBe(false);
    expect(queue.size).toBe(1);

    await expect(queue.pull()).resolves.toBe("a"); // frees a slot
    await pending;
    expect(pushed).toBe(true);
    expect(queue.size).toBe(1); // "b" is now buffered
    await expect(queue.pull()).resolves.toBe("b");
  });

  test("a waiting consumer receives a handed-off item directly", async () => {
    const queue = new AsyncQueue(0); // unbuffered channel
    const got: number[] = [];
    queue.pull().then((v: number) => got.push(v));

    await flushPromises();
    await queue.push(1);
    await flushPromises();
    expect(got).toEqual([1]);
  });

  test("close rejects waiting pullers but leaves buffered items drainable", async () => {
    const queue = new AsyncQueue();
    await queue.push("buffered");

    const waiting = new AsyncQueue();
    const pending = waiting.pull();

    waiting.close();
    await expect(pending).rejects.toThrow(/closed/);

    queue.close();
    await expect(queue.pull()).resolves.toBe("buffered"); // drained after close
    await expect(queue.pull()).rejects.toThrow(/closed/); // then closed
  });
});

// ── Level 4: Combinators ──────────────────────────────────────────────────────

level(4, "Combinators", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("withTimeout rejects when the promise does not settle in time", async () => {
    jest.useFakeTimers();
    const never = new Promise(() => {});
    const assertion = expect(withTimeout(never, 50)).rejects.toThrow(/timed out/i);

    jest.advanceTimersByTime(50);
    await assertion;
  });

  test("withTimeout resolves and cancels the timer when the promise settles first", async () => {
    jest.useFakeTimers();
    await expect(withTimeout(Promise.resolve("ok"), 50)).resolves.toBe("ok");
    // no timers should be left pending
    expect(jest.getTimerCount()).toBe(0);
  });

  test("retry succeeds after transient failures", async () => {
    let calls = 0;
    const fn = jest.fn(async () => {
      calls++;
      if (calls < 3) throw new Error("transient");
      return "ok";
    });

    await expect(retry(fn, { retries: 3 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test("retry exhausts attempts then rejects with the last error", async () => {
    const fn = jest.fn(async () => {
      throw new Error("always");
    });

    await expect(retry(fn, { retries: 2 })).rejects.toThrow("always");
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  test("retry with retries:0 calls the function exactly once", async () => {
    const fn = jest.fn(async () => {
      throw new Error("x");
    });
    await expect(retry(fn, { retries: 0 })).rejects.toThrow("x");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("retry reports each failure through onError with its attempt index", async () => {
    const attempts: number[] = [];
    const fn = async () => {
      throw new Error("e");
    };
    await expect(
      retry(fn, { retries: 2, onError: (_e: unknown, a: number) => attempts.push(a) }),
    ).rejects.toThrow();
    expect(attempts).toEqual([0, 1, 2]);
  });

  test("mapLimit preserves input order and never exceeds the concurrency limit", async () => {
    const items = [0, 1, 2, 3];
    const gates = items.map(() => deferred<number>());
    const started: number[] = [];
    const fn = (item: number, i: number) => {
      started.push(i);
      return gates[i].promise;
    };

    const result = mapLimit(items, 2, fn);

    await flushPromises();
    expect(started).toEqual([0, 1]); // capped at 2

    gates[0].resolve(10);
    await flushPromises();
    expect(started).toEqual([0, 1, 2]); // freed slot starts the next

    gates[1].resolve(11);
    await flushPromises();
    expect(started).toEqual([0, 1, 2, 3]);

    gates[2].resolve(12);
    gates[3].resolve(13);
    await expect(result).resolves.toEqual([10, 11, 12, 13]); // input order
  });

  test("mapLimit fails fast on the first rejection", async () => {
    const items = [0, 1, 2];
    const fn = async (x: number) => {
      if (x === 1) throw new Error("boom");
      return x;
    };
    await expect(mapLimit(items, 3, fn)).rejects.toThrow("boom");
  });
});
