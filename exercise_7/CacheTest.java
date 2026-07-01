import java.util.*;

public class CacheTest {
  record Row(String name, String status, String error) {}
  static List<Row> rows = new ArrayList<>();
  static int maxLevel = Integer.parseInt(System.getenv().getOrDefault("LEVEL", "999"));

  public static void main(String[] args) {
    if (args.length > 0) maxLevel = Integer.parseInt(args[0]);
    test(1, "evicts least recently used key", () -> {
      Cache c = new Cache(2);
      c.put("a", 1);
      c.put("b", 2);
      c.put("c", 3);
      eq(false, c.has("a"));
      eq(2, c.get("b"));
      eq(2, c.size());
    });
    test(2, "expires entries by ttl", () -> {
      Cache c = new Cache(2);
      c.put("a", 1, 100L, 0L);
      eq(1, c.get("a", 50L));
      eq(null, c.get("a", 100L));
      eq(true, c.isExpired("a", 100L));
    });
    test(3, "evicts by frequency before recency", () -> {
      Cache c = new Cache(2);
      c.put("a", 1);
      c.put("b", 2);
      c.get("a");
      c.put("c", 3);
      eq(true, c.has("a"));
      eq(false, c.has("b"));
      eq(2, c.getFrequency("a"));
    });
    test(4, "tracks hit and miss stats", () -> {
      Cache c = new Cache(2);
      c.put("a", 1);
      c.get("a");
      c.get("z");
      Cache.Stats stats = c.getStats();
      eq(1, stats.hits);
      eq(1, stats.misses);
      eq(0.5, stats.hitRate);
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
