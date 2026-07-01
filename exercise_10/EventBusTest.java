import java.util.*;

public class EventBusTest {
  record Row(String name, String status, String error) {}
  static List<Row> rows = new ArrayList<>();
  static int maxLevel = Integer.parseInt(System.getenv().getOrDefault("LEVEL", "999"));

  public static void main(String[] args) {
    if (args.length > 0) maxLevel = Integer.parseInt(args[0]);
    test(1, "registers duplicate handlers and removes one at a time", () -> {
      EventBus bus = new EventBus();
      List<String> calls = new ArrayList<>();
      EventBus.Handler h = values -> { calls.add((String) values[0]); return null; };
      bus.on("greet", h);
      bus.on("greet", h);
      eq(2, bus.listenerCount("greet"));
      eq(2, bus.emit("greet", "alice"));
      eq(List.of("alice", "alice"), calls);
      eq(true, bus.off("greet", h));
      eq(1, bus.listenerCount("greet"));
    });
    test(2, "once handlers fire once", () -> {
      EventBus bus = new EventBus();
      List<String> calls = new ArrayList<>();
      bus.once("ready", values -> { calls.add("once"); return null; });
      eq(1, bus.emit("ready"));
      eq(0, bus.emit("ready"));
      eq(List.of("once"), calls);
    });
    test(3, "priorities and wildcard handlers share ordering", () -> {
      EventBus bus = new EventBus();
      List<String> calls = new ArrayList<>();
      bus.on("user.*", values -> { calls.add("wild"); return null; }, 0);
      bus.on("user.created", values -> { calls.add("exact"); return null; }, 10);
      eq(2, bus.emit("user.created"));
      eq(List.of("exact", "wild"), calls);
      eq(0, bus.emit("user.profile.updated"));
    });
    test(4, "emitCollect captures values and errors", () -> {
      EventBus bus = new EventBus();
      bus.on("x", values -> "ok");
      bus.on("x", values -> { throw new RuntimeException("boom"); });
      List<EventBus.Result> results = bus.emitCollect("x");
      eq(2, results.size());
      eq("ok", results.get(0).value);
      if (results.get(1).error == null) throw new AssertionError("expected error");
      eq(1, bus.getLastErrors("x").size());
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
