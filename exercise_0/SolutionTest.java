import java.util.*;

public class SolutionTest {
  static final List<Row> rows = new ArrayList<>();
  static int maxLevel = Integer.MAX_VALUE;
  interface Fn { void run() throws Exception; }
  record Row(String name, String status, String error, int line) {}
  public static void main(String[] args) {
    if (args.length > 0) maxLevel = Integer.parseInt(args[0]);
    test(1, "empty list returns 0", 10, () -> eq(0, Solution.sumList(new int[] {})));
    test(1, "positive numbers", 11, () -> eq(6, Solution.sumList(new int[] {1, 2, 3})));
    test(1, "mixed numbers", 12, () -> eq(2, Solution.sumList(new int[] {-1, -2, 5})));
    test(1, "1 to 100 sums to 5050", 13, () -> {
      int[] values = new int[100];
      for (int i = 0; i < values.length; i++) values[i] = i + 1;
      eq(5050, Solution.sumList(values));
    });
    test(2, "bounded sum all in range", 18, () -> eq(6, Solution.boundedSum(new int[] {1, 2, 3}, 1, 3)));
    test(2, "bounded sum some in range", 19, () -> eq(9, Solution.boundedSum(new int[] {1, 2, 3, 4, 5}, 2, 4)));
    test(2, "bounded sum none in range", 20, () -> eq(0, Solution.boundedSum(new int[] {1, 2, 3}, 10, 20)));
    test(2, "bounded sum negative range", 21, () -> eq(2, Solution.boundedSum(new int[] {-5, -1, 0, 3}, -1, 3)));
    print();
  }
  static void test(int level, String name, int line, Fn fn) {
    if (level > maxLevel) { rows.add(new Row(name, "skip", null, line)); return; }
    try { fn.run(); rows.add(new Row(name, "pass", null, line)); }
    catch (Throwable e) { rows.add(new Row(name, "fail", e.toString(), line)); }
  }
  static void eq(Object expected, Object actual) {
    if (!Objects.equals(expected, actual)) throw new AssertionError("Expected " + expected + " but got " + actual);
  }
  static void print() {
    long p = rows.stream().filter(r -> r.status.equals("pass")).count();
    long f = rows.stream().filter(r -> r.status.equals("fail")).count();
    long s = rows.stream().filter(r -> r.status.equals("skip")).count();
    StringBuilder out = new StringBuilder("{\"rows\":[");
    for (int i = 0; i < rows.size(); i++) {
      Row r = rows.get(i);
      if (i > 0) out.append(",");
      out.append("{\"name\":\"").append(esc(r.name)).append("\",\"status\":\"").append(r.status).append("\",\"line\":").append(r.line);
      if (r.error != null) out.append(",\"error\":\"").append(esc(r.error)).append("\"");
      out.append("}");
    }
    out.append("],\"passed\":").append(p).append(",\"failed\":").append(f).append(",\"skipped\":").append(s).append("}");
    System.out.println(out);
  }
  static String esc(String s) { return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n"); }
}
