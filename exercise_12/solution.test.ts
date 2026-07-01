import { WorkQueue as _WorkQueue } from "./solution";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WorkQueue = _WorkQueue as any;

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
};

// ── Level 1: Queue and status ────────────────────────────────────────────────

level(1, "Queue and status", () => {
  test("enqueue accepts a new job and records it as queued", () => {
    const queue = new WorkQueue();

    expect(queue.enqueue("job-1", async () => "done")).toBe(true);
    expect(queue.get("job-1")).toEqual({
      id: "job-1",
      status: "queued",
      attempts: 0,
    });
  });

  test("enqueue rejects duplicate ids without replacing the original job", async () => {
    const queue = new WorkQueue();

    expect(queue.enqueue("job-1", async () => "first")).toBe(true);
    expect(queue.enqueue("job-1", async () => "second")).toBe(false);

    await queue.drain();
    expect(queue.get("job-1")).toMatchObject({
      status: "succeeded",
      result: "first",
    });
  });

  test("drain starts queued jobs and stores successful results", async () => {
    const queue = new WorkQueue();

    queue.enqueue("job-1", async () => "alpha");
    await queue.drain();

    expect(queue.get("job-1")).toEqual({
      id: "job-1",
      status: "succeeded",
      attempts: 1,
      result: "alpha",
    });
  });

  test("failed jobs store their final error", async () => {
    const queue = new WorkQueue();
    const error = new Error("boom");

    queue.enqueue("job-1", async () => {
      throw error;
    });
    await queue.drain();

    expect(queue.get("job-1")).toEqual({
      id: "job-1",
      status: "failed",
      attempts: 1,
      error,
    });
  });

  test("get returns undefined for an unknown job", () => {
    const queue = new WorkQueue();

    expect(queue.get("missing")).toBeUndefined();
  });

  test("getAll returns records in enqueue order", async () => {
    const queue = new WorkQueue();

    queue.enqueue("a", async () => "A");
    queue.enqueue("b", async () => "B");
    await queue.drain();

    expect(queue.getAll().map((job: any) => job.id)).toEqual(["a", "b"]);
  });
});

// ── Level 2: Concurrency limit ───────────────────────────────────────────────

level(2, "Concurrency limit", () => {
  test("start runs no more than maxConcurrency jobs at once", () => {
    const queue = new WorkQueue({ maxConcurrency: 2 });
    const a = deferred<string>();
    const b = deferred<string>();
    const c = deferred<string>();
    const started: string[] = [];

    queue.enqueue("a", () => {
      started.push("a");
      return a.promise;
    });
    queue.enqueue("b", () => {
      started.push("b");
      return b.promise;
    });
    queue.enqueue("c", () => {
      started.push("c");
      return c.promise;
    });

    queue.start();

    expect(started).toEqual(["a", "b"]);
    expect(queue.get("a").status).toBe("running");
    expect(queue.get("b").status).toBe("running");
    expect(queue.get("c").status).toBe("queued");
  });

  test("starts the next queued job when a running slot opens", async () => {
    const queue = new WorkQueue({ maxConcurrency: 2 });
    const a = deferred<string>();
    const b = deferred<string>();
    const c = deferred<string>();
    const started: string[] = [];

    queue.enqueue("a", () => {
      started.push("a");
      return a.promise;
    });
    queue.enqueue("b", () => {
      started.push("b");
      return b.promise;
    });
    queue.enqueue("c", () => {
      started.push("c");
      return c.promise;
    });
    queue.start();

    b.resolve("B");
    await flushPromises();

    expect(started).toEqual(["a", "b", "c"]);
    expect(queue.get("b")).toMatchObject({ status: "succeeded", result: "B" });
    expect(queue.get("c").status).toBe("running");

    a.resolve("A");
    c.resolve("C");
    await queue.drain();
  });

  test("keeps results attached to the correct ids when jobs finish out of order", async () => {
    const queue = new WorkQueue({ maxConcurrency: 2 });
    const slow = deferred<string>();
    const fast = deferred<string>();

    queue.enqueue("slow", () => slow.promise);
    queue.enqueue("fast", () => fast.promise);
    queue.start();

    fast.resolve("fast-result");
    await flushPromises();
    slow.resolve("slow-result");
    await queue.drain();

    expect(queue.get("slow")).toMatchObject({ status: "succeeded", result: "slow-result" });
    expect(queue.get("fast")).toMatchObject({ status: "succeeded", result: "fast-result" });
  });

  test("jobs enqueued after start are scheduled when capacity is available", async () => {
    const queue = new WorkQueue({ maxConcurrency: 1 });
    const first = deferred<string>();
    const second = deferred<string>();
    const started: string[] = [];

    queue.enqueue("first", () => {
      started.push("first");
      return first.promise;
    });
    queue.start();
    queue.enqueue("second", () => {
      started.push("second");
      return second.promise;
    });

    expect(started).toEqual(["first"]);
    expect(queue.get("second").status).toBe("queued");

    first.resolve("one");
    await flushPromises();

    expect(started).toEqual(["first", "second"]);
    expect(queue.get("second").status).toBe("running");

    second.resolve("two");
    await queue.drain();
  });
});

