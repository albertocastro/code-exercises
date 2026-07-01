import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

public class WorkQueueTest {
  interface TestFn {
    void run() throws Exception;
  }

  static class Row {
    final String name;
    final String status;
    final String error;
    final int line;

    Row(String name, String status, String error, int line) {
      this.name = name;
      this.status = status;
      this.error = error;
      this.line = line;
    }
  }

  static class Deferred<T> {
    final CompletableFuture<T> promise = new CompletableFuture<>();

    void resolve(T value) {
      promise.complete(value);
    }

    void reject(Throwable error) {
      promise.completeExceptionally(error);
    }
  }

  private static final List<Row> rows = new ArrayList<>();
  private static int maxLevel = Integer.MAX_VALUE;

  public static void main(String[] args) {
    if (args.length > 0) {
      maxLevel = Integer.parseInt(args[0]);
    }

    level1();
    level2();
    level3();
    level4();
    System.out.println(toJson());
  }

  private static void test(int level, String name, int line, TestFn fn) {
    if (level > maxLevel) {
      rows.add(new Row(name, "skip", null, line));
      return;
    }

    try {
      fn.run();
      rows.add(new Row(name, "pass", null, line));
    } catch (Throwable error) {
      rows.add(new Row(name, "fail", error.toString(), line));
    }
  }

  private static void level1() {
    test(1, "enqueue accepts a new job and records it as queued", 81, () -> {
      WorkQueue<String> queue = new WorkQueue<>();

      assertTrue(queue.enqueue("job-1", () -> CompletableFuture.completedFuture("done")));
      JobRecord<String> job = queue.get("job-1");
      assertNotNull(job);
      assertEquals("job-1", job.id);
      assertEquals(JobStatus.QUEUED, job.status);
      assertEquals(0, job.attempts);
    });

    test(1, "enqueue rejects duplicate ids without replacing the original job", 93, () -> {
      WorkQueue<String> queue = new WorkQueue<>();

      assertTrue(queue.enqueue("job-1", () -> CompletableFuture.completedFuture("first")));
      assertFalse(queue.enqueue("job-1", () -> CompletableFuture.completedFuture("second")));

      await(queue.drain());
      assertEquals(JobStatus.SUCCEEDED, queue.get("job-1").status);
      assertEquals("first", queue.get("job-1").result);
    });

    test(1, "drain starts queued jobs and stores successful results", 104, () -> {
      WorkQueue<String> queue = new WorkQueue<>();

      queue.enqueue("job-1", () -> CompletableFuture.completedFuture("alpha"));
      await(queue.drain());

      JobRecord<String> job = queue.get("job-1");
      assertEquals("job-1", job.id);
      assertEquals(JobStatus.SUCCEEDED, job.status);
      assertEquals(1, job.attempts);
      assertEquals("alpha", job.result);
    });

    test(1, "failed jobs store their final error", 117, () -> {
      WorkQueue<String> queue = new WorkQueue<>();
      RuntimeException error = new RuntimeException("boom");

      queue.enqueue("job-1", () -> failedFuture(error));
      await(queue.drain());

      JobRecord<String> job = queue.get("job-1");
      assertEquals("job-1", job.id);
      assertEquals(JobStatus.FAILED, job.status);
      assertEquals(1, job.attempts);
      assertSame(error, job.error);
    });

    test(1, "get returns null for an unknown job", 131, () -> {
      WorkQueue<String> queue = new WorkQueue<>();
      assertNull(queue.get("missing"));
    });

    test(1, "getAll returns records in enqueue order", 136, () -> {
      WorkQueue<String> queue = new WorkQueue<>();

      queue.enqueue("a", () -> CompletableFuture.completedFuture("A"));
      queue.enqueue("b", () -> CompletableFuture.completedFuture("B"));
      await(queue.drain());

      assertEquals(Arrays.asList("a", "b"), ids(queue.getAll()));
    });
  }

