import java.util.*;

public class SchedulerTest {
  record Row(String name, String status, String error) {}
  static List<Row> rows = new ArrayList<>();
  static int maxLevel = Integer.parseInt(System.getenv().getOrDefault("LEVEL", "999"));

  public static void main(String[] args) {
    if (args.length > 0) maxLevel = Integer.parseInt(args[0]);
    test(1, "orders tasks after dependencies", () -> {
      Scheduler s = new Scheduler();
      s.addTask("a");
      s.addTask("b");
      eq(true, s.addDependency("b", "a"));
      eq(List.of("a"), s.getDependencies("b"));
      eq(List.of("a", "b"), s.getExecutionOrder());
    });
    test(2, "detects cycles", () -> {
      Scheduler s = new Scheduler();
      s.addTask("a");
      s.addTask("b");
      s.addDependency("a", "b");
      s.addDependency("b", "a");
      eq(true, s.hasCycle());
      eq(null, s.getExecutionOrder());
    });
    test(3, "computes critical path timing", () -> {
      Scheduler s = new Scheduler();
      s.addTask("a"); s.addTask("b"); s.addTask("c");
      s.setDuration("a", 3); s.setDuration("b", 5); s.setDuration("c", 2);
      s.addDependency("c", "a");
      s.addDependency("c", "b");
      eq(5, s.getEarliestStart("c"));
      eq(7, s.getProjectDuration());
      eq(List.of("b", "c"), s.getCriticalPath());
    });
    test(4, "schedules tasks with worker limits", () -> {
      Scheduler s = new Scheduler();
      s.addTask("a"); s.addTask("b");
      s.setDuration("a", 3); s.setDuration("b", 5);
      eq(5, s.getMakespan(2));
      eq(8, s.getMakespan(1));
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
