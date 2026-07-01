import java.util.*;

public class RateLimiterTest {
  record Row(String name, String status, String error) {}
  static List<Row> rows = new ArrayList<>();
  static int maxLevel = Integer.parseInt(System.getenv().getOrDefault("LEVEL", "999"));

  public static void main(String[] args) {
    if (args.length > 0) maxLevel = Integer.parseInt(args[0]);
    test(1, "fixed window consumes and resets by epoch-aligned window", () -> {
      RateLimiter r = new RateLimiter();
      eq(true, r.configure("api", 3, 1000));
      eq(false, r.configure("api", 5, 1000));
      eq(true, r.allow("api", 500));
      eq(true, r.allow("api", 600));
      eq(true, r.allow("api", 700));
      eq(false, r.allow("api", 999));
      eq(0, r.getRemaining("api", 999));
      eq(true, r.allow("api", 1000));
      eq(2, r.getRemaining("api", 1000));
    });
    test(2, "reports reset time, usage, and supports resetKey", () -> {
      RateLimiter r = new RateLimiter();
      r.configure("api", 2, 1000);
      eq(1000L, r.getResetTime("api", 250));
      r.allow("api", 0);
      eq(1, r.getUsage("api", 0));
      eq(true, r.resetKey("api"));
      eq(0, r.getUsage("api", 0));
    });
    test(3, "token bucket refills lazily and shares key namespace", () -> {
      RateLimiter r = new RateLimiter();
      eq(true, r.configureBucket("upload", 10, 2));
      eq(false, r.configure("upload", 3, 1000));
      eq(true, r.allowBucket("upload", 0, 4));
      eq(6.0, r.getTokens("upload", 0));
      eq(8.0, r.getTokens("upload", 1000));
    });
    test(4, "tracks cumulative stats", () -> {
      RateLimiter r = new RateLimiter();
      r.configure("api", 2, 1000);
      r.allow("api", 0);
      r.allow("api", 1);
      r.allow("api", 2);
      RateLimiter.Stats stats = r.getStats("api");
      if (stats == null) throw new AssertionError("expected stats");
      eq(2, stats.allowed);
      eq(1, stats.denied);
    });
    print();
  }

  static void test(int level, String name, Runnable fn) {
    if (level > maxLevel) { rows.add(new Row(name, "skip", "")); return; }
    try { fn.run(); rows.add(new Row(name, "pass", "")); }
    catch (Throwable e) { rows.add(new Row(name, "fail", e.getMessage())); }
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