  private static void level2() {
    test(2, "start runs no more than maxConcurrency jobs at once", 151, () -> {
      WorkQueue<String> queue = new WorkQueue<>(new WorkQueueOptions().maxConcurrency(2));
      Deferred<String> a = new Deferred<>();
      Deferred<String> b = new Deferred<>();
      Deferred<String> c = new Deferred<>();
      List<String> started = new ArrayList<>();

      queue.enqueue("a", () -> { started.add("a"); return a.promise; });
      queue.enqueue("b", () -> { started.add("b"); return b.promise; });
      queue.enqueue("c", () -> { started.add("c"); return c.promise; });

      queue.start();

      assertEquals(Arrays.asList("a", "b"), started);
      assertEquals(JobStatus.RUNNING, queue.get("a").status);
      assertEquals(JobStatus.RUNNING, queue.get("b").status);
      assertEquals(JobStatus.QUEUED, queue.get("c").status);
    });

    test(2, "starts the next queued job when a running slot opens", 172, () -> {
      WorkQueue<String> queue = new WorkQueue<>(new WorkQueueOptions().maxConcurrency(2));
      Deferred<String> a = new Deferred<>();
      Deferred<String> b = new Deferred<>();
      Deferred<String> c = new Deferred<>();
      List<String> started = new ArrayList<>();

      queue.enqueue("a", () -> { started.add("a"); return a.promise; });
      queue.enqueue("b", () -> { started.add("b"); return b.promise; });
      queue.enqueue("c", () -> { started.add("c"); return c.promise; });
      queue.start();

      b.resolve("B");
      sleep(25);

      assertEquals(Arrays.asList("a", "b", "c"), started);
      assertEquals(JobStatus.SUCCEEDED, queue.get("b").status);
      assertEquals("B", queue.get("b").result);
      assertEquals(JobStatus.RUNNING, queue.get("c").status);

      a.resolve("A");
      c.resolve("C");
      await(queue.drain());
    });

    test(2, "keeps results attached to the correct ids when jobs finish out of order", 201, () -> {
      WorkQueue<String> queue = new WorkQueue<>(new WorkQueueOptions().maxConcurrency(2));
      Deferred<String> slow = new Deferred<>();
      Deferred<String> fast = new Deferred<>();

      queue.enqueue("slow", () -> slow.promise);
      queue.enqueue("fast", () -> fast.promise);
      queue.start();

      fast.resolve("fast-result");
      sleep(25);
      slow.resolve("slow-result");
      await(queue.drain());

      assertEquals(JobStatus.SUCCEEDED, queue.get("slow").status);
      assertEquals("slow-result", queue.get("slow").result);
      assertEquals(JobStatus.SUCCEEDED, queue.get("fast").status);
      assertEquals("fast-result", queue.get("fast").result);
    });

    test(2, "jobs enqueued after start are scheduled when capacity is available", 223, () -> {
      WorkQueue<String> queue = new WorkQueue<>(new WorkQueueOptions().maxConcurrency(1));
      Deferred<String> first = new Deferred<>();
      Deferred<String> second = new Deferred<>();
      List<String> started = new ArrayList<>();

      queue.enqueue("first", () -> { started.add("first"); return first.promise; });
      queue.start();
      queue.enqueue("second", () -> { started.add("second"); return second.promise; });

      assertEquals(Arrays.asList("first"), started);
      assertEquals(JobStatus.QUEUED, queue.get("second").status);

      first.resolve("one");
      sleep(25);

      assertEquals(Arrays.asList("first", "second"), started);
      assertEquals(JobStatus.RUNNING, queue.get("second").status);

      second.resolve("two");
      await(queue.drain());
    });
  }

