import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class CoordinatorTest {
  record Row(String name, String status, String error) {}
  static List<Row> rows = new ArrayList<>();
  static int maxLevel = Integer.parseInt(System.getenv().getOrDefault("LEVEL", "999"));

  public static void main(String[] args) throws Exception {
    if (args.length > 0) maxLevel = Integer.parseInt(args[0]);

    // ── Level 1 — atomic token take under contention ──────────────────────────
    test(1, "exactly `capacity` acquires succeed under 20 threads racing one key", () -> {
      Coordinator c = new Coordinator(1_000);
      AtomicInteger ok = new AtomicInteger();
      // 20 threads x 200 attempts = 4000 attempts, only 1000 tokens exist.
      runConcurrent(20, () -> {
        for (int i = 0; i < 200; i++) if (c.tryAcquire("a")) ok.incrementAndGet();
      });
      eq(1_000, ok.get());
      eqBool(false, c.tryAcquire("a")); // bucket is empty
    });

    test(1, "buckets are independent per key", () -> {
      Coordinator c = new Coordinator(3);
      AtomicInteger a = new AtomicInteger(), b = new AtomicInteger();
      runConcurrent(8, () -> {
        for (int i = 0; i < 50; i++) {
          if (c.tryAcquire("a")) a.incrementAndGet();
          if (c.tryAcquire("b")) b.incrementAndGet();
        }
      });
      eq(3, a.get());
      eq(3, b.get());
    });

    // ── Level 2 — deterministic time-based refill ─────────────────────────────
    test(2, "refills `refillTokens` per elapsed interval, capped at capacity", () -> {
      Coordinator c = new Coordinator(5, 5, 100); // cap 5, +5 every 100ms
      for (int i = 0; i < 5; i++) eqBool(true, c.tryAcquireAt("a", 0));
      eqBool(false, c.tryAcquireAt("a", 0));   // drained at t=0
      eqBool(false, c.tryAcquireAt("a", 99));  // not a full interval yet
      eqBool(true, c.tryAcquireAt("a", 100));  // one interval -> +5 available
      // Long gap refills at most `capacity`, not intervals*refill.
      for (int i = 0; i < 5; i++) c.tryAcquireAt("a", 100);
      int got = 0;
      for (int i = 0; i < 20; i++) if (c.tryAcquireAt("a", 10_000)) got++;
      eq(5, got); // capped, not 5 * (10000/100)
    });

    test(2, "concurrent refilled take never over-admits at a fixed clock", () -> {
      Coordinator c = new Coordinator(5, 5, 100);
      for (int i = 0; i < 5; i++) c.tryAcquireAt("a", 0); // drain
      AtomicInteger ok = new AtomicInteger();
      // At t=250 exactly 2 intervals elapsed -> +10 capped to 5 available.
      runConcurrent(16, () -> {
        for (int i = 0; i < 100; i++) if (c.tryAcquireAt("a", 250)) ok.incrementAndGet();
      });
      eq(5, ok.get());
    });

    // ── Level 3 — blocking concurrency slots ──────────────────────────────────
    test(3, "acquireSlot/releaseSlot never let more than the limit run at once", () -> {
      Coordinator c = new Coordinator(1);
      c.setConcurrencyLimit("job", 3);
      AtomicInteger current = new AtomicInteger();
      AtomicInteger observedMax = new AtomicInteger();
      runConcurrent(24, () -> {
        for (int r = 0; r < 40; r++) {
          try {
            c.acquireSlot("job");
            int now = current.incrementAndGet();
            observedMax.accumulateAndGet(now, Math::max);
            if (now > 3) throw new AssertionError("over-admitted: " + now + " in flight");
            Thread.yield();
            current.decrementAndGet();
          } catch (InterruptedException e) {
            throw new RuntimeException(e);
          } finally {
            c.releaseSlot("job");
          }
        }
      });
      eq(0, current.get());            // everything released
      eqBool(true, observedMax.get() <= 3);
      eqBool(true, observedMax.get() >= 2); // the limit was actually exercised
    });

    test(3, "acquireSlot blocks while full and wakes when a slot frees", () -> {
      Coordinator c = new Coordinator(1);
      c.setConcurrencyLimit("job", 1);
      c.acquireSlot("job"); // occupy the only slot from the main thread
      AtomicBoolean entered = new AtomicBoolean(false);
      Thread t = new Thread(() -> {
        try { c.acquireSlot("job"); entered.set(true); } catch (InterruptedException ignored) {}
      });
      t.start();
      sleep(120);
      if (entered.get()) throw new AssertionError("acquireSlot did not block while the slot was taken");
      c.releaseSlot("job"); // hand the slot over
      t.join(2_000);
      if (!entered.get()) throw new AssertionError("waiter never woke after the slot was released");
    });

    // ── Level 4 — timed acquire + consistent read ─────────────────────────────
    test(4, "acquireSlot with timeout returns false when it cannot get in", () -> {
      Coordinator c = new Coordinator(1);
      c.setConcurrencyLimit("job", 1);
      c.acquireSlot("job"); // saturate
      long start = System.currentTimeMillis();
      boolean got = c.acquireSlot("job", 100);
      long waited = System.currentTimeMillis() - start;
      eqBool(false, got);
      if (waited < 80) throw new AssertionError("returned too early (" + waited + "ms); it should wait for the timeout");
    });

    test(4, "acquireSlot with timeout succeeds once a slot frees before the deadline", () -> {
      Coordinator c = new Coordinator(1);
      c.setConcurrencyLimit("job", 1);
      c.acquireSlot("job");
      Thread releaser = new Thread(() -> { sleep(80); c.releaseSlot("job"); });
      releaser.start();
      eqBool(true, c.acquireSlot("job", 2_000));
      releaser.join(2_000);
    });

    test(4, "availableSlots stays consistent: no slot lost or double-counted under churn", () -> {
      Coordinator c = new Coordinator(1);
      c.setConcurrencyLimit("job", 4);
      eq(4, c.availableSlots("job"));
      AtomicInteger overAdmit = new AtomicInteger();
      runConcurrent(16, () -> {
        for (int r = 0; r < 60; r++) {
          try {
            if (c.acquireSlot("job", 2_000)) {
              if (c.availableSlots("job") < 0) overAdmit.incrementAndGet();
              Thread.yield();
              c.releaseSlot("job");
            }
          } catch (InterruptedException e) {
            throw new RuntimeException(e);
          }
        }
      });
      eq(0, overAdmit.get());
      eq(4, c.availableSlots("job")); // fully restored — nothing leaked
    });

    print();
  }

  // --- helpers ---------------------------------------------------------------
  static void runConcurrent(int threads, Runnable work) {
    CountDownLatch ready = new CountDownLatch(threads);
    CountDownLatch go = new CountDownLatch(1);
    List<Thread> pool = new ArrayList<>();
    List<Throwable> failures = Collections.synchronizedList(new ArrayList<>());
    for (int i = 0; i < threads; i++) {
      Thread t = new Thread(() -> {
        ready.countDown();
        try { go.await(); work.run(); }
        catch (Throwable e) { failures.add(e); }
      });
      t.start();
      pool.add(t);
    }
    try {
      ready.await();
      go.countDown();
      for (Thread t : pool) t.join();
    } catch (InterruptedException e) {
      throw new RuntimeException(e);
    }
    if (!failures.isEmpty()) throw new AssertionError("worker threw: " + failures.get(0));
  }

  static void sleep(long ms) {
    try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
  }

  interface Check { void run() throws Exception; }
  static void test(int level, String name, Check fn) {
    if (level > maxLevel) { rows.add(new Row(name, "skip", "")); return; }
    try { fn.run(); rows.add(new Row(name, "pass", "")); }
    catch (Throwable e) { rows.add(new Row(name, "fail", e.getMessage() == null ? e.toString() : e.getMessage())); }
  }
  static void eq(Object expected, Object actual) {
    if (!Objects.equals(expected, actual)) throw new AssertionError("expected " + expected + " but got " + actual);
  }
  static void eqBool(boolean expected, boolean actual) {
    if (expected != actual) throw new AssertionError("expected " + expected + " but got " + actual);
  }
  static String esc(String s) { return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\""); }
  static void print() {
    long passed = rows.stream().filter(r -> r.status.equals("pass")).count();
    long failed = rows.stream().filter(r -> r.status.equals("fail")).count();
    long skipped = rows.stream().filter(r -> r.status.equals("skip")).count();
    String body = rows.stream().map(r -> "{\"name\":\"" + esc(r.name) + "\",\"status\":\"" + r.status + "\",\"error\":\"" + esc(r.error) + "\"}").reduce((a, b) -> a + "," + b).orElse("");
    System.out.println("{\"passed\":" + passed + ",\"failed\":" + failed + ",\"skipped\":" + skipped + ",\"rows\":[" + body + "]}");
  }
}
