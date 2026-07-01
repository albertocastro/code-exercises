// Exercise 12 — Concurrent Work Queue. See README.md for the per-level spec.
// Implement WorkQueue below. The Java tests compile this file directly, so keep
// these class and method names.

import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;
import java.util.concurrent.CompletableFuture;

enum JobStatus {
  QUEUED,
  RUNNING,
  SUCCEEDED,
  FAILED,
  CANCELLED,
  TIMED_OUT
}

class JobRecord<T> {
  public final String id;
  public JobStatus status;
  public int attempts;
  public T result;
  public Throwable error;

  JobRecord(String id) {
    this.id = id;
    this.status = JobStatus.QUEUED;
    this.attempts = 0;
  }
}

class WorkQueueOptions {
  public Integer maxConcurrency;
  public Integer maxRetries;
  public Long timeoutMs;

  public WorkQueueOptions maxConcurrency(int value) {
    this.maxConcurrency = value;
    return this;
  }

  public WorkQueueOptions maxRetries(int value) {
    this.maxRetries = value;
    return this;
  }

  public WorkQueueOptions timeoutMs(long value) {
    this.timeoutMs = value;
    return this;
  }
}

public class WorkQueue<T> {
  public WorkQueue() {
    this(new WorkQueueOptions());
  }

  public WorkQueue(WorkQueueOptions options) {
    // TODO Level 2: store normalized queue options such as maxConcurrency.
    // TODO Level 3: store maxRetries.
    // TODO Level 4: store timeoutMs.
  }

  /**
   * Add a job to the queue.
   *
   * Return true when the id is accepted. Duplicate ids should return false and
   * must not replace the original job.
   */
  public boolean enqueue(String id, Supplier<CompletableFuture<T>> work) {
    // TODO Level 1: store a queued job record and its work supplier.
    // TODO Level 2: if the queue has already started, schedule it when capacity exists.
    return false;
  }

  /**
   * Cancel a job only if it is still queued.
   */
  public boolean cancel(String id) {
    // TODO Level 4: mark queued jobs as cancelled and prevent them from running.
    return false;
  }

  /**
   * Start running queued jobs. Calling start more than once should be safe.
   */
  public void start() {
    // TODO Level 1: start queued work.
    // TODO Level 2: enforce maxConcurrency while starting work.
  }

  /**
   * Start the queue and complete once every known job is terminal.
   */
  public CompletableFuture<Void> drain() {
    // TODO Level 1: wait for queued/running jobs to finish.
    // TODO Level 4: make sure timed-out jobs allow drain() to complete.
    return CompletableFuture.completedFuture(null);
  }

  /**
   * Return the current record for a job id, or null when the id is unknown.
   */
  public JobRecord<T> get(String id) {
    // TODO Level 1: look up a job record by id.
    return null;
  }

  /**
   * Return every job record in enqueue order.
   */
  public List<JobRecord<T>> getAll() {
    // TODO Level 1: return records in insertion order.
    return new ArrayList<>();
  }

  /**
   * Count jobs by current status. The returned EnumMap should include every
   * JobStatus key, even when its count is zero.
   */
  public java.util.EnumMap<JobStatus, Integer> getStats() {
    java.util.EnumMap<JobStatus, Integer> stats = new java.util.EnumMap<>(JobStatus.class);
    for (JobStatus status : JobStatus.values()) {
      stats.put(status, 0);
    }
    return stats;
  }
}
