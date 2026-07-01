import java.util.*;

public class Solution {
  public static class CollectedMessage {
    public final String role;
    public final String content;
    public final String finishReason;

    public CollectedMessage(String role, String content, String finishReason) {
      this.role = role;
      this.content = content;
      this.finishReason = finishReason;
    }
  }

  public static class ToolCall {
    public final String id;
    public final String name;
    public final String arguments;

    public ToolCall(String id, String name, String arguments) {
      this.id = id;
      this.name = name;
      this.arguments = arguments;
    }
  }

  public static class StreamParser {
    public List<Object> push(String chunk) {
      // TODO Level 3: buffer partial SSE data and emit completed data objects.
      return List.of();
    }
  }

  public static List<Object> parseSSEEvents(String raw) {
    // TODO Level 1: parse JSON objects from SSE data lines, dropping [DONE].
    return List.of();
  }

  public static CollectedMessage collectMessage(List<?> events) {
    // TODO Level 2: accumulate role, content, and finish reason from chunks.
    return new CollectedMessage("assistant", "", null);
  }

  public static List<ToolCall> collectToolCalls(List<?> events) {
    // TODO Level 4: group streamed tool call fragments by index.
    return List.of();
  }
}
