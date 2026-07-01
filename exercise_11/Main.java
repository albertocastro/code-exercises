public class Main {
  public static void main(String[] args) {
    String raw = "data: {\"id\":\"chunk-1\"}\n\n" + "data: [DONE]\n\n";
    System.out.println(Solution.parseSSEEvents(raw));
  }
}
