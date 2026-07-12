import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class BankTest {
  record Row(String name, String status, String error) {}
  static List<Row> rows = new ArrayList<>();
  static int maxLevel = Integer.parseInt(System.getenv().getOrDefault("LEVEL", "999"));

  public static void main(String[] args) throws Exception {
    if (args.length > 0) maxLevel = Integer.parseInt(args[0]);

    // ── Level 1 — atomic single-account operations ────────────────────────────
    test(1, "deposit is atomic under 8 threads x 10000", () -> {
      Bank bank = new Bank();
      bank.openAccount("a", 0);
      runConcurrent(8, () -> { for (int i = 0; i < 10_000; i++) bank.deposit("a", 1); });
      eq(80_000L, bank.balance("a"));
    });

    test(1, "withdraw never overdraws when threads race on the last units", () -> {
      Bank bank = new Bank();
      bank.openAccount("a", 1_000);
      AtomicInteger succeeded = new AtomicInteger();
      // 20 threads x 200 attempts = 4000 attempts, but only 1000 units exist.
      runConcurrent(20, () -> {
        for (int i = 0; i < 200; i++) if (bank.withdraw("a", 1)) succeeded.incrementAndGet();
      });
      eq(1_000, succeeded.get());
      eq(0L, bank.balance("a"));            // never driven negative
    });

    test(1, "operations on an unknown account throw", () -> {
      Bank bank = new Bank();
      try { bank.deposit("ghost", 1); throw new AssertionError("deposit on unknown id did not throw"); }
      catch (IllegalArgumentException expected) {}
      try { bank.balance("ghost"); throw new AssertionError("balance on unknown id did not throw"); }
      catch (IllegalArgumentException expected) {}
    });

    // ── Level 2 — atomic, deadlock-free transfer ──────────────────────────────
    test(2, "transfer moves funds atomically and refuses when insufficient", () -> {
      Bank bank = new Bank();
      bank.openAccount("a", 100);
      bank.openAccount("b", 0);
      eqBool(true, bank.transfer("a", "b", 30));
      eq(70L, bank.balance("a"));
      eq(30L, bank.balance("b"));
      eqBool(false, bank.transfer("a", "b", 1_000)); // insufficient funds
      eq(70L, bank.balance("a"));            // unchanged after a refused transfer
      eq(30L, bank.balance("b"));
      eq(100L, bank.totalAssets());
    });

    test(2, "bidirectional transfers are deadlock-free and conserve money", () -> {
      Bank bank = new Bank();
      bank.openAccount("a", 1_000_000);
      bank.openAccount("b", 1_000_000);
      long before = bank.totalAssets();
      int threads = 16, iters = 5_000;
      CountDownLatch ready = new CountDownLatch(threads);
      CountDownLatch go = new CountDownLatch(1);
      List<Thread> pool = new ArrayList<>();
      for (int i = 0; i < threads; i++) {
        final boolean forward = (i % 2 == 0); // half A->B, half B->A, at once
        Thread t = new Thread(() -> {
          try {
            ready.countDown();
            go.await();
            for (int k = 0; k < iters; k++) {
              if (forward) bank.transfer("a", "b", 1);
              else         bank.transfer("b", "a", 1);
            }
          } catch (InterruptedException ignored) {}
        });
        t.start();
        pool.add(t);
      }
      ready.await();
      go.countDown();
      for (Thread t : pool) t.join(2_000);
      for (Thread t : pool)
        if (t.isAlive())
          throw new AssertionError("transfer deadlocked: a worker never finished "
            + "(two threads grabbed the two account locks in opposite orders)");
      eq(before, bank.totalAssets());        // money conserved
    });

    // ── Level 3 — keyed guarded wait ──────────────────────────────────────────
    test(3, "awaitBalanceAtLeast blocks until deposits reach the threshold, then wakes", () -> {
      Bank bank = new Bank();
      bank.openAccount("a", 0);
      AtomicBoolean woke = new AtomicBoolean(false);
      Thread waiter = new Thread(() -> {
        try { bank.awaitBalanceAtLeast("a", 100); woke.set(true); } catch (InterruptedException ignored) {}
      });
      waiter.start();
      sleep(120);
      if (woke.get()) throw new AssertionError("awaitBalanceAtLeast returned before the balance reached the threshold");
      bank.deposit("a", 100);
      waiter.join(2_000);
      if (!woke.get()) throw new AssertionError("awaitBalanceAtLeast never woke after the balance reached the threshold");
    });

    test(3, "awaitBalanceAtLeast returns immediately when already satisfied", () -> {
      Bank bank = new Bank();
      bank.openAccount("a", 50);
      AtomicBoolean returned = new AtomicBoolean(false);
      Thread waiter = new Thread(() -> {
        try { bank.awaitBalanceAtLeast("a", 50); returned.set(true); } catch (InterruptedException ignored) {}
      });
      waiter.start();
      waiter.join(1_000);
      if (waiter.isAlive()) throw new AssertionError("awaitBalanceAtLeast blocked even though the balance already met the threshold");
      if (!returned.get()) throw new AssertionError("awaitBalanceAtLeast did not return normally");
    });

    test(3, "a transfer that raises the balance wakes a waiter on that account", () -> {
      Bank bank = new Bank();
      bank.openAccount("a", 100);
      bank.openAccount("b", 0);
      AtomicBoolean woke = new AtomicBoolean(false);
      Thread waiter = new Thread(() -> {
        try { bank.awaitBalanceAtLeast("b", 40); woke.set(true); } catch (InterruptedException ignored) {}
      });
      waiter.start();
      sleep(120);
      if (woke.get()) throw new AssertionError("waiter woke before the balance reached the threshold");
      bank.transfer("a", "b", 40);
      waiter.join(2_000);
      if (!woke.get()) throw new AssertionError("a transfer that raised the balance did not wake the waiter");
    });

    // ── Level 4 — globally consistent snapshot ────────────────────────────────
    test(4, "snapshot reflects every account's balance", () -> {
      Bank bank = new Bank();
      bank.openAccount("a", 10);
      bank.openAccount("b", 20);
      Map<String, Long> snap = bank.snapshot();
      eq(2, snap.size());
      eq(10L, snap.get("a"));
      eq(20L, snap.get("b"));
    });

    test(4, "every snapshot sums to the conserved total while transfers churn", () -> {
      Bank bank = new Bank();
      bank.openAccount("a", 500);
      bank.openAccount("b", 300);
      bank.openAccount("c", 200);
      final long total = bank.totalAssets(); // 1000, conserved forever
      final String[] ids = { "a", "b", "c" };
      AtomicBoolean stop = new AtomicBoolean(false);
      AtomicReference<String> bad = new AtomicReference<>(null);

      List<Thread> movers = new ArrayList<>();
      for (int i = 0; i < 4; i++) {
        Thread t = new Thread(() -> {
          Random r = new Random();
          while (!stop.get()) {
            String from = ids[r.nextInt(ids.length)], to = ids[r.nextInt(ids.length)];
            bank.transfer(from, to, r.nextInt(60));
          }
        });
        t.start();
        movers.add(t);
      }
      // Hammer snapshot() while transfers churn; every snapshot must sum to `total`.
      for (int i = 0; i < 5_000 && bad.get() == null; i++) {
        long sum = 0;
        for (long v : bank.snapshot().values()) sum += v;
        if (sum != total) bad.set("a snapshot summed to " + sum + " but the conserved total is " + total);
      }
      stop.set(true);
      for (Thread t : movers) t.join(2_000);
      if (bad.get() != null) throw new AssertionError(bad.get());
      eq(total, bank.totalAssets());
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