  private static void level3() {
    test(3, "retries a failed job up to maxRetries and can eventually succeed", 253, () -> {
      WorkQueue<String> queue = new WorkQueue<>(new WorkQueueOptions().maxRetries(2));
      int[] calls = {0};

      queue.enqueue("flaky", () -> {
        calls[0]++;
        if (calls[0] < 2) return failedFuture(new RuntimeException("try again"));
        return CompletableFuture.completedFuture("ok");
      });

      await(queue.drain());

      assertEquals(2, calls[0]);
      assertEquals(JobStatus.SUCCEEDED, queue.get("flaky").status);
      assertEquals(2, queue.get("flaky").attempts);
      assertEquals("ok", queue.get("flaky").result);
    });

    test(3, "fails after the initial attempt plus maxRetries", 274, () -> {
      WorkQueue<String> queue = new WorkQueue<>(new WorkQueueOptions().maxRetries(2));
      RuntimeException finalError = new RuntimeException("still broken");
      int[] calls = {0};

      queue.enqueue("bad", () -> {
        calls[0]++;
        return failedFuture(calls[0] == 3 ? finalError : new RuntimeException("not yet"));
      });

      await(queue.drain());

      assertEquals(3, calls[0]);
      assertEquals(JobStatus.FAILED, queue.get("bad").status);
      assertEquals(3, queue.get("bad").attempts);
      assertSame(finalError, queue.get("bad").error);
    });

    test(3, "does not retry when maxRetries is zero", 294, () -> {
      WorkQueue<String> queue = new WorkQueue<>(new WorkQueueOptions().maxRetries(0));
      int[] calls = {0};

      queue.enqueue("bad", () -> {
        calls[0]++;
        return failedFuture(new RuntimeException("no retry"));
      });

      await(queue.drain());

      assertEquals(1, calls[0]);
      assertEquals(JobStatus.FAILED, queue.get("bad").status);
      assertEquals(1, queue.get("bad").attempts);
    });

    test(3, "getStats counts every job by its current status", 312, () -> {
      WorkQueue<String> queue = new WorkQueue<>(new WorkQueueOptions().maxConcurrency(1));
      Deferred<String> hold = new Deferred<>();

      queue.enqueue("running", () -> hold.promise);
      queue.enqueue("queued", () -> CompletableFuture.completedFuture("later"));
      queue.start();

      EnumMap<JobStatus, Integer> before = queue.getStats();
      assertEquals(1, before.get(JobStatus.QUEUED));
      assertEquals(1, before.get(JobStatus.RUNNING));
      assertEquals(0, before.get(JobStatus.SUCCEEDED));
      assertEquals(0, before.get(JobStatus.FAILED));
      assertEquals(0, before.get(JobStatus.CANCELLED));
      assertEquals(0, before.get(JobStatus.TIMED_OUT));

      hold.resolve("done");
      await(queue.drain());

      EnumMap<JobStatus, Integer> after = queue.getStats();
      assertEquals(0, after.get(JobStatus.QUEUED));
      assertEquals(0, after.get(JobStatus.RUNNING));
      assertEquals(2, after.get(JobStatus.SUCCEEDED));
    });
  }

