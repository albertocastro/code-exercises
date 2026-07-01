import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class SafeCounterTest {
  record Row(String name, String status, String error) {}
  static List<Row> rows = new ArrayList<>();
  static int maxLevel = Integer.parseInt(System.getenv().getOrDefault("LEVEL", "999"));

  public static void main(String[] args) throws Exception {
    if (args.length > 0) maxLevel = Integer.parseInt(args[0]);

    test(1, "increment is atomic under 8 threads x 10000", () -> {
      SafeCounter c = new SafeCounter();
      runConcurrent(8, () -> { for (int i = 0; i < 10_000; i++) c.increment(); });
      eq(80_000L, c.get());
    });

    test(2, "decrementIfPositive never goes below zero under contention", () -> {
      SafeCounter c = new SafeCounter(1_000);
      AtomicInteger succeeded = new AtomicInteger();
      // 20 threads, 200 attempts each = 4000 attempts, but only 1000 can succeed.
      runConcurrent(20, () -> {
        for (int i = 0; i < 200; i++) {
          if (c.decrementIfPositive()) succeeded.incrementAndGet();
        }
      });
      eq(1_000, succeeded.get());
      eq(0L, c.get());
    });

    test(3, "awaitAtLeast blocks until the threshold is reached, then wakes", () -> {
      SafeCounter c = new SafeCounter();
      AtomicBoolean woke = new AtomicBoolean(false);
      Thread waiter = new Thread(() -> {
        try { c.awaitAtLeast(3); woke.set(true); } catch (InterruptedException ignored) {}
      });
      waiter.start();
      sleep(120);
      if (woke.get()) throw new AssertionError("awaitAtLeast returned before threshold was reached");
      for (int i = 0; i < 3; i++) c.increment();
      waiter.join(2_000);
      if (!woke.get()) throw new AssertionError("awaitAtLeast never woke after threshold was reached");
    });

    test(3, "awaitAtLeast returns immediately when already satisfied", () -> {
      SafeCounter c = new SafeCounter(5);
      AtomicBoolean returned = new AtomicBoolean(false);
      Thread waiter = new Thread(() -> {
        try { c.awaitAtLeast(5); returned.set(true); } catch (InterruptedException ignored) {}
      });
      waiter.start();
      waiter.join(1_000);
      if (waiter.isAlive()) throw new AssertionError("awaitAtLeast blocked even though value >= threshold");
      if (!returned.get()) throw new AssertionError("awaitAtLeast did not return normally");
    });

    test(4, "addAndGet loses no updates across 10 threads", () -> {
      SafeCounter c = new SafeCounter();
      runConcurrent(10, () -> { for (int i = 0; i < 10_000; i++) c.addAndGet(3); });
      eq(300_000L, c.get());
    });

    test(4, "concurrent drain hands out every unit exactly once", () -> {
      SafeCounter c = new SafeCounter();
      int producers = 6, perProducer = 5_000; // total added = 30000
      long expected = (long) producers * perProducer;
      AtomicLong collected = new AtomicLong();
      AtomicBoolean stop = new AtomicBoolean(false);

      List<Thread> drainers = new ArrayList<>();
      for (int d = 0; d < 3; d++) {
        Thread t = new Thread(() -> {
          while (!stop.get() || c.get() > 0) collected.addAndGet(c.drain());
        });
        t.start();
        drainers.add(t);
      }
      runConcurrent(producers, () -> { for (int i = 0; i < perProducer; i++) c.increment(); });
      stop.set(true);
      for (Thread t : drainers) t.join(2_000);
      eq(expected, collected.get());
      eq(0L, c.get());
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
      go.countDown(); // release everyone at once to maximise contention
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
  static String esc(String s) { return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\""); }
  static void print() {
    long passed = rows.stream().filter(r -> r.status.equals("pass")).count();
    long failed = rows.stream().filter(r -> r.status.equals("fail")).count();
    long skipped = rows.stream().filter(r -> r.status.equals("skip")).count();
    String body = rows.stream().map(r -> "{\"name\":\"" + esc(r.name) + "\",\"status\":\"" + r.status + "\",\"error\":\"" + esc(r.error) + "\"}").reduce((a, b) -> a + "," + b).orElse("");
    System.out.println("{\"passed\":" + passed + ",\"failed\":" + failed + ",\"skipped\":" + skipped + ",\"rows\":[" + body + "]}");
  }
}
