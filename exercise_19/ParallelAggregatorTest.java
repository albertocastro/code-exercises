import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.function.*;

public class ParallelAggregatorTest {
  record Row(String name, String status, String error) {}
  static List<Row> rows = new ArrayList<>();
  static int maxLevel = Integer.parseInt(System.getenv().getOrDefault("LEVEL", "999"));

  public static void main(String[] args) throws Exception {
    if (args.length > 0) maxLevel = Integer.parseInt(args[0]);

    // ── Level 1 — partition + per-thread accumulators ──────────────────────
    test(1, "parallelSum matches a sequential oracle across sizes and thread counts", () -> {
      ParallelAggregator agg = new ParallelAggregator();
      int[][] cases = { {0, 4}, {1, 4}, {7, 3}, {1000, 1}, {1000, 6}, {1000, 8} };
      for (int[] c : cases) {
        long[] data = randomArray(c[0] * 31L + c[1], c[0], 1000);
        long expected = sequentialSum(data);
        long got = agg.parallelSum(data, c[1]);
        eq(expected, got);
      }
    });

    test(1, "parallelSum actually spreads work across `threads` distinct threads", () -> {
      ParallelAggregator agg = new ParallelAggregator();
      long[] data = randomArray(7, 100_000, 100);
      agg.parallelSum(data, 8);
      eq(8, agg.usedThreadIds.size());
    });

    // ── Level 2 — generalized reduction ─────────────────────────────────────
    test(2, "parallelReduce matches a sequential fold with a sum operator", () -> {
      ParallelAggregator agg = new ParallelAggregator();
      int[][] cases = { {0, 4}, {5, 3}, {997, 5}, {1000, 8} };
      for (int[] c : cases) {
        long[] data = randomArray(c[0] * 17L + c[1], c[0], 500);
        long expected = sequentialReduce(data, Long::sum, 0L);
        long got = agg.parallelReduce(data, c[1], Long::sum, 0L);
        eq(expected, got);
      }
    });

    test(2, "parallelReduce matches a sequential fold with a max operator", () -> {
      ParallelAggregator agg = new ParallelAggregator();
      int[][] cases = { {0, 4}, {5, 3}, {997, 5}, {1000, 8} };
      for (int[] c : cases) {
        long[] data = randomArray(c[0] * 23L + c[1] + 1, c[0], 500);
        long expected = sequentialReduce(data, Math::max, Long.MIN_VALUE);
        long got = agg.parallelReduce(data, c[1], Math::max, Long.MIN_VALUE);
        eq(expected, got);
      }
    });

    // ── Level 3 — shared accumulator, the lost-update trap ──────────────────
    test(3, "parallelSumShared loses no updates under 8-way contention", () -> {
      ParallelAggregator agg = new ParallelAggregator();
      long[] data = randomArray(99, 2_000_000, 5);
      long expected = sequentialSum(data);
      long got = agg.parallelSumShared(data, 8);
      eq(expected, got);
    });

    // ── Level 4 — cooperative early exit ────────────────────────────────────
    test(4, "parallelAnyMatch finds a single match deep in the array", () -> {
      ParallelAggregator agg = new ParallelAggregator();
      long[] data = new long[200_000];
      Arrays.fill(data, 1L);
      data[199_999] = 42L;
      eqBool(true, agg.parallelAnyMatch(data, 8, x -> x == 42L));
    });

    test(4, "parallelAnyMatch returns false when nothing matches", () -> {
      ParallelAggregator agg = new ParallelAggregator();
      long[] data = new long[200_000];
      Arrays.fill(data, 1L);
      eqBool(false, agg.parallelAnyMatch(data, 8, x -> x == 42L));
    });

    print();
  }

  // --- oracle helpers --------------------------------------------------------
  static long sequentialSum(long[] data) {
    long total = 0;
    for (long x : data) total += x;
    return total;
  }

  static long sequentialReduce(long[] data, LongBinaryOperator op, long identity) {
    long acc = identity;
    for (long x : data) acc = op.applyAsLong(acc, x);
    return acc;
  }

  static long[] randomArray(long seed, int n, long bound) {
    Random r = new Random(seed);
    long[] data = new long[n];
    for (int i = 0; i < n; i++) data[i] = r.nextLong(2 * bound + 1) - bound;
    return data;
  }

  // --- harness -----------------------------------------------------------
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