  private static void level4() {
    test(4, "cancel marks a queued job as cancelled and prevents it from running", 349, () -> {
      WorkQueue<String> queue = new WorkQueue<>();
      int[] calls = {0};

      queue.enqueue("job-1", () -> {
        calls[0]++;
        return CompletableFuture.completedFuture("should not run");
      });

      assertTrue(queue.cancel("job-1"));
      await(queue.drain());

      assertEquals(0, calls[0]);
      assertEquals(JobStatus.CANCELLED, queue.get("job-1").status);
      assertEquals(0, queue.get("job-1").attempts);
    });

    test(4, "cancel returns false for running, terminal, and unknown jobs", 368, () -> {
      WorkQueue<String> queue = new WorkQueue<>();
      Deferred<String> hold = new Deferred<>();

      queue.enqueue("running", () -> hold.promise);
      queue.start();

      assertFalse(queue.cancel("running"));

      hold.resolve("done");
      await(queue.drain());

      assertFalse(queue.cancel("running"));
      assertFalse(queue.cancel("missing"));
    });

    test(4, "times out a running job after timeoutMs", 385, () -> {
      WorkQueue<String> queue = new WorkQueue<>(new WorkQueueOptions().timeoutMs(50));

      queue.enqueue("slow", () -> new CompletableFuture<>());
      queue.start();

      assertEquals(JobStatus.RUNNING, queue.get("slow").status);

      sleep(90);

      assertEquals("slow", queue.get("slow").id);
      assertEquals(JobStatus.TIMED_OUT, queue.get("slow").status);
      assertEquals(1, queue.get("slow").attempts);
      assertNotNull(queue.get("slow").error);
    });

    test(4, "a late resolution after timeout does not overwrite the terminal status", 403, () -> {
      WorkQueue<String> queue = new WorkQueue<>(new WorkQueueOptions().timeoutMs(25));
      Deferred<String> slow = new Deferred<>();

      queue.enqueue("slow", () -> slow.promise);
      queue.start();

      sleep(60);
      slow.resolve("too late");
      sleep(25);

      assertEquals(JobStatus.TIMED_OUT, queue.get("slow").status);
      assertNull(queue.get("slow").result);
    });

    test(4, "drain waits until timeout makes a running job terminal", 420, () -> {
      WorkQueue<String> queue = new WorkQueue<>(new WorkQueueOptions().timeoutMs(10));
      boolean[] drained = {false};

      queue.enqueue("slow", () -> new CompletableFuture<>());
      CompletableFuture<Void> done = queue.drain().thenRun(() -> drained[0] = true);

      sleep(5);
      assertFalse(drained[0]);

      await(done);

      assertTrue(drained[0]);
      assertEquals(JobStatus.TIMED_OUT, queue.get("slow").status);
    });
  }

  private static <T> CompletableFuture<T> failedFuture(Throwable error) {
    CompletableFuture<T> future = new CompletableFuture<>();
    future.completeExceptionally(error);
    return future;
  }

  private static void await(CompletableFuture<?> future) throws Exception {
    future.get(2, TimeUnit.SECONDS);
  }

  private static List<String> ids(List<? extends JobRecord<?>> jobs) {
    List<String> ids = new ArrayList<>();
    for (JobRecord<?> job : jobs) {
      ids.add(job.id);
    }
    return ids;
  }

  private static void sleep(long ms) throws InterruptedException {
    Thread.sleep(ms);
  }

  private static void assertTrue(boolean value) {
    if (!value) throw new AssertionError("Expected true but got false");
  }

  private static void assertFalse(boolean value) {
    if (value) throw new AssertionError("Expected false but got true");
  }

  private static void assertNull(Object value) {
    if (value != null) throw new AssertionError("Expected null but got " + value);
  }

  private static void assertNotNull(Object value) {
    if (value == null) throw new AssertionError("Expected non-null value");
  }

  private static void assertSame(Object expected, Object actual) {
    if (expected != actual) {
      throw new AssertionError("Expected same instance but got " + actual);
    }
  }

  private static void assertEquals(Object expected, Object actual) {
    if (!Objects.equals(expected, actual)) {
      throw new AssertionError("Expected " + expected + " but got " + actual);
    }
  }

  private static String toJson() {
    int passed = 0;
    int failed = 0;
    int skipped = 0;
    StringBuilder builder = new StringBuilder();
    builder.append("{\"rows\":[");
    for (int i = 0; i < rows.size(); i++) {
      Row row = rows.get(i);
      if (i > 0) builder.append(",");
      if ("pass".equals(row.status)) passed++;
      if ("fail".equals(row.status)) failed++;
      if ("skip".equals(row.status)) skipped++;
      builder
        .append("{\"name\":\"").append(escape(row.name))
        .append("\",\"status\":\"").append(row.status)
        .append("\",\"line\":").append(row.line);
      if (row.error != null) {
        builder.append(",\"error\":\"").append(escape(row.error)).append("\"");
      }
      builder.append("}");
    }
    builder
      .append("],\"passed\":").append(passed)
      .append(",\"failed\":").append(failed)
      .append(",\"skipped\":").append(skipped)
      .append("}");
    return builder.toString();
  }

  private static String escape(String value) {
    return value
      .replace("\\", "\\\\")
      .replace("\"", "\\\"")
      .replace("\n", "\\n")
      .replace("\r", "\\r");
  }
}
