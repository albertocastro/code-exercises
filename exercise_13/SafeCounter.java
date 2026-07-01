// SafeCounter — a small concurrency kata.
//
// Every public method here is called from MANY threads at once. Your job is to
// make each operation correct under contention: no lost updates, no torn reads,
// no going below zero, and a blocking wait that actually wakes up.
//
// The single hardest idea in this file: a plain `value++` is THREE steps
// (read, add, write). Two threads can interleave those steps and lose an update.
// You need to make each read-modify-write happen as one indivisible unit.
//
// Implement the methods below. Delete the `throw new UnsupportedOperationException`
// lines as you go.
public class SafeCounter {
  private long value;

  public SafeCounter() {}

  public SafeCounter(long initial) {
    this.value = initial;
  }

  // Level 1 — atomic increment + a consistent read.
  public void increment() {
    throw new UnsupportedOperationException("increment: not implemented");
  }

  public long get() {
    throw new UnsupportedOperationException("get: not implemented");
  }

  // Level 2 — check-then-act, atomically. Decrement only if currently > 0.
  // Return true if you decremented, false otherwise. Must never go negative,
  // even when 20 threads race on the last unit.
  public boolean decrementIfPositive() {
    throw new UnsupportedOperationException("decrementIfPositive: not implemented");
  }

  // Level 3 — a guarded wait. Block the calling thread until value >= threshold,
  // then return. Waking threads is the other half of blocking: whoever changes
  // the value has to notify the waiters.
  public void awaitAtLeast(long threshold) throws InterruptedException {
    throw new UnsupportedOperationException("awaitAtLeast: not implemented");
  }

  // Level 4 — compound atomic operations that compose with everything above.
  public long addAndGet(long delta) {
    throw new UnsupportedOperationException("addAndGet: not implemented");
  }

  // Atomically read the current value and reset it to 0, returning what was read.
  // If two threads drain concurrently, each unit must be handed out exactly once.
  public long drain() {
    throw new UnsupportedOperationException("drain: not implemented");
  }
}
