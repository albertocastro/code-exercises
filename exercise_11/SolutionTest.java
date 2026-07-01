import java.util.*;

public class SolutionTest {
  record Row(String name, String status, String error) {}
  static List<Row> rows = new ArrayList<>();
  static int maxLevel = Integer.parseInt(System.getenv().getOrDefault("LEVEL", "999"));

  public static void main(String[] args) {
    if (args.length > 0) maxLevel = Integer.parseInt(args[0]);
    test(1, "parses complete SSE data events and drops DONE", () -> {
      String raw = "data: {\"a\":1}\n\n" + ": ignored\n" + "data:{\"b\":2}\n\n" + "data: [DONE]\n\n";
      eq(2, Solution.parseSSEEvents(raw).size());
    });
    test(2, "collects streamed message deltas", () -> {
      List<Object> events = List.of(
        Map.of("choices", List.of(Map.of("delta", Map.of("role", "assistant", "content", "hel")))),
        Map.of("choices", List.of(Map.of("delta", Map.of("content", "lo"), "finish_reason", "stop")))
      );
      Solution.CollectedMessage message = Solution.collectMessage(events);
      eq("assistant", message.role);
      eq("hello", message.content);
      eq("stop", message.finishReason);
    });
    test(3, "buffers stream chunks until an event is complete", () -> {
      Solution.StreamParser parser = new Solution.StreamParser();
      eq(0, parser.push("data: {\"a\":").size());
      eq(1, parser.push("1}\n\n").size());
    });
    test(4, "collects tool call argument fragments by index", () -> {
      Map<String, Object> first = Map.of("index", 0, "id", "call_1", "function", Map.of("name", "get_weather", "arguments", ""));
      Map<String, Object> second = Map.of("index", 0, "function", Map.of("arguments", "{\"city\":"));
      Map<String, Object> third = Map.of("index", 0, "function", Map.of("arguments", "\"Paris\"}"));
      List<Object> events = List.of(
        Map.of("choices", List.of(Map.of("delta", Map.of("tool_calls", List.of(first))))),
        Map.of("choices", List.of(Map.of("delta", Map.of("tool_calls", List.of(second))))),
        Map.of("choices", List.of(Map.of("delta", Map.of("tool_calls", List.of(third)))))
      );
      Solution.ToolCall call = Solution.collectToolCalls(events).get(0);
      eq("call_1", call.id);
      eq("get_weather", call.name);
      eq("{\"city\":\"Paris\"}", call.arguments);
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