// ── Level 3: Retries and stats ───────────────────────────────────────────────

level(3, "Retries and stats", () => {
  test("retries a failed job up to maxRetries and can eventually succeed", async () => {
    const queue = new WorkQueue({ maxRetries: 2 });
    let calls = 0;

    queue.enqueue("flaky", async () => {
      calls++;
      if (calls < 2) throw new Error("try again");
      return "ok";
    });

    await queue.drain();

    expect(calls).toBe(2);
    expect(queue.get("flaky")).toEqual({
      id: "flaky",
      status: "succeeded",
      attempts: 2,
      result: "ok",
    });
  });

  test("fails after the initial attempt plus maxRetries", async () => {
    const queue = new WorkQueue({ maxRetries: 2 });
    const finalError = new Error("still broken");
    let calls = 0;

    queue.enqueue("bad", async () => {
      calls++;
      throw calls === 3 ? finalError : new Error("not yet");
    });

    await queue.drain();

    expect(calls).toBe(3);
    expect(queue.get("bad")).toEqual({
      id: "bad",
      status: "failed",
      attempts: 3,
      error: finalError,
    });
  });

  test("does not retry when maxRetries is zero", async () => {
    const queue = new WorkQueue({ maxRetries: 0 });
    let calls = 0;

    queue.enqueue("bad", async () => {
      calls++;
      throw new Error("no retry");
    });

    await queue.drain();

    expect(calls).toBe(1);
    expect(queue.get("bad")).toMatchObject({ status: "failed", attempts: 1 });
  });

  test("getStats counts every job by its current status", async () => {
    const queue = new WorkQueue({ maxConcurrency: 1 });
    const hold = deferred<string>();

    queue.enqueue("running", () => hold.promise);
    queue.enqueue("queued", async () => "later");
    queue.start();

    expect(queue.getStats()).toEqual({
      queued: 1,
      running: 1,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      timed_out: 0,
    });

    hold.resolve("done");
    await queue.drain();

    expect(queue.getStats()).toMatchObject({
      queued: 0,
      running: 0,
      succeeded: 2,
    });
  });
});

// ── Level 4: Cancellation and timeouts ───────────────────────────────────────

level(4, "Cancellation and timeouts", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("cancel marks a queued job as cancelled and prevents it from running", async () => {
    const queue = new WorkQueue();
    const work = jest.fn(async () => "should not run");

    queue.enqueue("job-1", work);

    expect(queue.cancel("job-1")).toBe(true);
    await queue.drain();

    expect(work).not.toHaveBeenCalled();
    expect(queue.get("job-1")).toEqual({
      id: "job-1",
      status: "cancelled",
      attempts: 0,
    });
  });

  test("cancel returns false for running, terminal, and unknown jobs", async () => {
    const queue = new WorkQueue();
    const hold = deferred<string>();

    queue.enqueue("running", () => hold.promise);
    queue.start();

    expect(queue.cancel("running")).toBe(false);

    hold.resolve("done");
    await queue.drain();

    expect(queue.cancel("running")).toBe(false);
    expect(queue.cancel("missing")).toBe(false);
  });

  test("times out a running job after timeoutMs", async () => {
    jest.useFakeTimers();
    const queue = new WorkQueue({ timeoutMs: 50 });

    queue.enqueue("slow", () => new Promise<string>(() => {}));
    queue.start();

    expect(queue.get("slow").status).toBe("running");

    jest.advanceTimersByTime(50);
    await flushPromises();

    expect(queue.get("slow")).toMatchObject({
      id: "slow",
      status: "timed_out",
      attempts: 1,
    });
    expect(queue.get("slow").error).toBeInstanceOf(Error);
  });

  test("a late resolution after timeout does not overwrite the terminal status", async () => {
    jest.useFakeTimers();
    const queue = new WorkQueue({ timeoutMs: 25 });
    const slow = deferred<string>();

    queue.enqueue("slow", () => slow.promise);
    queue.start();

    jest.advanceTimersByTime(25);
    await flushPromises();
    slow.resolve("too late");
    await flushPromises();

    expect(queue.get("slow").status).toBe("timed_out");
    expect(queue.get("slow").result).toBeUndefined();
  });

  test("drain waits until timeout makes a running job terminal", async () => {
    jest.useFakeTimers();
    const queue = new WorkQueue({ timeoutMs: 10 });
    let drained = false;

    queue.enqueue("slow", () => new Promise<string>(() => {}));
    const done = queue.drain().then(() => {
      drained = true;
    });

    await flushPromises();
    expect(drained).toBe(false);

    jest.advanceTimersByTime(10);
    await done;

    expect(drained).toBe(true);
    expect(queue.get("slow").status).toBe("timed_out");
  });
});
