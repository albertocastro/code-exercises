// Reference solution for Exercise 12 — Concurrent Work Queue.

export type JobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "timed_out";

export interface JobRecord<T = unknown> {
  id: string;
  status: JobStatus;
  attempts: number;
  result?: T;
  error?: unknown;
}

export interface WorkQueueOptions {
  maxConcurrency?: number;
  maxRetries?: number;
  timeoutMs?: number;
}

type WorkFn<T> = () => Promise<T>;

interface InternalJob<T> extends JobRecord<T> {
  work: WorkFn<T>;
}

const STATUSES: JobStatus[] = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "timed_out",
];

export class WorkQueue<T = unknown> {
  private readonly maxConcurrency: number;
  private readonly maxRetries: number;
  private readonly timeoutMs?: number;
  private readonly jobs = new Map<string, InternalJob<T>>();
  private readonly queue: string[] = [];
  private readonly waiters: Array<() => void> = [];
  private running = 0;
  private started = false;

  constructor(options: WorkQueueOptions = {}) {
    this.maxConcurrency = Math.max(1, Math.floor(options.maxConcurrency ?? 1));
    this.maxRetries = Math.max(0, Math.floor(options.maxRetries ?? 0));
    if (options.timeoutMs !== undefined) {
      this.timeoutMs = Math.max(0, options.timeoutMs);
    }
  }

  enqueue(id: string, work: WorkFn<T>): boolean {
    if (this.jobs.has(id)) return false;

    this.jobs.set(id, {
      id,
      work,
      status: "queued",
      attempts: 0,
    });
    this.queue.push(id);
    this.pump();
    return true;
  }

  cancel(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job || job.status !== "queued") return false;

    job.status = "cancelled";
    this.pump();
    this.resolveWaitersIfIdle();
    return true;
  }

  start(): void {
    this.started = true;
    this.pump();
    this.resolveWaitersIfIdle();
  }

  drain(): Promise<void> {
    this.start();
    if (this.isIdle()) return Promise.resolve();
    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }

  get(id: string): JobRecord<T> | undefined {
    const job = this.jobs.get(id);
    return job ? this.snapshot(job) : undefined;
  }

  getAll(): JobRecord<T>[] {
    return Array.from(this.jobs.values(), (job) => this.snapshot(job));
  }

  getStats(): Record<JobStatus, number> {
    const stats = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<
      JobStatus,
      number
    >;
    for (const job of this.jobs.values()) {
      stats[job.status]++;
    }
    return stats;
  }

  private pump(): void {
    if (!this.started) return;

    while (this.running < this.maxConcurrency && this.queue.length > 0) {
      const id = this.queue.shift()!;
      const job = this.jobs.get(id);
      if (!job || job.status !== "queued") continue;
      this.run(job);
    }

    this.resolveWaitersIfIdle();
  }

  private run(job: InternalJob<T>): void {
    job.status = "running";
    job.attempts++;
    this.running++;

    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const finishAttempt = () => {
      if (timeout !== undefined) clearTimeout(timeout);
      this.running--;
      this.pump();
      this.resolveWaitersIfIdle();
    };

    if (this.timeoutMs !== undefined) {
      timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        job.status = "timed_out";
        job.error = new Error(`Job ${job.id} timed out`);
        finishAttempt();
      }, this.timeoutMs);
    }

    let promise: Promise<T>;
    try {
      promise = Promise.resolve(job.work());
    } catch (error) {
      promise = Promise.reject(error);
    }

    promise.then(
      (result) => {
        if (settled) return;
        settled = true;
        job.status = "succeeded";
        job.result = result;
        delete job.error;
        finishAttempt();
      },
      (error) => {
        if (settled) return;
        settled = true;
        if (job.attempts <= this.maxRetries) {
          job.status = "queued";
          this.queue.push(job.id);
        } else {
          job.status = "failed";
          job.error = error;
        }
        finishAttempt();
      },
    );
  }

  private snapshot(job: InternalJob<T>): JobRecord<T> {
    const { id, status, attempts, result, error } = job;
    const record: JobRecord<T> = { id, status, attempts };
    if ("result" in job) record.result = result;
    if ("error" in job) record.error = error;
    return record;
  }

  private isIdle(): boolean {
    if (this.running > 0) return false;
    return !this.queue.some((id) => this.jobs.get(id)?.status === "queued");
  }

  private resolveWaitersIfIdle(): void {
    if (!this.isIdle()) return;
    const waiters = this.waiters.splice(0);
    for (const resolve of waiters) resolve();
  }
}
