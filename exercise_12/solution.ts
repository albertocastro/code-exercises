// Exercise 12 — Concurrent Work Queue. See README.md for the per-level spec.
// You implement the WorkQueue class below. The tests import these exported names,
// so keep the names and signatures; fill in the behavior level by level.

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

export class WorkQueue<T = unknown> {
  constructor(options: WorkQueueOptions = {}) {
    // TODO Level 2: store normalized queue options such as maxConcurrency.
    // TODO Level 3: store maxRetries.
    // TODO Level 4: store timeoutMs.
    void options;
  }

  /**
   * Add a job to the queue.
   *
   * Returns true when the id is accepted. Duplicate ids should return false and
   * must not replace the original job.
   */
  enqueue(id: string, work: WorkFn<T>): boolean {
    // TODO Level 1: store a queued job record and its work function.
    // TODO Level 2: if the queue has already started, schedule it when capacity exists.
    void id;
    void work;
    return false;
  }

  /**
   * Cancel a job only if it is still queued.
   */
  cancel(id: string): boolean {
    // TODO Level 4: mark queued jobs as cancelled and prevent them from running.
    void id;
    return false;
  }

  /**
   * Start running queued jobs. Calling start more than once should be safe.
   */
  start(): void {
    // TODO Level 1: start queued work.
    // TODO Level 2: enforce maxConcurrency while starting work.
  }

  /**
   * Start the queue and resolve once every known job is terminal.
   */
  drain(): Promise<void> {
    // TODO Level 1: wait for queued/running jobs to finish.
    // TODO Level 4: make sure timed-out jobs allow drain() to resolve.
    return Promise.resolve();
  }

  /**
   * Return the current record for a job id, or undefined when the id is unknown.
   */
  get(id: string): JobRecord<T> | undefined {
    // TODO Level 1: look up a job record by id.
    void id;
    return undefined;
  }

  /**
   * Return every job record in enqueue order.
   */
  getAll(): JobRecord<T>[] {
    // TODO Level 1: return records in insertion order.
    return [];
  }

  /**
   * Count jobs by current status. The returned object should include every status
   * key, even when its count is zero.
   */
  getStats(): Record<JobStatus, number> {
    // TODO Level 3: count all records by status.
    return {
      queued: 0,
      running: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      timed_out: 0,
    };
  }
}
