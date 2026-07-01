import java.util.*;

public class SolutionTest {
  record Row(String name, String status, String error) {}
  static List<Row> rows = new ArrayList<>();
  static int maxLevel = Integer.parseInt(System.getenv().getOrDefault("LEVEL", "999"));

  public static void main(String[] args) {
    if (args.length > 0) maxLevel = Integer.parseInt(args[0]);
    test(1, "handles arithmetic precedence", () -> {
      eq(14.0, Solution.evaluate("2 + 3 * 4"));
      eq(5.0, Solution.evaluate("100 / 10 / 2"));
    });
    test(1, "throws for malformed expressions", () -> {
      throwsError(() -> Solution.evaluate("2 +"));
      throwsError(() -> Solution.evaluate("5 / 0"));
    });
    test(2, "supports parentheses, unary operators, and decimals", () -> {
      eq(20.0, Solution.evaluate("(2 + 3) * 4"));
      eq(-3.0, Solution.evaluate("-5 + 2"));
      eq(3.75, Solution.evaluate("1.5 + 2.25"));
    });
    test(3, "looks up variables from context", () -> {
      Map<String, Double> ctx = new HashMap<>();
      ctx.put("x", 4.0);
      ctx.put("y", 2.0);
      eq(6.0, Solution.evaluate("x + y", ctx));
    });
    test(4, "supports functions and assignments", () -> {
      Map<String, Double> ctx = new HashMap<>();
      eq(8.0, Solution.evaluate("pow(2, 3)", ctx));
      eq(15.0, Solution.evaluate("x = 5; y = x * 2; x + y", ctx));
      eq(5.0, ctx.get("x"));
    });
    print();
  }

  static void throwsError(Runnable fn) {
    try { fn.run(); }
    catch (Throwable e) { return; }
    throw new AssertionError("expected error");
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
